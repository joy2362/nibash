import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

import { useStore } from '../store/useStore';
import type { AppState } from '../store/types';
import { catById, accById, monthTx, monthTotals, monthLabel, fmtAbs } from '../store/helpers';
import { verifyRecoveryKeyMatch } from '../security/pin';
import {
  accountsRepo, categoriesRepo, profilesRepo, peopleRepo, debtsRepo, billsRepo,
  subscriptionsRepo, recurringTransactionsRepo, goalsRepo, budgetsRepo, budgetOverridesRepo, shoppingListsRepo,
  shoppingTemplatesRepo, notesRepo, transactionsRepo, settingsRepo,
} from '../db/repo';
import { readReceiptBase64, writeReceiptBase64, pruneReceipts } from './attachments';

// ─────────────────────────────────────────────────────────────────────────────
// PRD §30 / §42. The `.backup` archive is a single self-contained JSON file
// (optionally AES-encrypted), not a zip of the raw sqlite file. Same intent —
// "full-fidelity, restorable" — but far simpler on managed Expo: no zip native
// module, and restore is a clean per-table `replaceAll` rather than swapping a
// file out from under an open DB connection. Deviation noted in PLAN.md.
//
// CSV / JSON / PDF exports are plain, unencrypted, one-way dumps for the user's
// own analysis — deliberately separate from `.backup`.
// ─────────────────────────────────────────────────────────────────────────────

const BACKUP_VERSION = 1;

const TABLE_KEYS = [
  'accounts', 'categories', 'profiles', 'people', 'debts', 'bills', 'subscriptions', 'recurringTransactions',
  'goals', 'budgets', 'shoppingLists', 'shoppingTemplates', 'notesList', 'transactions',
] as const;

interface BackupPayload {
  app: 'nibash';
  version: number;
  exportedAt: string;
  tables: Record<string, any[]>;
  budgetOverrides: Record<string, number>;
  settings: Record<string, any>;
  attachments: Record<string, string>; // txId -> base64
}

type BackupFile =
  | ({ encrypted: false } & BackupPayload)
  | { app: 'nibash'; version: number; encrypted: true; cipher: string };

function pickPersistedSettings(s: AppState) {
  return {
    currency: s.currency, pinLockOn: s.pinLockOn, biometricOn: s.biometricOn,
    notifOn: s.notifOn, weeklyEmailOn: s.weeklyEmailOn, autoBackupOption: s.autoBackupOption,
    lastExportAt: s.lastExportAt, widgets: s.widgets, budgetAlertsSent: s.budgetAlertsSent,
  };
}

async function buildPayload(s: AppState): Promise<BackupPayload> {
  const tables: Record<string, any[]> = {};
  for (const k of TABLE_KEYS) tables[k] = s[k] as any[];

  const attachments: Record<string, string> = {};
  for (const t of s.transactions) {
    if (!t.receiptUri) continue;
    const b64 = await readReceiptBase64(t.receiptUri);
    if (b64) attachments[t.id] = b64;
  }

  return {
    app: 'nibash',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    budgetOverrides: s.budgetOverrides,
    settings: pickPersistedSettings(s),
    attachments,
  };
}

async function writeAndShare(filename: string, contents: string, mimeType: string, dialogTitle: string) {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.write(contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle, UTI: mimeType === 'application/json' ? 'public.json' : undefined });
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────── export ───────────────────────────

export async function exportBackup(): Promise<void> {
  const s = useStore.getState();
  const payload = await buildPayload(s);

  let fileObj: BackupFile;
  if (s.backupEncrypt) {
    const pass = s.useRecoveryKey ? s.backupPassword.trim() : s.backupPassword;
    if (!pass) throw new Error('Enter a password to encrypt this backup.');
    if (!s.useRecoveryKey && pass !== s.backupPasswordConfirm) throw new Error('Passwords don’t match.');
    if (s.useRecoveryKey && !(await verifyRecoveryKeyMatch(pass))) {
      throw new Error('That doesn’t match your Recovery Key.');
    }
    const cipher = AES.encrypt(JSON.stringify(payload), pass).toString();
    fileObj = { app: 'nibash', version: BACKUP_VERSION, encrypted: true, cipher };
  } else {
    fileObj = { encrypted: false, ...payload };
  }

  await writeAndShare(
    `nibash-${stamp()}.nibash.json`,
    JSON.stringify(fileObj),
    'application/json',
    'Save your Nibash backup',
  );
  useStore.setState({ lastExportAt: Date.now(), backupPassword: '', backupPasswordConfirm: '' });
}

