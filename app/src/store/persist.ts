import { useStore } from './useStore';
import {
  accountsRepo, categoriesRepo, profilesRepo, peopleRepo, debtsRepo, billsRepo,
  subscriptionsRepo, recurringTransactionsRepo, goalsRepo, budgetsRepo, budgetOverridesRepo, shoppingListsRepo,
  shoppingTemplatesRepo, notesRepo, transactionsRepo, settingsRepo, readLegacyAccountBalances,
} from '../db/repo';
import {
  seedAccounts, seedCategories, seedProfiles, seedPeople, seedDebts, buildSeedBills,
  buildSeedSubscriptions, buildSeedRecurring, seedGoals, seedBudgets, seedShoppingLists, seedShoppingTemplates,
  seedNotes, buildSeedTransactions, seedWidgets,
} from './seed';
import { txSign } from './helpers';
import { todayStr, fromDateStr, toDateStr } from './now';
import type { AppState, Account, Transaction } from './types';

type PersistedSlice = keyof Pick<AppState,
  | 'accounts' | 'categories' | 'profiles' | 'people' | 'debts' | 'bills' | 'subscriptions'
  | 'recurringTransactions' | 'goals' | 'budgets' | 'budgetOverrides' | 'shoppingLists' | 'shoppingTemplates'
  | 'notesList' | 'transactions'
>;

const SETTINGS_KEYS = ['currency', 'pinLockOn', 'biometricOn', 'notifOn', 'weeklyEmailOn', 'lastWeeklySummaryAt', 'autoBackupOption', 'lastExportAt', 'lastAutoBackupAt', 'ledgerBalancesMigrated', 'welcomeTourSeen', 'widgets', 'budgetAlertsSent'] as const;

/** One-time backfill for an install that predates ledger-derived balances
 * (PLAN.md's "Part D"): for each account, reads its old raw `balance`
 * column (see `readLegacyAccountBalances`) and — if that value isn't
 * already fully accounted for by transactions already in the ledger —
 * inserts one `opening_balance` transaction sized so the newly-derived
 * total exactly matches what the user already saw before this migration
 * ran. Runs once, gated by the `ledgerBalancesMigrated` setting. */
async function migrateLedgerBalances(accounts: Account[], transactions: Transaction[]): Promise<Transaction[]> {
  const legacyBalances = await readLegacyAccountBalances();
  const additions: Transaction[] = [];
  const date = earliestDateMinusOne(transactions);
  for (const a of accounts) {
    const oldBalance = legacyBalances[a.id] ?? 0;
    const alreadyInLedger = transactions
      .filter((t) => t.accountId === a.id)
      .reduce((sum, t) => sum + txSign(t) * t.amount, 0);
    const openingAmount = oldBalance - alreadyInLedger;
    if (openingAmount !== 0) {
      additions.push({
        id: 'tx' + Date.now() + Math.random().toString(36).slice(2, 6),
        title: 'Opening balance', catId: '', accountId: a.id, type: 'opening_balance',
        amount: openingAmount, date, tags: [], profileId: 'me',
      });
    }
  }
  return additions.length ? transactions.concat(additions) : transactions;
}

/** The day before the earliest existing transaction (or today, if there are
 * none) — so a backfilled `opening_balance` always sorts before every real
 * transaction instead of landing on an arbitrary "today". */
function earliestDateMinusOne(transactions: Transaction[]): string {
  if (!transactions.length) return todayStr();
  const earliest = transactions.reduce((min, t) => (t.date < min ? t.date : min), transactions[0].date);
  const d = fromDateStr(earliest);
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
}

let hydrated = false;
let unsubscribe: (() => void) | null = null;

/** Loads persisted data into the store on boot, seeding the database with the
 * sample dataset on a genuinely first run so the out-of-box experience is
 * unchanged. Must be awaited before rendering past the splash screen.
 * Resolves whether this was a first run — App.tsx uses that to skip the
 * recurrence sync on the same boot as a fresh seed (see
 * `recurrenceSync.ts`'s `initRecurrenceSync`). */
