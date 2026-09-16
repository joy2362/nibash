import { useStore } from '../store/useStore';
import { syncReminders, computeBudgetAlerts, computeWeeklySummary, postImmediate } from './index';

let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function run() {
  const s = useStore.getState();
  await syncReminders(s);
  const alerts = computeBudgetAlerts(s);
  if (alerts) {
    useStore.setState({ budgetAlertsSent: alerts.nextSent });
    await postImmediate(alerts.fire);
  }
}

/** Checked once at boot, not on every reactive resync — a weekly digest
 * should fire once when 7 days have elapsed, not every time a transaction
 * changes within that window. */
async function maybeRunWeeklySummary() {
  const s = useStore.getState();
  if (Date.now() - s.lastWeeklySummaryAt < WEEK_MS) return;
  const summary = computeWeeklySummary(s);
  if (!summary) return;
  await postImmediate([summary]);
  useStore.setState({ lastWeeklySummaryAt: Date.now() });
}

/** Call once from App.tsx after `hydrateStore()`. Runs the initial reminder
 * sync and keeps it in step with the data via a debounced store subscription. */
export function initNotifications() {
  void run();
  void maybeRunWeeklySummary();
  unsubscribe?.();
  unsubscribe = useStore.subscribe((state, prev) => {
    const relevant =
      state.bills !== prev.bills || state.subscriptions !== prev.subscriptions
      || state.debts !== prev.debts || state.budgets !== prev.budgets
      || state.budgetOverrides !== prev.budgetOverrides || state.transactions !== prev.transactions
      || state.notifOn !== prev.notifOn || state.currency !== prev.currency;
    if (!relevant) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void run(); }, 400);
  });
}
