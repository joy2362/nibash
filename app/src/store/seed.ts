import type {
  Account, Category, Profile, Person, Debt, Bill, Subscription, RecurringTransaction, Goal,
  Budget, ShoppingList, ShoppingTemplate, Note, Transaction, Widgets,
} from './types';

// Sample data loaded into a genuinely empty database on first run (see
// store/persist.ts). Ported from the Expense Tracker.dc.html design canvas;
// transaction dates are generated relative to "now" rather than fixed —
// see `buildSeedTransactions` below.

export const seedAccounts: Account[] = [
  { id: 'acc1', name: 'Cash', type: 'Cash', includeInTotal: true },
  { id: 'acc2', name: 'City Bank', type: 'Bank', includeInTotal: true },
  { id: 'acc3', name: 'Visa Card', type: 'Credit card', includeInTotal: true, creditLimit: 50000 },
  { id: 'acc4', name: 'Savings', type: 'Bank', includeInTotal: true },
];

export const seedCategories: Category[] = [
  { id: 'groceries', name: 'Groceries', type: 'expense', color: 'accent500' },
  { id: 'transport', name: 'Transport', type: 'expense', color: 'neutral500' },
  { id: 'dining', name: 'Dining out', type: 'expense', color: 'accent600' },
  { id: 'utilities', name: 'Utilities', type: 'expense', color: 'neutral600' },
  { id: 'rent', name: 'Rent', type: 'expense', color: 'accent700' },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: 'accent400' },
  { id: 'health', name: 'Health', type: 'expense', color: 'neutral700' },
  { id: 'entertainment', name: 'Entertainment', type: 'expense', color: 'accent800' },
  { id: 'salary', name: 'Salary', type: 'income', color: 'accent300' },
  { id: 'freelance', name: 'Freelance', type: 'income', color: 'accent200' },
];

export const seedProfiles: Profile[] = [
  { id: 'me', name: 'Me', relationship: 'Me' },
  { id: 'partner', name: 'Nadia', relationship: 'Spouse' },
];

export const seedPeople: Person[] = [
  { id: 'p1', name: 'Rahim Uddin', phone: '01712-345678', note: 'Colleague' },
  { id: 'p2', name: 'Tanvir Ahmed', phone: '01898-112233', note: 'Friend' },
];

export const seedDebts: Debt[] = [
  { id: 'd1', personId: 'p1', direction: 'owe', original: 5000, payments: [{ date: '12 Jul', amount: 1500 }] },
  { id: 'd2', personId: 'p2', direction: 'owed', original: 3000, payments: [] },
];

/** Bill/Subscription dates are relative to whenever the app first runs, same
 * reasoning as `buildSeedTransactions` — a fixed "14 Aug" would land in the
 * past immediately for any first run outside Aug-Dec, which for Subscriptions
 * would make `syncRecurringShoppingLists`'s sibling `syncSubscriptions` treat
 * several cycles as already missed and catch them all up on first boot. Day
 * offsets otherwise match the original design mock's due dates. */
export function buildSeedBills(now: Date = new Date()): Bill[] {
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const next = new Date(cy, cm + 1, 1);
  return [
    { id: 'b1', name: 'Electricity', amount: 1850, dueDate: d(cy, cm, 14), repeat: 'Monthly', catId: 'utilities', accountId: 'acc2', paid: false },
    { id: 'b2', name: 'Internet', amount: 1200, dueDate: d(cy, cm, 18), repeat: 'Monthly', catId: 'utilities', accountId: 'acc2', paid: false },
    { id: 'b3', name: 'Rent', amount: 22000, dueDate: d(next.getFullYear(), next.getMonth(), 1), repeat: 'Monthly', catId: 'rent', accountId: 'acc2', paid: false },
  ];
}

export function buildSeedSubscriptions(now: Date = new Date()): Subscription[] {
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const yearly = new Date(cy, cm + 4, 3);
  return [
    { id: 's1', name: 'Netflix', amount: 650, cycle: 'Monthly', nextDate: d(cy, cm, 21), catId: 'entertainment', accountId: 'acc3' },
    { id: 's2', name: 'Spotify', amount: 250, cycle: 'Monthly', nextDate: d(cy, cm, 9), catId: 'entertainment', accountId: 'acc3' },
    { id: 's3', name: 'iCloud+', amount: 1200, cycle: 'Yearly', nextDate: d(yearly.getFullYear(), yearly.getMonth(), yearly.getDate()), catId: 'entertainment', accountId: 'acc3' },
  ];
}

