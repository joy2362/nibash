// Single source of truth for "what is today" — everything that needs the
// current date/month should read it from here rather than calling `new
// Date()` inline, so there's one place to swap if the app ever needs to
// simulate a fixed clock (tests, screenshots) again.

export function today(): Date {
  return new Date();
}

export function todayStr(): string {
  return toDateStr(today());
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Inverse of `toDateStr` — parses a `YYYY-MM-DD` string back into a local
 * Date at midnight. Used by fields that store a real date (not the app's
 * older free-text "14 Aug" convention — see `store/recurrence.ts`). */
export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Like `fromDateStr`, but returns `null` instead of an Invalid Date for a
 * string that isn't real `YYYY-MM-DD` — for reading a field that may still
 * hold data from before it was switched to this format (e.g. an existing
 * install's Bill.dueDate / Subscription.nextDate saved before their date
 * picker existed). New saves always produce a real date, so this is a
 * graceful-skip fallback for old data, not the everyday path. */
export function tryFromDateStr(s: string | undefined | null): Date | null {
  if (!s) return null;
  const d = fromDateStr(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
