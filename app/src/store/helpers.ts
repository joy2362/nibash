import { MONTHS, HIST_EXPENSE } from './seed';
import { today, fromDateStr } from './now';
import type { AppState, Category, Account, Person, Profile, Debt, Transaction, RecurringTransaction } from './types';

export function fmtAbs(n: number): string {
  n = Math.round(Math.abs(n || 0));
  const s = String(n);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

export function fmtSigned(n: number): string {
  return (n < 0 ? '−' : '') + fmtAbs(n);
}

export function monthInfo(offset: number) {
  const now = today();
  let m = now.getMonth() + offset;
  const y = now.getFullYear() + Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return { year: y, month: m };
}

export function monthLabel(offset: number) {
  const { year, month } = monthInfo(offset);
  return MONTHS[month] + ' ' + year;
}

export function monthShort(offset: number) {
  const { month } = monthInfo(offset);
  return MONTHS[month].slice(0, 3);
}

export function monthKey(offset: number) {
  const { year, month } = monthInfo(offset);
  return year + '-' + String(month + 1).padStart(2, '0');
}

export function monthTx(state: AppState, offset: number): Transaction[] {
  const k = monthKey(offset);
  return state.transactions.filter((t) => t.date.slice(0, 7) === k);
}

export function monthTotals(state: AppState, offset: number) {
  const tx = monthTx(state, offset);
  const income = tx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense };
}

export function expenseTotalFor(state: AppState, offset: number) {
  if (offset <= -2 && HIST_EXPENSE[offset] != null) return HIST_EXPENSE[offset];
  return monthTotals(state, offset).expense;
}

export function dayFmt(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getDate();
}

export function catById(state: AppState, id: string | null): Category {
  return state.categories.find((c) => c.id === id) || { id: '', name: '—', type: 'expense', color: 'neutral500' };
}

export function accById(state: AppState, id: string | null): Account {
  return state.accounts.find((a) => a.id === id) || { id: '', name: '—', type: 'Other', includeInTotal: false };
}

export function personById(state: AppState, id: string | null): Person {
  return state.people.find((p) => p.id === id) || { id: '', name: '—', phone: '', note: '' };
}

export function profileById(state: AppState, id: string | null): Profile {
  return state.profiles.find((p) => p.id === id) || { id: '', name: '—', relationship: '' };
}

/** Every distinct tag used across all transactions, lowercase and sorted —
 * feeds the Tags (§27) autocomplete chips on the expense/income form. */
export function allTags(state: AppState): string[] {
  const set = new Set<string>();
  for (const t of state.transactions) for (const tag of t.tags) set.add(tag);
  return Array.from(set).sort();
}

export function debtRemaining(d: Debt) {
  return d.original - d.payments.reduce((s, p) => s + p.amount, 0);
}

/** Recurring transactions whose `nextDate` has arrived — surfaced as the
 * "Due now" Skip/Add Expense prompt on the Recurring screen (PRD §20). */
export function dueRecurringTransactions(state: AppState): RecurringTransaction[] {
  const now = today();
  return state.recurringTransactions.filter((r) => fromDateStr(r.nextDate).getTime() <= now.getTime());
}

/** Which way a transaction moves money for its own `accountId` — +1 credits
 * the account, −1 debits it. Used for Activity/HomeScreen/AccountDetail
 * display (row color, day/net totals) *and* as the ledger-effect multiplier
 * `accountBalances` sums to derive an account's actual balance; it's
 * deliberately separate from `monthTotals`'s income/expense filter, since
 * transfers and savings moves are real money movement but never count as
 * "income" or "expense" (PRD §8, §19b). debt_lend/debt_borrow/debt_payment/
 * refund aren't created anywhere yet (see `TransactionType`) — the -1
 * fallback just keeps this total sane if one eventually shows up unhandled. */
export function txSign(t: Transaction): 1 | -1 {
  if (t.type === 'income' || t.type === 'savings_withdrawal' || t.type === 'debt_borrow' || t.type === 'refund' || t.type === 'opening_balance') return 1;
  if (t.type === 'transfer') return t.transferDir === 'in' ? 1 : -1;
  return -1;
}

