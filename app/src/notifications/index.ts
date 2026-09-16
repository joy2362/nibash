import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { monthTx, monthKey, catById, personById, debtRemaining, fmtAbs } from '../store/helpers';
import { today, tryFromDateStr } from '../store/now';
import type { AppState } from '../store/types';

// ─────────────────────────────────────────────────────────────────────────────
// Nibash is 100% offline (PRD §2) — every reminder here is a *local* scheduled
// notification, no push service. `notifOn` in Settings is the master switch;
// when it's off, syncReminders cancels everything.
//
// Bill.dueDate / Subscription.nextDate are real `YYYY-MM-DD` (picked via a
// date picker, not typed) — see `dateAtNotifyHour` below. Debt.reminderDate
// is still free text ("20 Aug"), so `parseReminderDate`'s best-effort regex
// parse stays in use for that one field only.
//
// This module has no dependency on the store — it takes state as a param and
// returns results. Wiring (subscription, setState) lives in `wire.ts`.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const REMINDER_LEAD_DAYS: Record<string, number> = {
  'None': -1, // sentinel: no reminder
  '1 day before': 1,
  '3 days before': 3,
  '7 days before': 7,
};
const SUBSCRIPTION_LEAD_DAYS = 3;
const NOTIFY_HOUR = 9; // fire reminders at 9am local

let configured = false;

/** "14 Aug", "1 Sep 2026", "3 Dec" -> the next Date on/after `from` at 9am.
 * Returns null for "Soon" / empty / unparseable. */
export function parseReminderDate(text: string | undefined | null, from = today()): Date | null {
  if (!text) return null;
  const m = text.trim().toLowerCase().match(/(\d{1,2})\s+([a-z]{3,})\.?(?:\s+(\d{4}))?/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthIdx = MONTHS.indexOf(m[2].slice(0, 3));
  if (monthIdx < 0 || day < 1 || day > 31) return null;
  const explicitYear = m[3] ? parseInt(m[3], 10) : null;
  const year = explicitYear ?? from.getFullYear();
  let d = new Date(year, monthIdx, day, NOTIFY_HOUR, 0, 0, 0);
  if (!explicitYear && d.getTime() < from.getTime() - 12 * 3600_000) {
    d = new Date(year + 1, monthIdx, day, NOTIFY_HOUR, 0, 0, 0);
  }
  return d;
}

/** A real `YYYY-MM-DD` (Bill.dueDate / Subscription.nextDate) at the fixed
 * 9am reminder hour. Returns null for a value that predates the date picker
 * (old free-text data on an existing install) rather than an Invalid Date. */
function dateAtNotifyHour(iso: string): Date | null {
  const d = tryFromDateStr(iso);
  if (!d) return null;
  d.setHours(NOTIFY_HOUR, 0, 0, 0);
  return d;
}

export async function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Requests permission if not already decided. Returns whether we can post. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

interface PlannedReminder {
  identifier: string;
  title: string;
  body: string;
  date: Date;
}

/** The complete set of reminders that *should* be scheduled given current data. */
function buildReminderPlan(s: AppState): PlannedReminder[] {
  const now = today();
  const cur = s.currency;
  const out: PlannedReminder[] = [];
  const future = (d: Date | null): d is Date => !!d && d.getTime() > now.getTime();

  for (const b of s.bills) {
    if (b.paid) continue;
    const lead = REMINDER_LEAD_DAYS[b.reminder ?? '3 days before'] ?? 3;
    if (lead < 0) continue;
    const due = dateAtNotifyHour(b.dueDate);
    if (!due) continue;
    const fire = new Date(due.getTime() - lead * 86_400_000);
    if (!future(fire)) continue;
    out.push({
      identifier: `bill:${b.id}`,
      title: 'Bill due soon',
      body: `${b.name} — ${cur}${fmtAbs(b.amount)} due ${b.dueDate}`,
      date: fire,
    });
  }

  for (const sub of s.subscriptions) {
    const next = dateAtNotifyHour(sub.nextDate);
    if (!next) continue;
    const fire = new Date(next.getTime() - SUBSCRIPTION_LEAD_DAYS * 86_400_000);
    if (!future(fire)) continue;
    out.push({
      identifier: `sub:${sub.id}`,
      title: 'Subscription renews soon',
      body: `${sub.name} — ${cur}${fmtAbs(sub.amount)} on ${sub.nextDate}`,
      date: fire,
    });
  }

  for (const d of s.debts) {
    if (!d.reminderDate) continue;
    const remaining = debtRemaining(d);
    if (remaining <= 0) continue;
    const fire = parseReminderDate(d.reminderDate, now);
    if (!future(fire)) continue;
    const who = personById(s, d.personId).name;
    out.push({
      identifier: `debt:${d.id}`,
      title: 'Debt reminder',
      body: d.direction === 'owe'
        ? `You owe ${who} ${cur}${fmtAbs(remaining)}`
        : `${who} owes you ${cur}${fmtAbs(remaining)}`,
      date: fire,
    });
  }

  return out;
}

/** Cancels every scheduled reminder and re-schedules the current plan.
 * Cheap at this app's scale (≤~20 reminders) and immune to drift. */
export async function syncReminders(s: AppState): Promise<void> {
  await configureNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!s.notifOn) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  for (const r of buildReminderPlan(s)) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.identifier,
      content: { title: r.title, body: r.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.date,
        channelId: 'reminders',
      },
    });
  }
}