// ───────────────────── automatic on-device backup ─────────────────────
// PRD §30's "Automatic on-device backup" option — distinct from the manual
// share-sheet export above: it writes straight to local storage, no share
// sheet, no password prompt (always unencrypted — there's no one to ask for
// a passphrase during a silent write). Nibash has no real OS background
// task (no BackgroundFetch/TaskManager wired up, and adding one is a much
// bigger undertaking for what this app needs), so "automatic" means "due
// for one the next time the app is opened," checked once at boot.

const AUTO_BACKUP_DIR = new Directory(Paths.document, 'auto-backups');
const MAX_AUTO_BACKUPS = 3;
const AUTO_BACKUP_INTERVAL_MS: Partial<Record<AppState['autoBackupOption'], number>> = {
  Daily: 24 * 60 * 60 * 1000,
  Weekly: 7 * 24 * 60 * 60 * 1000,
};

/** Writes an unencrypted `.backup` snapshot to `<documentDir>/auto-backups/`
 * and prunes down to the `MAX_AUTO_BACKUPS` most recent. Exported mainly for
 * `maybeRunAutoBackup` below; also callable directly (e.g. a future "back up
 * now" debug action) since it's a plain write with no UI side effects. */
export async function writeAutoBackup(): Promise<void> {
  const s = useStore.getState();
  const payload = await buildPayload(s);
  if (!AUTO_BACKUP_DIR.exists) AUTO_BACKUP_DIR.create({ intermediates: true });
  const file = new File(AUTO_BACKUP_DIR, `auto-${Date.now()}.nibash.json`);
  file.write(JSON.stringify({ encrypted: false, ...payload }));

  const files = AUTO_BACKUP_DIR.list().filter((e): e is File => e instanceof File);
  files.sort((a, b) => a.name.localeCompare(b.name));
  while (files.length > MAX_AUTO_BACKUPS) files.shift()?.delete();

  useStore.setState({ lastAutoBackupAt: Date.now() });
}

/** Call once at boot (see App.tsx, after hydration). No-ops when the option
 * is 'Off' or the interval hasn't elapsed since `lastAutoBackupAt`; swallows
 * write failures rather than surfacing them, since this runs silently with
 * no UI to report to and shouldn't block app startup. */
export async function maybeRunAutoBackup(): Promise<void> {
  const s = useStore.getState();
  const interval = AUTO_BACKUP_INTERVAL_MS[s.autoBackupOption];
  if (!interval || Date.now() - s.lastAutoBackupAt < interval) return;
  try {
    await writeAutoBackup();
  } catch {
    // best-effort — see doc comment above
  }
}