/** One sample standalone recurring transaction (PRD §20) — Salary is a good
 * fit since it's genuinely recurring income, which Bills (always an expense)
 * can't represent. `nextDate` is relative to whenever the app first runs
 * (see `buildSeedTransactions`), not a fixed calendar date. */
export function buildSeedRecurring(now: Date = new Date()): RecurringTransaction[] {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return [
    {
      id: 'rt1', title: 'Salary', amount: 85000, type: 'income', catId: 'salary', accountId: 'acc2',
      repeat: 'Monthly', nextDate: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`,
    },
  ];
}

export const seedGoals: Goal[] = [
  { id: 'g1', name: 'New Laptop', target: 120000, saved: 74000, targetDate: 'Dec 2026' },
  { id: 'g2', name: 'Emergency Fund', target: 200000, saved: 96000, targetDate: '' },
];

export const seedBudgets: Budget[] = [
  { id: 'bu1', catId: 'groceries', amount: 12000 },
  { id: 'bu2', catId: 'dining', amount: 6000 },
  { id: 'bu3', catId: 'transport', amount: 4000 },
];

export const seedShoppingLists: ShoppingList[] = [
  { id: 'sl1', name: 'Weekly groceries', budget: 5000, items: [
    { id: 'i1', name: 'Rice', qty: '5 kg', price: 450, checked: true },
    { id: 'i2', name: 'Milk', qty: '2 L', price: 180, checked: true },
    { id: 'i3', name: 'Eggs', qty: '1 dozen', price: 150, checked: false },
    { id: 'i4', name: 'Chicken', qty: '1 kg', price: 280, checked: false },
  ] },
  { id: 'sl2', name: 'Eid shopping', budget: 15000, items: [
    { id: 'i5', name: 'Panjabi', qty: '', price: 3500, checked: false },
    { id: 'i6', name: 'Sandals', qty: '', price: 1200, checked: false },
  ] },
];

export const seedShoppingTemplates: ShoppingTemplate[] = [
  { id: 'tpl1', name: 'Monthly Grocery Template', items: [
    { name: 'Rice', qty: '5 kg' }, { name: 'Oil', qty: '2 L' }, { name: 'Salt', qty: '1 kg' }, { name: 'Sugar', qty: '1 kg' },
    { name: 'Milk', qty: '2 L' }, { name: 'Eggs', qty: '1 dozen' }, { name: 'Chicken', qty: '1 kg' }, { name: 'Vegetables', qty: '' },
  ] },
];

export const seedNotes: Note[] = [
  { id: 'n1', text: 'Ask landlord about the maintenance fee for September.' },
  { id: 'n2', text: 'Split the Cox’s Bazar trip cost with Rahim.' },
];

/** Sample transactions are dated relative to whenever the app is actually
 * first run (see `buildSeedTransactions`) rather than a fixed calendar month
 * — there is no "real" August 2026 for this data to live in, so it always
 * lands in the current and previous month instead of drifting into the past
 * the longer this app version has existed. Day-of-month offsets are otherwise
 * unchanged from the original design mock. */
function d(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function buildSeedTransactions(now: Date = new Date()): Transaction[] {
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const prev = new Date(cy, cm - 1, 1);
  const py = prev.getFullYear();
  const pm = prev.getMonth();

  return [
    // Opening balances (principle 6 — accounts have no raw balance field,
    // only a derived one; see helpers.ts's accountBalances). Amounts are
    // picked so that, combined with every demo transaction below, each
    // account's derived total lands on the original design mock's numbers
    // (Cash ৳8,200 · City Bank ৳1,42,500 · Visa Card −৳6,400 · Savings
    // ৳58,000) — the same reconciliation persist.ts's one-time migration
    // does for a real existing install, just computed once here by hand.
    { id: 'tx0acc1', title: 'Opening balance', catId: '', accountId: 'acc1', type: 'opening_balance', amount: 20350, date: d(py, pm, 1), tags: [], profileId: 'me' },
    { id: 'tx0acc2', title: 'Opening balance', catId: '', accountId: 'acc2', type: 'opening_balance', amount: -8600, date: d(py, pm, 1), tags: [], profileId: 'me' },
    { id: 'tx0acc3', title: 'Opening balance', catId: '', accountId: 'acc3', type: 'opening_balance', amount: 6070, date: d(py, pm, 1), tags: [], profileId: 'me' },
    { id: 'tx0acc4', title: 'Opening balance', catId: '', accountId: 'acc4', type: 'opening_balance', amount: 58000, date: d(py, pm, 1), tags: [], profileId: 'me' },
    { id: 'tx1', title: 'Salary', catId: 'salary', accountId: 'acc2', type: 'income', amount: 85000, date: d(cy, cm, 1), tags: [], profileId: 'me' },
    { id: 'tx2', title: 'Rent', catId: 'rent', accountId: 'acc2', type: 'expense', amount: 22000, date: d(cy, cm, 1), tags: [], profileId: 'me' },
    { id: 'tx3', title: 'Groceries – Shwapno', catId: 'groceries', accountId: 'acc1', type: 'expense', amount: 1450, date: d(cy, cm, 3), tags: ['household'], profileId: 'me' },
    { id: 'tx4', title: 'Uber to office', catId: 'transport', accountId: 'acc3', type: 'expense', amount: 320, date: d(cy, cm, 4), tags: [], profileId: 'me' },
    { id: 'tx5', title: 'Dinner with Nadia', catId: 'dining', accountId: 'acc3', type: 'expense', amount: 1800, date: d(cy, cm, 5), tags: ['date'], profileId: 'partner' },
    { id: 'tx6', title: 'Electricity bill', catId: 'utilities', accountId: 'acc2', type: 'expense', amount: 1850, date: d(cy, cm, 6), tags: [], profileId: 'me' },
    { id: 'tx7', title: 'Freelance project', catId: 'freelance', accountId: 'acc2', type: 'income', amount: 18000, date: d(cy, cm, 6), tags: [], profileId: 'me' },
    { id: 'tx8', title: 'Pharmacy', catId: 'health', accountId: 'acc1', type: 'expense', amount: 640, date: d(cy, cm, 7), tags: [], profileId: 'me' },
    { id: 'tx9', title: 'Groceries – Agora', catId: 'groceries', accountId: 'acc1', type: 'expense', amount: 2100, date: d(cy, cm, 8), tags: [], profileId: 'me' },
    { id: 'tx10', title: 'Movie night', catId: 'entertainment', accountId: 'acc3', type: 'expense', amount: 900, date: d(cy, cm, 8), tags: ['fun'], profileId: 'partner' },
    { id: 'tx11', title: 'Netflix', catId: 'entertainment', accountId: 'acc3', type: 'expense', amount: 650, date: d(cy, cm, 9), tags: [], profileId: 'me' },
    { id: 'tx12', title: 'Bus fare', catId: 'transport', accountId: 'acc1', type: 'expense', amount: 60, date: d(cy, cm, 9), tags: [], profileId: 'me' },
    { id: 'tx14', title: 'Salary', catId: 'salary', accountId: 'acc2', type: 'income', amount: 85000, date: d(py, pm, 1), tags: [], profileId: 'me' },
    { id: 'tx15', title: 'Rent', catId: 'rent', accountId: 'acc2', type: 'expense', amount: 22000, date: d(py, pm, 1), tags: [], profileId: 'me' },
    { id: 'tx16', title: 'Groceries', catId: 'groceries', accountId: 'acc1', type: 'expense', amount: 5200, date: d(py, pm, 5), tags: [], profileId: 'me' },
    { id: 'tx17', title: 'Transport', catId: 'transport', accountId: 'acc1', type: 'expense', amount: 1800, date: d(py, pm, 10), tags: [], profileId: 'me' },
    { id: 'tx18', title: 'Dining out', catId: 'dining', accountId: 'acc3', type: 'expense', amount: 3400, date: d(py, pm, 14), tags: [], profileId: 'partner' },
    { id: 'tx19', title: 'Utilities', catId: 'utilities', accountId: 'acc2', type: 'expense', amount: 3050, date: d(py, pm, 15), tags: [], profileId: 'me' },
    { id: 'tx20', title: 'Freelance', catId: 'freelance', accountId: 'acc2', type: 'income', amount: 12000, date: d(py, pm, 18), tags: [], profileId: 'me' },
    { id: 'tx21', title: 'Shopping', catId: 'shopping', accountId: 'acc3', type: 'expense', amount: 4200, date: d(py, pm, 20), tags: [], profileId: 'me' },
    { id: 'tx22', title: 'Health', catId: 'health', accountId: 'acc1', type: 'expense', amount: 900, date: d(py, pm, 22), tags: [], profileId: 'me' },
    { id: 'tx23', title: 'Entertainment', catId: 'entertainment', accountId: 'acc3', type: 'expense', amount: 1200, date: d(py, pm, 25), tags: [], profileId: 'partner' },
  ];
}

export const HIST_EXPENSE: Record<number, number> = { '-5': 36000, '-4': 41000, '-3': 33000, '-2': 45000 } as any;

export const seedWidgets: Widgets = {
  balance: true, incomeExpense: true, budget: true, bills: true, debts: true,
  shopping: true, goals: true, subscriptions: false, profile: false, recent: true,
};

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
