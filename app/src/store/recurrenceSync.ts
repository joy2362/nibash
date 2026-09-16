import { useStore } from './useStore';
import { today, toDateStr, fromDateStr, tryFromDateStr } from './now';
import { nextOccurrence } from './recurrence';
import { MONTHS } from './seed';
import type { Subscription, ShoppingList, Transaction } from './types';

// `../backup` and `./useStore` both get imported by things that import each
// other in this app (see useStore.ts's `backupApi()` comment) — this module
// only ever *reads* `useStore.getState()`/writes via `useStore.setState()`
// and is itself imported lazily from App.tsx, so no cycle here.

function newId(prefix: string): string {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
}

/** Catches up any Subscriptions whose `nextDate` is due, logging one
 * `expense` Transaction per missed cycle (dated to the actual cycle date,
 * not "today" — so a catch-up after being away for a while doesn't cluster
 * every missed charge onto one day) and advancing `nextDate` past today.
 * Idempotent — safe to call on every app open. A subscription with no
 * catId/accountId yet (created before those fields existed) is left alone
 * until the user edits it and picks both. */
export function syncSubscriptions(): void {
  const s = useStore.getState();
  if (!s.subscriptions.length) return;
  const now = today();
  const newTx: Transaction[] = [];
  let changed = false;

  const subs = s.subscriptions.map((sub): Subscription => {
    if (!sub.catId || !sub.accountId) return sub;
    let cursor = tryFromDateStr(sub.nextDate);
    if (!cursor) return sub;
    let nextDateText = sub.nextDate;
    let guard = 0;
    const MAX_CATCHUP_CYCLES = 24; // safety cap, not a real limit on legitimate use
    while (cursor && cursor.getTime() <= now.getTime() && guard < MAX_CATCHUP_CYCLES) {
      newTx.push({
        id: newId('tx'), title: sub.name, catId: sub.catId, accountId: sub.accountId,
        type: 'expense', amount: sub.amount, date: toDateStr(cursor), tags: ['subscription'], profileId: 'me',
      });
      changed = true;
      const advanced = nextOccurrence(cursor, sub.cycle);
      if (!advanced) break; // One-time/Custom — nothing to loop on
      cursor = advanced;
      nextDateText = toDateStr(advanced);
      guard++;
    }
    return nextDateText === sub.nextDate ? sub : { ...sub, nextDate: nextDateText };
  });

  if (!changed) return;
  const st = useStore.getState();
  useStore.setState({
    subscriptions: subs,
    transactions: st.transactions.concat(newTx),
  });
}

/** Catches up recurring Shopping Lists (PRD §12) — generates at most **one**
 * fresh copy per template per sync (unlike Subscriptions, missing a few
 * months of grocery-list generation shouldn't spam several duplicate lists;
 * one current one is what's actually useful) and advances the template's own
 * `nextDate`. The generated list is a plain one-off (its own `repeat` is
 * left unset) — only the original template keeps regenerating. */
export function syncRecurringShoppingLists(): void {
  const s = useStore.getState();
  const now = today();
  const additions: ShoppingList[] = [];
  let changed = false;

  const lists = s.shoppingLists.map((list): ShoppingList => {
    if (!list.repeat || list.repeat === 'One-time' || !list.nextDate) return list;
    const due = fromDateStr(list.nextDate);
    if (due.getTime() > now.getTime()) return list;
    changed = true;
    additions.push({
      id: newId('sl'),
      name: `${list.name} — ${MONTHS[due.getMonth()]}`,
      budget: list.budget,
      items: list.items.map((it) => ({ ...it, checked: false, actualPrice: undefined })),
    });
    // Advance nextDate past "now" in one go (not just one cycle) so being
    // several cycles behind — or just opening the app again right away
    // while still catching up — doesn't spawn another duplicate list next
    // sync; only the single list above is ever generated per catch-up.
    let advanced = nextOccurrence(due, list.repeat);
    while (advanced && advanced.getTime() <= now.getTime()) {
      advanced = nextOccurrence(advanced, list.repeat);
    }
    return advanced ? { ...list, nextDate: toDateStr(advanced) } : { ...list, repeat: undefined, nextDate: undefined };
  });

  if (!changed) return;
  useStore.setState({ shoppingLists: lists.concat(additions) });
}

/** Runs both sync passes once. Call from App.tsx after hydration — but not
 * on the same boot as a first-run seed (see `store/persist.ts`'s
 * `hydrateStore` return value), since the hand-authored seed ledger already
 * contains its own "Netflix" entry and a same-boot catch-up would duplicate
 * it before the user ever sees the app. */
export function initRecurrenceSync(): void {
  syncSubscriptions();
  syncRecurringShoppingLists();
}