export async function hydrateStore(): Promise<boolean> {
  const [
    accounts, categories, profiles, people, debts, bills, subscriptions, recurringTransactions,
    goals, budgets, budgetOverrides, shoppingLists, shoppingTemplates, notesList,
    transactions, settings,
  ] = await Promise.all([
    accountsRepo.getAll(), categoriesRepo.getAll(), profilesRepo.getAll(), peopleRepo.getAll(),
    debtsRepo.getAll(), billsRepo.getAll(), subscriptionsRepo.getAll(), recurringTransactionsRepo.getAll(),
    goalsRepo.getAll(), budgetsRepo.getAll(), budgetOverridesRepo.getAll(), shoppingListsRepo.getAll(),
    shoppingTemplatesRepo.getAll(), notesRepo.getAll(), transactionsRepo.getAll(), settingsRepo.get(),
  ]);

  const isFirstRun = accounts.length === 0 && categories.length === 0 && transactions.length === 0;

  if (isFirstRun) {
    useStore.setState({
      accounts: seedAccounts, categories: seedCategories, profiles: seedProfiles, people: seedPeople,
      debts: seedDebts, bills: buildSeedBills(), subscriptions: buildSeedSubscriptions(), recurringTransactions: buildSeedRecurring(),
      goals: seedGoals, budgets: seedBudgets, budgetOverrides: {}, shoppingLists: seedShoppingLists,
      shoppingTemplates: seedShoppingTemplates, notesList: seedNotes, transactions: buildSeedTransactions(),
      widgets: seedWidgets, ledgerBalancesMigrated: true,
    });
    await persistAll(useStore.getState());
  } else {
    const alreadyMigrated = !!(settings as (Partial<AppState> | null))?.ledgerBalancesMigrated;
    const finalTransactions = alreadyMigrated ? transactions : await migrateLedgerBalances(accounts, transactions);
    useStore.setState({
      accounts, categories, profiles, people, debts, bills, subscriptions, recurringTransactions, goals, budgets,
      budgetOverrides, shoppingLists, shoppingTemplates, notesList: notesList, transactions: finalTransactions,
      ...(settings ?? {}),
      ledgerBalancesMigrated: true,
    });
    if (finalTransactions !== transactions) {
      await transactionsRepo.replaceAll(finalTransactions);
      await settingsRepo.set(pickSettings(useStore.getState()));
    }
  }

  hydrated = true;
  startAutoPersist();
  return isFirstRun;
}

/** Only used for the first-run seed and for tests; ordinary changes flow
 * through the auto-persist subscription below. */
async function persistAll(state: AppState): Promise<void> {
  await Promise.all([
    accountsRepo.replaceAll(state.accounts),
    categoriesRepo.replaceAll(state.categories),
    profilesRepo.replaceAll(state.profiles),
    peopleRepo.replaceAll(state.people),
    debtsRepo.replaceAll(state.debts),
    billsRepo.replaceAll(state.bills),
    subscriptionsRepo.replaceAll(state.subscriptions),
    recurringTransactionsRepo.replaceAll(state.recurringTransactions),
    goalsRepo.replaceAll(state.goals),
    budgetsRepo.replaceAll(state.budgets),
    budgetOverridesRepo.replaceAll(state.budgetOverrides),
    shoppingListsRepo.replaceAll(state.shoppingLists),
    shoppingTemplatesRepo.replaceAll(state.shoppingTemplates),
    notesRepo.replaceAll(state.notesList),
    transactionsRepo.replaceAll(state.transactions),
    settingsRepo.set(pickSettings(state)),
  ]);
}

function pickSettings(state: AppState) {
  return {
    currency: state.currency,
    pinLockOn: state.pinLockOn,
    biometricOn: state.biometricOn,
    notifOn: state.notifOn,
    weeklyEmailOn: state.weeklyEmailOn,
    lastWeeklySummaryAt: state.lastWeeklySummaryAt,
    autoBackupOption: state.autoBackupOption,
    lastExportAt: state.lastExportAt,
    lastAutoBackupAt: state.lastAutoBackupAt,
    ledgerBalancesMigrated: state.ledgerBalancesMigrated,
    welcomeTourSeen: state.welcomeTourSeen,
    widgets: state.widgets,
    budgetAlertsSent: state.budgetAlertsSent,
  };
}

const SLICE_REPOS: Record<PersistedSlice, { replaceAll: (v: any) => Promise<void> }> = {
  accounts: accountsRepo, categories: categoriesRepo, profiles: profilesRepo, people: peopleRepo,
  debts: debtsRepo, bills: billsRepo, subscriptions: subscriptionsRepo,
  recurringTransactions: recurringTransactionsRepo, goals: goalsRepo,
  budgets: budgetsRepo, budgetOverrides: budgetOverridesRepo, shoppingLists: shoppingListsRepo,
  shoppingTemplates: shoppingTemplatesRepo, notesList: notesRepo, transactions: transactionsRepo,
};

/** Watches the store and writes through to SQLite whenever a persisted slice
 * changes reference — i.e. whenever any action mutates it. This is deliberately
 * derived from state shape rather than hand-added to each of the ~50 store
 * actions, so a new action can never "forget" to persist its effect. */
function startAutoPersist() {
  unsubscribe?.();
  unsubscribe = useStore.subscribe((state, prev) => {
    if (!hydrated) return;
    for (const key of Object.keys(SLICE_REPOS) as PersistedSlice[]) {
      if (state[key] !== prev[key]) SLICE_REPOS[key].replaceAll(state[key] as any);
    }
    if (SETTINGS_KEYS.some((k) => state[k] !== prev[k])) {
      settingsRepo.set(pickSettings(state));
    }
  });
}