/** An account's balance, derived from its ledger (principle 6) rather than a
 * stored field — every account's starting balance is (or, for an account
 * that predates this, was backfilled by `persist.ts`'s one-time migration
 * to be) its own `opening_balance` transaction, so summing `txSign(t) *
 * t.amount` over every transaction for that account is the complete
 * balance, no separate base value needed. Computed once per render (same
 * pattern as `monthTotals`/`computePie`), not memoized — cheap at this
 * app's transaction-count scale. */
export function accountBalances(state: AppState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of state.transactions) {
    out[t.accountId] = (out[t.accountId] ?? 0) + txSign(t) * t.amount;
  }
  return out;
}

export function txInitial(title: string) {
  return title.charAt(0).toUpperCase();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** True for an exact (case/whitespace-insensitive) match or a likely typo of
 * one — People (§14a) warns rather than blocks on this, since two real
 * people can legitimately share a name (common in Bangladesh per the PRD),
 * unlike Accounts/Categories where a near-duplicate is almost always a typo
 * worth blocking on. Threshold scales with name length so short names still
 * need to be close (e.g. "Rahim"/"Rahmi" matches, "Al"/"Bo" doesn't). */
export function namesAreSimilar(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return false;
  if (x === y) return true;
  const maxLen = Math.max(x.length, y.length);
  const threshold = maxLen <= 4 ? 1 : Math.floor(maxLen * 0.25);
  return levenshtein(x, y) <= threshold;
}

/** Shared by `computePie` (single month) and Reports' range toggle (§24) —
 * factored out so both build the legend the same way from whatever set of
 * expense transactions they've already gathered. */
export function computePieFromTx(state: AppState, expenseTx: Transaction[]) {
  const byCat: Record<string, number> = {};
  expenseTx.forEach((t) => { byCat[t.catId] = (byCat[t.catId] || 0) + t.amount; });
  const rows = Object.keys(byCat)
    .map((id) => ({ id, amount: byCat[id] }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  const sum = rows.reduce((s, r) => s + r.amount, 0) || 1;
  let acc = 0;
  const legend = rows.map((r) => {
    const cat = catById(state, r.id);
    const pct = Math.round((r.amount / sum) * 100);
    acc += pct;
    return { name: cat.name, color: cat.color, pct };
  });
  return legend;
}

export function computePie(state: AppState, offset: number) {
  return computePieFromTx(state, monthTx(state, offset).filter((t) => t.type === 'expense'));
}

export type ReportRange = 'month' | '3mo' | '6mo' | 'year';

/** Sums real `monthTotals` across every month a range spans — deliberately
 * doesn't fall back to `HIST_EXPENSE`'s placeholder figures the way the
 * decorative trend chart does, since these numbers back real income/expense
 * totals a user might act on, not just a rough visual shape. A month with no
 * real transactions correctly contributes 0. */
export function rangeTotals(state: AppState, range: ReportRange, off: number) {
  let income = 0;
  let expense = 0;
  for (const o of rangeOffsets(range, off)) {
    const t = monthTotals(state, o);
    income += t.income;
    expense += t.expense;
  }
  return { income, expense };
}

/** The month offsets a Reports range toggle (§24) spans, anchored so the
 * currently-navigated month (`off`) is always the *last* month in the
 * window — e.g. '3mo' at `off=0` is [-2,-1,0] (this month and the two
 * before it), not centered on `off`. */
export function rangeOffsets(range: ReportRange, off: number): number[] {
  const span = range === '3mo' ? 3 : range === '6mo' ? 6 : range === 'year' ? 12 : 1;
  return Array.from({ length: span }, (_, i) => off - (span - 1) + i);
}

/** "September 2026" for a single month, "Apr 2026 – Sep 2026" for a range —
 * the Reports header label needs to reflect the whole window, not just
 * whatever month `monthOffset` happens to be on. */
export function rangeLabel(range: ReportRange, off: number): string {
  if (range === 'month') return monthLabel(off);
  const offsets = rangeOffsets(range, off);
  const first = offsets[0];
  const last = offsets[offsets.length - 1];
  const a = monthInfo(first);
  const b = monthInfo(last);
  const from = `${monthShort(first)}${a.year !== b.year ? ` ${a.year}` : ''}`;
  const to = `${monthShort(last)} ${b.year}`;
  return `${from} – ${to}`;
}
