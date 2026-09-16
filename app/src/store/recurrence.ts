import { MONTHS } from './seed';

// ─────────────────────────────────────────────────────────────────────────────
// The shared recurrence engine (PRD §20) — pure date math, no store dependency
// (same pattern as security/* and notifications/index.ts). Bill.dueDate,
// Subscription.nextDate, RecurringTransaction.nextDate, and ShoppingList.
// nextDate all store a real `YYYY-MM-DD` (see `now.ts`'s
// `toDateStr`/`fromDateStr`). The one remaining free-text spot is Recurring
// Transactions' "Next occurrence" form field — typing "14 Aug" is friendlier
// than a bare date field for that one text input, so `parseShortDate`/
// `formatShortDate` round-trip it to/from the real stored ISO date at
// save/edit time. Debt.reminderDate is free text too, parsed by
// `notifications/index.ts`'s own copy of this regex, not this module.
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_ABBR = MONTHS.map((m) => m.slice(0, 3).toLowerCase());

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "14 Aug", "1 Sep 2026" -> the next Date on/after `from` (mirrors
 * notifications/index.ts's `parseReminderDate`, minus the fixed 9am — this
 * one is pure date, no time-of-day). Returns null for empty/unparseable
 * text. */
export function parseShortDate(text: string | undefined | null, from: Date): Date | null {
  if (!text) return null;
  const m = text.trim().toLowerCase().match(/(\d{1,2})\s+([a-z]{3,})\.?(?:\s+(\d{4}))?/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthIdx = MONTH_ABBR.indexOf(m[2].slice(0, 3));
  if (monthIdx < 0 || day < 1 || day > 31) return null;
  const explicitYear = m[3] ? parseInt(m[3], 10) : null;
  const year = explicitYear ?? from.getFullYear();
  let d = new Date(year, monthIdx, day);
  if (!explicitYear && d.getTime() < stripTime(from).getTime()) {
    d = new Date(year + 1, monthIdx, day);
  }
  return d;
}

/** "14 Aug" style — used to show/edit Recurring Transactions' "Next
 * occurrence" free-text field in a friendlier format than a raw ISO date. */
export function formatShortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Adds `n` months, clamping to the last day of the target month if the
 * original day doesn't exist there (PRD §20: "if that day doesn't exist in a
 * shorter month, fall back to the last day of the month"). */
function addMonthsClamped(d: Date, n: number): Date {
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

/** The one function every recurring feature (Bills, Subscriptions, Recurring
 * Transactions, Recurring Shopping Lists) advances a date through — PRD §20
 * is explicit that they all share one Repeat control, so they share the one
 * implementation that acts on it. Returns null for 'One-time' and 'Custom':
 * One-time doesn't repeat by definition, and Custom has no "every N
 * days/weeks/months" input anywhere in the UI yet, so there's no interval to
 * advance by — both are treated as "doesn't auto-advance" until a Custom
 * interval field exists. */
export function nextOccurrence(d: Date, freq: string): Date | null {
  switch (freq) {
    case 'Weekly': return addDays(d, 7);
    case 'Bi-weekly': return addDays(d, 14);
    case 'Monthly': return addMonthsClamped(d, 1);
    case 'Yearly': return addMonthsClamped(d, 12);
    default: return null;
  }
}
