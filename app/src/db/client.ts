import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('nibash.db');

const SCHEMA_VERSION = 5;

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, name TEXT, type TEXT, balance REAL, includeInTotal INTEGER, creditLimit REAL
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name TEXT, type TEXT, color TEXT
);
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, name TEXT, relationship TEXT
);
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY, name TEXT, phone TEXT, note TEXT
);
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY, personId TEXT, direction TEXT, original REAL, payments TEXT, reminderDate TEXT
);
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY, name TEXT, amount REAL, dueDate TEXT, repeat TEXT, catId TEXT,
  accountId TEXT, paid INTEGER, amountVaries INTEGER, reminder TEXT
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, name TEXT, amount REAL, cycle TEXT, nextDate TEXT, catId TEXT, accountId TEXT
);
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY, title TEXT, amount REAL, type TEXT, catId TEXT, accountId TEXT, repeat TEXT, nextDate TEXT
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY, name TEXT, target REAL, saved REAL, targetDate TEXT
);
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY, catId TEXT, amount REAL, alertThreshold REAL
);
CREATE TABLE IF NOT EXISTS budget_overrides (
  key TEXT PRIMARY KEY, amount REAL
);
CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY, name TEXT, budget REAL, repeat TEXT, items TEXT, nextDate TEXT
);
CREATE TABLE IF NOT EXISTS shopping_templates (
  id TEXT PRIMARY KEY, name TEXT, items TEXT
);
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY, text TEXT
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY, title TEXT, catId TEXT, accountId TEXT, type TEXT,
  amount REAL, date TEXT, tags TEXT, profileId TEXT, receiptUri TEXT, transferDir TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY, value TEXT
);
`;

/** Column adds for existing installs. `ADD COLUMN` is idempotent-unsafe (errors
 * if the column already exists), so `addColumn` below checks `PRAGMA
 * table_info` first — idempotent, and it never swallows a real error (which
 * would let a broken schema get stamped as "migrated"). */
const ADD_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: 'debts', column: 'reminderDate', ddl: 'ALTER TABLE debts ADD COLUMN reminderDate TEXT' },
  { table: 'budgets', column: 'alertThreshold', ddl: 'ALTER TABLE budgets ADD COLUMN alertThreshold REAL' },
  { table: 'transactions', column: 'receiptUri', ddl: 'ALTER TABLE transactions ADD COLUMN receiptUri TEXT' },
  { table: 'transactions', column: 'transferDir', ddl: 'ALTER TABLE transactions ADD COLUMN transferDir TEXT' },
  { table: 'subscriptions', column: 'catId', ddl: 'ALTER TABLE subscriptions ADD COLUMN catId TEXT' },
  { table: 'subscriptions', column: 'accountId', ddl: 'ALTER TABLE subscriptions ADD COLUMN accountId TEXT' },
  { table: 'shopping_lists', column: 'nextDate', ddl: 'ALTER TABLE shopping_lists ADD COLUMN nextDate TEXT' },
];

async function addColumnIfMissing(table: string, column: string, ddl: string) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) await db.execAsync(ddl);
}

/** expo-sqlite's single native connection isn't safe to drive with overlapping
 * `withTransactionAsync` calls — the hydrate-then-persist flow fires several
 * repo writes back-to-back (e.g. seeding every table on first run, or one
 * store action touching two slices at once), and running them concurrently
 * raced with "cannot start a transaction within a transaction" / "cannot
 * rollback - no transaction is active". Every read and write goes through
 * this queue so only one statement (or transaction) touches `db` at a time. */
let queue: Promise<unknown> = Promise.resolve();
export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

let migrated: Promise<void> | null = null;

/** Runs once per process; safe to call repeatedly (subsequent calls await the
 * same promise). Serialized through `enqueue` so it can never overlap a repo
 * read/write — repos `await migrate()` before their own `enqueue(...)`, so the
 * migration always completes first. */
export function migrate(): Promise<void> {
  if (!migrated) {
    migrated = enqueue(async () => {
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const currentVersion = row?.user_version ?? 0;
      if (currentVersion >= SCHEMA_VERSION) return;
      await db.execAsync(CREATE_TABLES); // no-ops for existing tables; creates any new ones
      for (const c of ADD_COLUMNS) await addColumnIfMissing(c.table, c.column, c.ddl);
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }
  return migrated;
}
