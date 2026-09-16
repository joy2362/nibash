import { db, migrate, enqueue } from './client';
import type {
  Account, Category, Profile, Person, Debt, Bill, Subscription, RecurringTransaction, Goal, Budget,
  ShoppingList, ShoppingTemplate, Note, Transaction, Widgets,
} from '../store/types';

interface TableConfig {
  table: string;
  columns: string[];
  jsonColumns?: string[];
  boolColumns?: string[];
}

function toRow(cfg: TableConfig, item: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  for (const col of cfg.columns) {
    const v = item[col];
    if (cfg.jsonColumns?.includes(col)) row[col] = JSON.stringify(v ?? null);
    else if (cfg.boolColumns?.includes(col)) row[col] = v ? 1 : 0;
    else row[col] = v === undefined ? null : v;
  }
  return row;
}

function fromRow<T>(cfg: TableConfig, row: Record<string, any>): T {
  const item: Record<string, any> = {};
  for (const col of cfg.columns) {
    let v = row[col];
    if (v === null) { item[col] = undefined; continue; }
    if (cfg.jsonColumns?.includes(col)) v = JSON.parse(v);
    else if (cfg.boolColumns?.includes(col)) v = !!v;
    item[col] = v;
  }
  return item as T;
}

/** A generic repo for "one row per entity, keyed by id" tables — covers every
 * collection in the app. Nested arrays/objects (e.g. a Debt's payments, a
 * ShoppingList's items) are stored JSON-encoded in a single column rather than
 * normalized into child tables — simplest correct option at this app's scale
 * (dozens/hundreds of rows, not a reporting warehouse), and it mirrors the
 * shape these entities already have in memory. */