export async function exportJson(): Promise<void> {
  const s = useStore.getState();
  const payload = await buildPayload(s);
  await writeAndShare(
    `nibash-data-${stamp()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
    'Export data as JSON',
  );
  useStore.setState({ lastExportAt: Date.now() });
}

export async function exportCsv(): Promise<void> {
  const s = useStore.getState();
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [['Date', 'Type', 'Title', 'Category', 'Account', 'Profile', 'Tags', 'Amount'].join(',')];
  for (const t of [...s.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([
      t.date,
      t.type,
      esc(t.title),
      esc(catById(s, t.catId).name),
      esc(accById(s, t.accountId).name),
      esc(s.profiles.find((p) => p.id === t.profileId)?.name ?? ''),
      esc(t.tags.join(' ')),
      String(t.type === 'income' ? t.amount : -t.amount),
    ].join(','));
  }
  await writeAndShare(`nibash-transactions-${stamp()}.csv`, rows.join('\n'), 'text/csv', 'Export transactions as CSV');
  useStore.setState({ lastExportAt: Date.now() });
}

export async function exportPdf(): Promise<void> {
  const s = useStore.getState();
  const off = s.monthOffset;
  const totals = monthTotals(s, off);
  const tx = monthTx(s, off).filter((t) => t.type === 'expense');
  const byCat: Record<string, number> = {};
  tx.forEach((t) => { byCat[t.catId] = (byCat[t.catId] || 0) + t.amount; });
  const legend = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    .map(([id, amt]) => `<tr><td>${catById(s, id).name}</td><td style="text-align:right">${s.currency}${fmtAbs(amt)}</td></tr>`)
    .join('');

  const html = `
    <html><head><meta name="viewport" content="width=device-width"/>
    <style>
      body { font-family: -apple-system, Roboto, sans-serif; padding: 32px; color: #1a1a1a; }
      h1 { font-size: 20px; margin: 0 0 4px; } .sub { color: #666; margin-bottom: 24px; }
      .row { display:flex; justify-content:space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      td { padding: 6px 0; border-bottom: 1px solid #eee; }
      .big { font-size: 22px; font-weight: 600; }
    </style></head><body>
      <h1>Nibash — ${monthLabel(off)}</h1>
      <div class="sub">Report generated ${new Date().toLocaleDateString()}</div>
      <div class="row"><span>Income</span><span class="big">${s.currency}${fmtAbs(totals.income)}</span></div>
      <div class="row"><span>Expense</span><span class="big">${s.currency}${fmtAbs(totals.expense)}</span></div>
      <div class="row"><span>Saved</span><span class="big">${s.currency}${fmtAbs(totals.income - totals.expense)}</span></div>
      <h3 style="margin-top:28px">Expense by category</h3>
      <table>${legend || '<tr><td>No expenses this month.</td></tr>'}</table>
    </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export report as PDF' });
  useStore.setState({ lastExportAt: Date.now() });
}

// ─────────────────────────── restore ───────────────────────────

/** Opens the file picker and returns the raw file text + whether it's
 * encrypted, or null if the user cancelled. Throws if the file isn't a
 * recognisable Nibash backup. */
export async function pickBackupFile(): Promise<{ raw: string; encrypted: boolean } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const raw = await new File(res.assets[0].uri).text();
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { throw new Error('That file isn’t a valid Nibash backup.'); }
  if (parsed?.app !== 'nibash') throw new Error('That file isn’t a Nibash backup.');
  return { raw, encrypted: !!parsed.encrypted };
}

/** Replaces ALL current data with the backup's contents. `password` is required
 * when the backup is encrypted. Throws on a wrong password / malformed file. */
export async function restoreBackup(raw: string, password?: string): Promise<void> {
  const outer = JSON.parse(raw);
  let payload: BackupPayload;

  if (outer.encrypted) {
    if (!password) throw new Error('This backup is encrypted — enter its password.');
    let decrypted = '';
    try { decrypted = AES.decrypt(outer.cipher, password).toString(Utf8); } catch { /* fallthrough */ }
    if (!decrypted) throw new Error('Wrong password for this backup.');
    try { payload = JSON.parse(decrypted); } catch { throw new Error('Wrong password for this backup.'); }
  } else {
    payload = outer as BackupPayload;
  }

  if (payload?.app !== 'nibash' || !payload.tables) throw new Error('That backup is missing data.');

  const t = payload.tables;
  // Write every table, then the misc stores. `replaceAll` = delete-all + insert.
  await Promise.all([
    accountsRepo.replaceAll(t.accounts ?? []),
    categoriesRepo.replaceAll(t.categories ?? []),
    profilesRepo.replaceAll(t.profiles ?? []),
    peopleRepo.replaceAll(t.people ?? []),
    debtsRepo.replaceAll(t.debts ?? []),
    billsRepo.replaceAll(t.bills ?? []),
    subscriptionsRepo.replaceAll(t.subscriptions ?? []),
    recurringTransactionsRepo.replaceAll(t.recurringTransactions ?? []),
    goalsRepo.replaceAll(t.goals ?? []),
    budgetsRepo.replaceAll(t.budgets ?? []),
    shoppingListsRepo.replaceAll(t.shoppingLists ?? []),
    shoppingTemplatesRepo.replaceAll(t.shoppingTemplates ?? []),
    notesRepo.replaceAll(t.notesList ?? []),
    budgetOverridesRepo.replaceAll(payload.budgetOverrides ?? {}),
  ]);

  // Rewrite receipt files and repoint each transaction at its restored copy.
  const restoredTx = (t.transactions ?? []).map((tx: any) => {
    const b64 = payload.attachments?.[tx.id];
    if (b64) return { ...tx, receiptUri: writeReceiptBase64(tx.id, b64) };
    const { receiptUri, ...rest } = tx;
    return rest;
  });
  await transactionsRepo.replaceAll(restoredTx);
  pruneReceipts(new Set(restoredTx.map((x: any) => x.receiptUri).filter(Boolean)));

  const mergedSettings = { ...settingsFallback(), ...(payload.settings ?? {}) };
  await settingsRepo.set(mergedSettings as any);

  // Push everything into the live store so the UI updates without a reload.
  useStore.setState({
    accounts: t.accounts ?? [], categories: t.categories ?? [], profiles: t.profiles ?? [],
    people: t.people ?? [], debts: t.debts ?? [], bills: t.bills ?? [], subscriptions: t.subscriptions ?? [],
    recurringTransactions: t.recurringTransactions ?? [],
    goals: t.goals ?? [], budgets: t.budgets ?? [], shoppingLists: t.shoppingLists ?? [],
    shoppingTemplates: t.shoppingTemplates ?? [], notesList: t.notesList ?? [], transactions: restoredTx,
    budgetOverrides: payload.budgetOverrides ?? {},
    ...mergedSettings,
  });
}

function settingsFallback() {
  const s = useStore.getState();
  return pickPersistedSettings(s);
}