export interface BudgetAlertResult {
  nextSent: Record<string, number>;
  fire: { title: string; body: string }[];
}

/** Budget alerts are data-driven, not date-driven: the first time a category's
 * spend crosses its threshold in a month, fire once. Returns the fresh
 * `budgetAlertsSent` map + the notifications to post, or null if nothing new. */
export function computeBudgetAlerts(s: AppState): BudgetAlertResult | null {
  if (!s.notifOn) return null;
  const mk = monthKey(0);
  const tx = monthTx(s, 0).filter((t) => t.type === 'expense');
  const sent = { ...s.budgetAlertsSent };
  const fire: { title: string; body: string }[] = [];
  let changed = false;

  for (const b of s.budgets) {
    if (b.alertThreshold == null) continue;
    const amount = s.budgetOverrides[`${b.id}:0`] ?? b.amount;
    if (amount <= 0) continue;
    const spent = tx.filter((t) => t.catId === b.catId).reduce((sum, t) => sum + t.amount, 0);
    const pct = Math.round((spent / amount) * 100);
    const key = `${b.id}:${mk}`;
    if (pct >= b.alertThreshold && !sent[key]) {
      sent[key] = Date.now();
      changed = true;
      const cat = catById(s, b.catId).name;
      fire.push({
        title: 'Budget alert',
        body: `You've used ${pct}% of your ${cat} budget (${s.currency}${fmtAbs(spent)} / ${s.currency}${fmtAbs(amount)}).`,
      });
    }
  }
  if (!changed) return null;

  const cutoff = Date.now() - 90 * 86_400_000;
  for (const k of Object.keys(sent)) if (sent[k] < cutoff) delete sent[k];
  return { nextSent: sent, fire };
}

/** PRD's "weekly summary email" reimagined as a local notification — Nibash
 * is offline (§2), so there's no email channel to send through, but the
 * underlying value (a periodic income/expense digest) fits the existing
 * local-notification infrastructure directly. `weeklyEmailOn` keeps its
 * original field name from the email-era design (renaming would touch the
 * DB settings blob, backup format, and every call site for no real gain) —
 * it now means "post a weekly summary notification." Returns null when the
 * toggle is off; the caller (`wire.ts`) decides whether 7 days have passed
 * since the last one. */
export function computeWeeklySummary(s: AppState): { title: string; body: string } | null {
  if (!s.weeklyEmailOn) return null;
  const now = today();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const tx = s.transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getTime() >= weekAgo.getTime() && d.getTime() <= now.getTime();
  });
  const income = tx.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = tx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return {
    title: 'Your weekly summary',
    body: `Income ${s.currency}${fmtAbs(income)} · Expense ${s.currency}${fmtAbs(expense)} over the last 7 days.`,
  };
}

export async function postImmediate(items: { title: string; body: string }[]) {
  await configureNotifications();
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  for (const n of items) {
    await Notifications.scheduleNotificationAsync({ content: n, trigger: null });
  }
}