function makeRepo<T extends { id: string }>(cfg: TableConfig) {
  return {
    async getAll(): Promise<T[]> {
      await migrate();
      return enqueue(async () => {
        const rows = await db.getAllAsync<Record<string, any>>(`SELECT * FROM ${cfg.table}`);
        return rows.map((r) => fromRow<T>(cfg, r));
      });
    },
    async replaceAll(items: T[]): Promise<void> {
      await migrate();
      await enqueue(() => db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM ${cfg.table}`);
        for (const item of items) {
          const row = toRow(cfg, item as unknown as Record<string, any>);
          const cols = cfg.columns;
          const placeholders = cols.map(() => '?').join(',');
          await db.runAsync(
            `INSERT INTO ${cfg.table} (${cols.join(',')}) VALUES (${placeholders})`,
            cols.map((c) => row[c]),
          );
        }
      }));
    },
  };
}

export const accountsRepo = makeRepo<Account>({
  table: 'accounts', columns: ['id', 'name', 'type', 'includeInTotal', 'creditLimit'],
  boolColumns: ['includeInTotal'],
});

/** One-time read of the `balance` column — still in the `accounts` table
 * (this repo's additive-only migrations never drop columns, see
 * `db/client.ts`) but no longer part of `Account` or `accountsRepo`'s
 * columns, since balance is now derived (see `helpers.ts`'s
 * `accountBalances`). An existing install's raw rows still hold the old
 * value; `persist.ts`'s one-time ledger-balance migration needs it exactly
 * once, to compute each account's backfilled `opening_balance` transaction,
 * and never again after that. */
export async function readLegacyAccountBalances(): Promise<Record<string, number>> {
  await migrate();
  return enqueue(async () => {
    const rows = await db.getAllAsync<{ id: string; balance: number | null }>('SELECT id, balance FROM accounts');
    const out: Record<string, number> = {};
    for (const r of rows) out[r.id] = r.balance ?? 0;
    return out;
  });
}

export const categoriesRepo = makeRepo<Category>({
  table: 'categories', columns: ['id', 'name', 'type', 'color'],
});

export const profilesRepo = makeRepo<Profile>({
  table: 'profiles', columns: ['id', 'name', 'relationship'],
});

export const peopleRepo = makeRepo<Person>({
  table: 'people', columns: ['id', 'name', 'phone', 'note'],
});

export const debtsRepo = makeRepo<Debt>({
  table: 'debts', columns: ['id', 'personId', 'direction', 'original', 'payments', 'reminderDate'],
  jsonColumns: ['payments'],
});

export const billsRepo = makeRepo<Bill>({
  table: 'bills',
  columns: ['id', 'name', 'amount', 'dueDate', 'repeat', 'catId', 'accountId', 'paid', 'amountVaries', 'reminder'],
  boolColumns: ['paid', 'amountVaries'],
});

export const subscriptionsRepo = makeRepo<Subscription>({
  table: 'subscriptions', columns: ['id', 'name', 'amount', 'cycle', 'nextDate', 'catId', 'accountId'],
});

export const recurringTransactionsRepo = makeRepo<RecurringTransaction>({
  table: 'recurring_transactions',
  columns: ['id', 'title', 'amount', 'type', 'catId', 'accountId', 'repeat', 'nextDate'],
});

export const goalsRepo = makeRepo<Goal>({
  table: 'goals', columns: ['id', 'name', 'target', 'saved', 'targetDate'],
});

export const budgetsRepo = makeRepo<Budget>({
  table: 'budgets', columns: ['id', 'catId', 'amount', 'alertThreshold'],
});

export const shoppingListsRepo = makeRepo<ShoppingList>({
  table: 'shopping_lists', columns: ['id', 'name', 'budget', 'repeat', 'items', 'nextDate'],
  jsonColumns: ['items'],
});

export const shoppingTemplatesRepo = makeRepo<ShoppingTemplate>({
  table: 'shopping_templates', columns: ['id', 'name', 'items'],
  jsonColumns: ['items'],
});

export const notesRepo = makeRepo<Note>({
  table: 'notes', columns: ['id', 'text'],
});

export const transactionsRepo = makeRepo<Transaction>({
  table: 'transactions',
  columns: ['id', 'title', 'catId', 'accountId', 'type', 'amount', 'date', 'tags', 'profileId', 'receiptUri', 'transferDir'],
  jsonColumns: ['tags'],
});

/** budgetOverrides is a flat `{ "budgetId:monthOffset": amount }` map in
 * memory (see AppState) rather than a list of id-keyed entities, so it gets
 * its own tiny repo instead of `makeRepo`. */
export const budgetOverridesRepo = {
  async getAll(): Promise<Record<string, number>> {
    await migrate();
    return enqueue(async () => {
      const rows = await db.getAllAsync<{ key: string; amount: number }>('SELECT * FROM budget_overrides');
      const map: Record<string, number> = {};
      for (const r of rows) map[r.key] = r.amount;
      return map;
    });
  },
  async replaceAll(overrides: Record<string, number>): Promise<void> {
    await migrate();
    await enqueue(() => db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM budget_overrides');
      for (const [key, amount] of Object.entries(overrides)) {
        await db.runAsync('INSERT INTO budget_overrides (key, amount) VALUES (?, ?)', [key, amount]);
      }
    }));
  },
};

/** App-wide settings (currency, toggles, dashboard widget prefs) live as a
 * single JSON blob under one row — there's exactly one settings object, not
 * a collection, so a key/value table would just add indirection. */
export interface PersistedSettings {
  currency: string;
  pinLockOn: boolean;
  biometricOn: boolean;
  notifOn: boolean;
  weeklyEmailOn: boolean;
  lastWeeklySummaryAt: number;
  autoBackupOption: 'Off' | 'Daily' | 'Weekly';
  lastExportAt: number;
  lastAutoBackupAt: number;
  ledgerBalancesMigrated: boolean;
  welcomeTourSeen: boolean;
  widgets: Widgets;
  budgetAlertsSent: Record<string, number>;
}

const SETTINGS_ROW_ID = 'app';

export const settingsRepo = {
  async get(): Promise<PersistedSettings | null> {
    await migrate();
    return enqueue(async () => {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE id = ?',
        [SETTINGS_ROW_ID],
      );
      return row ? JSON.parse(row.value) : null;
    });
  },
  async set(settings: PersistedSettings): Promise<void> {
    await migrate();
    await enqueue(() => db.runAsync(
      'INSERT OR REPLACE INTO settings (id, value) VALUES (?, ?)',
      [SETTINGS_ROW_ID, JSON.stringify(settings)],
    ));
  },
};
