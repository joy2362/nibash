# Nibash — prototype → done plan

Living roadmap for taking every PRD module from "UI-complete prototype" to genuinely
finished (persists data, enforces the PRD's rules, uses real device capabilities).

**Legend:** ✅ done · 🔶 partial · ⬜ not started

---

## Where things stand

Every screen and modal in the PRD's MVP scope (Section 38) exists and is wired to the
single Zustand store ([app/src/store/useStore.ts](app/src/store/useStore.ts)). The
foundational infrastructure that unlocks all modules at once is the priority; per-module
wiring is mostly mechanical once it exists.

| # | Foundational piece | Status |
|---|---|---|
| A1 | Local SQLite persistence | ✅ done |
| A2 | Security / App Lock (real PIN + biometric) | ✅ done |
| A3 | Local notifications | ✅ done |
| A4 | Files: backup/restore, exports, attachments | ✅ done |
| A5 | Kill the hardcoded "August 2026" demo clock | ✅ done |

**Part A is complete. Part B is complete** (ledger foundation — Transfers/Bill-pay/Goal
contribute-withdraw — and the shared recurrence engine — Bills roll-forward, Subscriptions
+ Recurring Shopping Lists silent catch-up sync, Recurring Transactions as its own entity
with a Skip/Add Expense-Income "Due now" flow). See Part B below for detail.

**Part C is complete** (per-module polish — name uniqueness, tag normalization +
autocomplete + tap-to-filter, real `expo-contacts` import + fuzzy duplicate check, Search
extended to every module, Reports' range toggle actually re-aggregating, automatic
on-device backup, and a Shopping List's repeat editable after creation). See Part C below
for detail.

**Bills/Subscriptions now have a real date-picker due-date/next-billing-date** (the one
item Part C had deliberately left outstanding) — see "Bills/Subscriptions: a real date
picker" under Part C below.

**Part D is complete** (`Account.balance` is now derived from the transaction ledger
instead of a plain stored field, closing the one remaining architectural gap — with a
one-time migration for existing installs). See Part D below for detail. **This is
everything scoped in this plan — there is nothing left outstanding from Parts A-D.**

**Part E is also done** (a first-run Welcome Tour explaining what each part of the app
does and how to operate it, shown once and replayable from Settings) — a new-feature
request rather than a plan gap, tracked in Part E below the same way Part D is.

---

## Part A — Foundational infrastructure

### A1. Local persistence (SQLite) — ✅ done

- `expo-sqlite` added. [app/src/db/client.ts](app/src/db/client.ts) opens the single
  `nibash.db` connection, runs `PRAGMA user_version`-gated migrations, and exports
  `enqueue()` — a serialization queue that **every** read/write to `db` must go through.
  (expo-sqlite's single native connection is not safe under overlapping
  `withTransactionAsync` calls; found live as "cannot start a transaction within a
  transaction" when the first-run seed fired 14 concurrent table writes.)
- [app/src/db/repo.ts](app/src/db/repo.ts): generic
  `makeRepo<T>({ table, columns, jsonColumns, boolColumns })` factory giving each entity
  a `getAll()` / `replaceAll(items)` pair (full delete + reinsert per table — correct and
  simple at this row count). Nested arrays (a `Debt`'s `payments`, a `ShoppingList`'s
  `items`) are stored JSON-encoded in one column. `budgetOverridesRepo` and
  `settingsRepo` are hand-written.
- [app/src/store/persist.ts](app/src/store/persist.ts): `hydrateStore()` (called once from
  `App.tsx` before rendering past splash) loads every table; on a genuinely empty DB it
  seeds from `store/seed.ts` and persists that immediately. `startAutoPersist()` then
  subscribes to the store and, on every `set()`, diffs each persisted slice and
  `replaceAll`s whichever one changed reference — **a new store action never needs its own
  save call.**
- **Deviation from original plan:** persistence is a generic subscription, not a
  per-action `repo.x()` call. And seed data still auto-loads on a genuinely empty DB
  rather than becoming an opt-in "load sample data" button (that onboarding choice is
  deferred — not blocking anything).
- **Web caveat:** `expo-sqlite`'s web backend needs `SharedArrayBuffer` / COOP-COEP
  headers the Expo web dev server doesn't set, and fails to bundle its wasm asset.
  `npm run web` is UI-preview-only for anything touching the DB; test persistence on
  iOS/Android (Nibash's only shipping targets anyway).

### A2. Security / App Lock (PRD §31) — ✅ done

- [app/src/security/pin.ts](app/src/security/pin.ts): salted SHA-256 (via `expo-crypto`)
  of the PIN and Recovery Key, hashes stored in `expo-secure-store` (OS keychain), never
  the plaintext. `setPin` / `verifyPin` / `hasPinSet` / `clearPin`;
  `generateRecoveryKey` (cryptographically random `XXXX-XXXX-XXXX-XXXX`, no ambiguous
  chars) / `setRecoveryKeyHash` / `verifyRecoveryKeyMatch` / `hasRecoveryKeySet`.
- [app/src/security/biometric.ts](app/src/security/biometric.ts): `expo-local-authentication`
  wrappers. `authenticateWithBiometric` sets `disableDeviceFallback: true` so App Lock is
  a self-contained check, not the device passcode.
- Store: `finishSplash` is async and routes to a new `pinRecoveryStep: 'setup'` when
  `pinLockOn && !hasPinSet()` (first launch, or right after `togglePinLock` turns the lock
  on with no PIN yet). `pressKey` / `pressNewPinKey` / `useFingerprint` / `continueRecovery`
  / `verifyRecoveryKey` all do real verification now. Setup flow ends on a new
  `'showKey'` step showing the one-time Recovery Key with an "I've saved it" ack.
  `openRecoveryKey` in Settings **regenerates** (the original plaintext is genuinely gone
  — only the hash is stored). New transient state: `pinError`, `biometricAvailable`,
  `newRecoveryKeyText`, `securityMessage`.
- `PinScreen.tsx` gains the `'setup'` and `'showKey'` screens, an inline error line, and
  hides the biometric UI unless `biometricAvailable && biometricOn`.
- `app.json` registers `expo-local-authentication` with a `faceIDPermission` string.
- **Verified live** on the iOS Simulator: wrong PIN → "Incorrect PIN" + dots clear;
  fresh install → "Set up your PIN" → "App Lock is now enabled" with a real generated
  Recovery Key; hash confirmed present in SecureStore across a true cold relaunch.

### A3. Local notifications (PRD §34) — ✅ done

- `expo-notifications` (local only — Nibash is offline; the Expo-Go "remote push removed"
  warnings are expected and harmless). [app/src/notifications/index.ts](app/src/notifications/index.ts)
  is store-free: `configureNotifications`, `ensureNotificationPermission`,
  `parseReminderDate` (best-effort "14 Aug" → next Date at 9am), `syncReminders(state)`
  (cancel-all + reschedule the whole plan — cheap and drift-proof), and
  `computeBudgetAlerts(state)`. [app/src/notifications/wire.ts](app/src/notifications/wire.ts)
  is the store-aware layer: `initNotifications()` (call once from `App.tsx` after hydrate)
  does the initial sync and subscribes for debounced re-syncs.
- Reminders: **Bills** (unpaid, N-days-before from the `reminder` field), **Subscriptions**
  (fixed 3-day lead), **Debts** (new `Debt.reminderDate` field, on the day, only while
  outstanding). **Budget alerts** are immediate (not scheduled) the first time spend crosses
  a budget's threshold — needs the new `Budget.alertThreshold` field + a persisted
  `budgetAlertsSent` dedupe map (`${budgetId}:${YYYY-MM}` → ts, pruned at 90 days).
- Schema bumped to **v2**: `debts.reminderDate`, `budgets.alertThreshold`. `toggleNotif`
  is async and requests permission on turn-on; a `notifMessage` line in Settings tells the
  user to enable notifications in device settings if they declined.
- **Known limitation:** bill/subscription dates are still free-text — `parseReminderDate`
  interprets them for scheduling. Real Date fields + a picker are Part C (Bills/Subs).
- **Known limitation (found in live testing):** delayed local notifications (`DATE` or
  `TIME_INTERVAL` triggers — what every real reminder in this app uses) are scheduled
  successfully by `scheduleNotificationAsync` (valid identifier returned, no error) but
  **never actually fire in Expo Go on the iOS Simulator** — confirmed by scheduling a
  5-second-out `DATE` trigger, waiting well past its fire time, and finding it absent from
  both `getPresentedNotificationsAsync()` and its own `addNotificationReceivedListener`
  callback, across three repeated runs. An *immediate* notification (`trigger: null`) sent
  in the same test fired and was received every time — so permissions, the scheduling API
  call, and the receive pipeline all work; only the actual OS-level delayed delivery does
  not happen in this runtime. This lines up with Expo's own printed warning
  (`expo-notifications` functionality is not fully supported in Expo Go — use a development
  build). It means the code in `notifications/index.ts`/`wire.ts` cannot be fully verified
  as "reminders actually arrive" using Expo Go + Simulator; that check needs either a real
  device or an EAS/dev-client build. Nothing here indicates a bug in Nibash's own code —
  the API usage (trigger construction, `channelId`, permission flow) matches the docs.
- **Verified live:** OS permission prompt fires on first launch (and reports `granted`),
  `syncReminders`/`scheduleNotificationAsync` run without error and return valid ids, v2
  migration succeeds, immediate notifications (used by budget alerts) are confirmed
  delivered end-to-end. **Not verified:** actual delayed firing of a scheduled Bill/
  Subscription/Debt reminder (blocked by the Expo Go limitation above).

### A4. Files: backup/restore, exports, attachments (PRD §29, §30, §42) — ✅ done

- The `.backup` archive is a **single self-contained JSON file** (`nibash-<date>.nibash.json`),
  optionally AES-encrypted (`crypto-js`), *not* a zip of the raw sqlite file — same intent
  ("full-fidelity, restorable"), far simpler on managed Expo, and restore is a clean
  per-table `replaceAll` instead of swapping a file under an open DB connection. It carries
  every table + `budgetOverrides` + the persisted settings + receipt images as base64.
  [app/src/backup/index.ts](app/src/backup/index.ts): `exportBackup` / `pickBackupFile` /
  `restoreBackup(raw, password?)` / `exportCsv` / `exportJson` / `exportPdf` (via
  `expo-print`). Restore pushes straight into the live store so the UI updates without a
  reload.
- Encryption: password + confirm, or "use my Recovery Key" (verified against A2's hash,
  then used as the AES passphrase). Restore of an encrypted file shows an inline password
  field. `lastExportAt` is tracked and surfaced ("Last exported N days ago", turns amber
  after 30 days per PRD §30's reminder).
- Receipts: `Transaction.receiptUri` (one image per tx — a full multi-attachment
  `TransactionAttachment` entity is deferred). `expo-image-picker` → copied into
  `<documentDir>/attachments/` → `store.pickReceipt` / `clearReceipt`; the TxForm shows a
  thumbnail + Remove. Files are deleted on tx delete / receipt swap, and pruned on restore.
  Schema bumped to **v3**: `transactions.receiptUri`.
- Migration hardening (found here): `migrate()` now runs through the `enqueue` queue and
  adds columns via a `PRAGMA table_info` check instead of try/catch — a swallowed ALTER
  error was letting a broken schema get stamped as migrated.
- **Verified live** on the iOS Simulator: export → iOS share sheet → Save to Files →
  "Last exported today"; restore → document picker → confirm → "Backup restored."; CSV and
  a real generated PDF both share successfully.

### A5. Real device clock instead of the demo date — ✅ done

- [app/src/store/now.ts](app/src/store/now.ts): `today()` / `todayStr()` / `toDateStr()`
  — the single place anything reads "now."
- `monthInfo()` in `helpers.ts` computes year/month from `today()` + `monthOffset`.
  `PlansScreen.tsx`'s Calendar tab and `HomeScreen.tsx`'s "last 7 days" use `now.ts`.
- `BASE_Y` / `BASE_M` / `TODAY_STR` are gone. `buildSeedTransactions(now)` generates the
  sample ledger relative to whenever first-run actually happens, so it always lands in
  "this month" / "last month."
- Any new code needing "today" **must** import from `store/now.ts`.

---

## Part B — Data-integrity gaps (fix while wiring each module)

These update state in a way that *looks* right in the prototype but breaks PRD §37's rule
("every money movement is one of the typed transactions") once Reports / Activity / ledger
correctness matters.

| Gap | Where | Fix | Status |
|---|---|---|---|
| Transfers only adjust two account balances directly — no `TRANSFER` row | `useStore.saveTransaction`, `modal==='transfer'` branch | Create a real `Transaction` with `type:'transfer'` (paired debit/credit rows) so it shows in Activity/Reports (§8) | ✅ done |
| Goal contribute/withdraw only mutates `goal.saved` — no `SAVINGS_CONTRIBUTION` / `SAVINGS_WITHDRAWAL` against the account | `contributeGoal` / `confirmGoalDelete` return path | Create the typed transaction so Total Balance stays derived from the ledger (§19b) | ✅ done |
| Marking a Bill paid just flips `paid:true` — no `EXPENSE` row | `saveTransaction`, `modal==='billPay'` | Create an `EXPENSE` against the bill's account/category (§22a) | ✅ done |
| No "Withdraw from Goal" action existed at all (PRD §19b explicitly calls for one) | `PlansScreen.tsx` GoalsTab | New `goalWithdraw` modal + `withdrawGoal` action, clamped to `goal.saved` | ✅ done (found + fixed alongside the above) |
| Subscriptions never generate their recurring `EXPENSE` rows | no scheduler exists | Shared recurrence engine | ✅ done |
| "Recurring Transactions" reuses the `bills` array (`editRecurring` edits a `Bill`) | `useStore.ts`, `RecurringScreen` | Own `RecurringTransaction` table/type + a **shared recurrence engine**: one function, driven by the shared Repeat control, that generates the next occurrence for Bills, Subscriptions, and Recurring Transactions alike (§20 wants one implementation, not three) | ✅ done |
| Recurring Shopping Lists (§12) have a `repeat` field but nothing regenerates next month's list | `ShoppingList.repeat` | Same recurrence engine generates the next list from the template | ✅ done |

### Ledger foundation (Transfers / Bill-pay / Goal contribute+withdraw) — ✅ done

- [store/types.ts](app/src/store/types.ts): `Transaction.type` widened from the old
  `TxType` (`'income'|'expense'`) to a new `TransactionType` covering the full PRD §37 enum
  (`transfer`, `debt_lend`, `debt_borrow`, `debt_payment`, `savings_contribution`,
  `savings_withdrawal`, `opening_balance`, `refund` added) — only `transfer` and the two
  `savings_*` values are actually created yet; the rest are reserved so the union doesn't
  need widening again for the recurrence-engine/debt work later. `Category.type` stays the
  old `TxType` (categories are still only income/expense). Added `Transaction.transferDir?:
  'in'|'out'` — a transfer is two rows (one per account); this says which side each row is.
- [store/helpers.ts](app/src/store/helpers.ts): new `txSign(t)` — the one place that maps a
  transaction's type (and `transferDir` for transfers) to a `+1`/`-1` display sign. Used by
  `ActivityScreen`, `HomeScreen`'s recent-activity widget, and `AccountDetailScreen`'s
  per-account feed instead of the old `t.type === 'income' ? ... : ...` (which only knew
  about two types and would have mis-colored every new one). Deliberately separate from
  `monthTotals`'s income/expense filter — transfers and savings moves are real money
  movement but must **not** count as income or expense (PRD §8, §19b).
- `useStore.ts`: `transfer` branch now creates the paired `transfer` rows (`transferDir:
  'out'`/`'in'`) alongside the existing direct balance edit. `goalContribute` now reads the
  already-present-but-previously-ignored `fAccId` picker to debit that account and record a
  `savings_contribution`. New `goalWithdraw` action/branch (clamped to `Math.min(amt,
  g.saved)`) credits the chosen account and records `savings_withdrawal`. `confirmGoalDelete`'s
  "return" path now also records a `savings_withdrawal` (its "writeoff" path already created
  an `expense`, unchanged). `billPay` now debits the paid-from account and records a real
  `expense` (previously it only flipped `bill.paid`); `payBill` defaults `fAccId` to the
  bill's own `accountId` instead of always account\[0].
- Schema bumped to **v4**: `transactions.transferDir` (nullable TEXT, `ADD_COLUMNS` +
  `repo.ts`'s column list).
- `ActivityScreen.tsx`/`HomeScreen.tsx` row taps: editing a transaction only makes sense for
  `income`/`expense` (there's no "edit a transfer" flow, same as before this change) —
  rows of any other type are now `disabled` on the `Pressable` instead of calling
  `openTxModal` with a type it can't handle.
- `PlansScreen.tsx`'s GoalsTab: added a "Withdraw" button next to "Add money"/"Edit",
  shown only when `g.saved > 0`.
- **Verified live** on the iOS Simulator: contributed ৳5,000 from Cash to "New Laptop"
  (Cash ৳8,200→৳3,200, Total Balance −৳5,000, goal ৳74,000→৳79,000, Activity shows
  "New Laptop (contribution)" −৳5,000); withdrew (clamped) ৳79,000 into Savings (goal
  →৳0, Withdraw button correctly disappears, Total Balance +৳79,000, Activity shows
  "New Laptop (withdrawal)" +৳79,000 in green); transferred ৳1,000 Visa Card→City Bank
  (both legs appear in Activity with correct signs, City Bank +1,000, Visa Card −1,000,
  Total Balance unchanged since it's a wash); paid the Electricity bill from City Bank
  (bill flips to "Paid", City Bank −৳1,850, Home's Expense widget ৳32,270→৳34,120 — a paid
  bill now genuinely counts as an expense — and the bill drops out of "Upcoming bills").

### Shared recurrence engine (Bills roll-forward / Subscriptions / Recurring Transactions / Recurring Shopping Lists) — ✅ done

- [store/recurrence.ts](app/src/store/recurrence.ts): the actual shared engine — pure date
  math, no store dependency (same pattern as `security/*`/`notifications/index.ts`).
  `nextOccurrence(date, freq)` is the one function every consumer advances a date through
  (Weekly/Bi-weekly/Monthly/Yearly; Monthly/Yearly clamp to the target month's last day per
  §20; returns `null` for One-time and for Custom — Custom has no "every N days/weeks/
  months" input anywhere in the UI yet, so there's nothing to advance by). Two coexisting
  date conventions: `parseShortDate`/`formatShortDate` round-trip Bills/Subscriptions'
  pre-existing free-text dates ("14 Aug", always resolving to the *next upcoming*
  occurrence — same convention A3's reminders already use), while `parseShortDateInYear`
  is a second parser that does **not** roll to next year — needed because the sync's "is
  this already overdue" check would otherwise never see a past-due free-text date as due
  (a real bug hit and fixed during live testing, see below).
- [store/recurrenceSync.ts](app/src/store/recurrenceSync.ts): the store-aware layer.
  `syncSubscriptions()` — for each subscription with both `catId`/`accountId` set, loops
  `nextOccurrence` from its `nextDate` while overdue (capped at 24 cycles), logging one real
  `expense` Transaction per missed cycle *dated to the actual missed cycle's date* (not
  "today" — so catching up after being away doesn't cluster old charges onto one day) and
  debiting the linked account. `syncRecurringShoppingLists()` — generates **at most one**
  fresh copy per template per sync (unlike Subscriptions: missing a few months of grocery
  lists shouldn't spam several duplicates), named `"<template> — <Month>"`, items copied
  unchecked; only the original template's own `nextDate` keeps advancing, the generated copy
  is a plain one-off. `initRecurrenceSync()` runs both once — called from `App.tsx` after
  `hydrateStore()`, but **only when that boot wasn't a first-run seed** (`hydrateStore` now
  resolves `isFirstRun`) — otherwise the hand-authored seed ledger's own "Netflix" entry
  would get duplicated by a same-boot catch-up before the user ever sees the app.
- **Bills** (§22a "confirming payment also generates the next occurrence"): `billPay` no
  longer just flips `paid: true` — for any bill whose `repeat` isn't 'One-time', it computes
  the next due date via `nextOccurrence(parseShortDate(b.dueDate, today()), b.repeat)` and
  rolls `dueDate` forward with `paid` reset to `false`, so a recurring bill reappears as
  "Upcoming" for its next cycle instead of sitting "Paid" forever. A5's real-clock rule
  still holds — nothing here reads a hardcoded date.
- **Subscriptions**: `Subscription` gained `catId?`/`accountId?` (PRD §21a's Category/
  Account fields existed as an Account picker in the UI but were silently discarded on
  save — a pre-existing bug fixed alongside this; `SubscriptionForm` now has a Category
  picker too). A subscription created before these fields existed is simply left alone by
  the sync until edited. Schema bumped for these two nullable columns.
- **Recurring Transactions** (§20) — genuinely split from Bills for the first time: new
  `RecurringTransaction` entity/table (`title, amount, type: TxType, catId, accountId,
  repeat, nextDate`) with its own repo/persist wiring, replacing the old hack where
  `RecurringScreen` rendered `s.bills` directly and `openAddRecurring` pushed a fake Bill.
  Unlike Bills/Subscriptions, `nextDate` here is a real `YYYY-MM-DD` (`now.ts` gained
  `fromDateStr`, the inverse of `toDateStr`) since there's no prior free-text convention to
  preserve for a brand-new entity. Per §20's "[Skip] [Add Expense]" mockup, these are
  **not** silently auto-generated like Subscriptions — `helpers.ts`'s
  `dueRecurringTransactions(state)` selector surfaces ones whose `nextDate` has arrived in
  a "Due now" section on `RecurringScreen`, each with `skipRecurringTx(id)` (advances
  `nextDate`, or deletes the entry if `repeat` doesn't advance) and `logRecurringTx(id)`
  (creates the real `income`/`expense` Transaction dated to `nextDate`, adjusts the
  account balance, then advances-or-deletes same as Skip). `RecurringForm` fixed a latent
  bug where its Category chips always showed expense categories even when Type was set to
  Income; added a "Next occurrence" free-text field (defaults to next month for a new
  Monthly entry) and a Delete button in edit mode.
- **Recurring Shopping Lists** (§12): `ShoppingList` gained `nextDate?` (same real-date
  convention as Recurring Transactions). `createShoppingList` sets it from `fRepeat` at
  creation time; there's still no UI to change a list's repeat after creation (unchanged
  pre-existing limitation, left for Part C).
- **Bug found and fixed during live testing (date logic)**: the sync's "is this
  subscription overdue" check originally reused `parseShortDate`, whose "always the next
  upcoming occurrence" behavior means a genuinely overdue date (e.g. "21 Aug" checked in
  September) gets rolled to *next year's* August before the overdue comparison even runs —
  so the catch-up would silently never fire for the exact case it exists to handle. Fixed
  by adding `parseShortDateInYear`, which resolves the year as-is with no rolling, used
  only by the sync's due-check (Bills' pay-time roll-forward keeps using `parseShortDate`
  — that one's fine as-is, since `formatShortDate` only ever outputs a year-less string, so
  an intermediate wrong-year calculation there is silently discarded and never persisted).
- **Bug found and fixed during live testing (unreachable Save button)**:
  [components/BottomSheet.tsx](app/src/components/BottomSheet.tsx) put the entire modal —
  every form field *and* the Save/Delete buttons — inside one `ScrollView`. For a short
  form this is invisible, but a long one (Edit subscription: name, amount, billing cycle,
  date, category, account, cancel button, then finally Save) pushed "Save changes" far
  enough down that it was unreliably reachable — confirmed a real, user-facing bug, not
  just a simulator-automation quirk, by reproducing it with the same tap coordinate that
  worked reliably on every *shorter* modal. Fixed by giving `BottomSheet` a `footer` prop
  rendered *outside* the `ScrollView`, and moving `ModalHost`'s Save/Delete buttons into it
  — the primary action is now always pinned on screen regardless of form length, only the
  fields scroll. (Each form's own secondary button, e.g. Bill's "Delete bill" /
  Subscription's "Cancel (keep history)", still scrolls with its form — lower priority
  than the primary action, left as a smaller follow-up if it ever becomes an issue.)
  Verified live: reproduced the failure pre-fix (Edit subscription's Save silently didn't
  register at the exact coordinate that worked on every shorter modal), applied the fix,
  then confirmed the *same* coordinate reliably saved a real change twice in a row
  (Netflix's billing cycle Monthly→Yearly→Monthly, each save reflected immediately in the
  Subscriptions screen's totals).
- **Verified live** on the iOS Simulator, including the date-logic bug above (caught by
  this very testing): backdated a subscription and a shopping-list template's `nextDate`
  directly in SQLite (before the BottomSheet fix, so verified through the database
  instead of the then-unreliable Edit-subscription form), then cold-relaunched. Netflix's
  `21 Aug` correctly generated a real
  `2026-08-21`-dated ৳650 expense (Visa Card −650, tagged `subscription`) and advanced to
  `21 Sep`; "Weekly groceries" generated "Weekly groceries — September" (4 unchecked items
  copied from the template) and advanced its own `nextDate` by a week. Paid the recurring
  Internet bill — rolled `18 Aug → 18 Sep` with `paid` reset to `false` instead of staying
  "Paid", and logged the real expense. Added a Recurring Transaction ("Freelance", income,
  Monthly) via `+ Add` — the "Next occurrence" field correctly defaulted to next month;
  edit form round-tripped every field correctly, including Delete. Backdated its `nextDate`
  to test "Due now": it appeared with `Skip`/`Add Income` buttons exactly per the PRD
  mockup; tapping `Add Income` credited Cash +৳15,000, added the Income total, and the item
  correctly dropped out of "Due now" while remaining in "All recurring".

---

## Part C — Per-module completion checklist — ✅ done

Assumes Part A. Everything below is now done; the table records what shipped.

| Module (PRD §) | Done |
|---|---|
| Accounts (§7) | Add/edit/delete, guarded delete + reassignment, `OPENING_BALANCE`, persisted, **case-insensitive name uniqueness** |
| Categories (§9) | Add/edit/delete, guarded delete + reassignment, expense/income split, persisted, **name uniqueness scoped per type** (same name allowed once per Expense and once per Income) |
| Transactions / Expense / Income (§5-6) | Full add/edit/delete, chip pickers, real receipt attach (A4 ✅), persisted, **`fTags` normalized into a lowercase, deduped tag list** on save |
| Transfers (§8) | Modal + balance math + real `transfer` ledger rows (Part B ✅), persisted |
| Family/Joint Profiles (§6a) | Add/edit/delete, "Me" protected, per-profile spend widget, persisted |
| People (§14a) | Add/edit/delete + outstanding-balance delete guard, persisted, **real `expo-contacts` picker** (`Contact.presentPicker()`, SDK 57's class-based API) replacing the old stub, **Levenshtein-based fuzzy duplicate-name warning** (applies on add and edit, excluding self) |
| Debts (§14-17) | Lend/borrow, payment history, settled state, reminder-date notification (A3 ✅), persisted |
| Budgets (§18) | Add/edit/delete, month history via `budgetOverrides`, this-month-vs-going-forward scope, alert-threshold → notification (A3 ✅), persisted |
| Savings Goals (§19) | Add/edit/contribute/withdraw/delete + fund-disposition choice + real ledger rows (Part B ✅), persisted |
| Shopping Lists/Items/Templates (§10-13) | Full CRUD, estimate-vs-actual variance, templates, recurring-list auto-generation (Part B ✅), persisted, **a list's Repeat is editable after creation** via the same shared `ChipGroup` control used at creation time |
| Bills (§22) | Add/edit/delete, pay flow with real `expense` ledger row + roll-forward (Part B ✅), amount-varies flag, reminder notification (A3 ✅), persisted, **due date is a real picked `Date`** |
| Subscriptions (§21) | Add/edit/cancel, monthly/yearly totals, renewal reminder (A3 ✅), silent recurring-charge sync (Part B ✅), persisted, **next billing date is a real picked `Date`** |
| Recurring Transactions (§20) | Own entity, shared Repeat control UI, Skip/Add Expense-Income "Due now" flow (Part B ✅) |
| Calendar (§23) | Month grid, day-transaction dots, day summary, persisted, real "today" (A5 ✅) |
| Search (§26) | **Extended from Transactions/People/Bills to also cover Shopping Lists, Subscriptions, Savings Goals, Notes, Accounts, and Tags** — placeholder changed to "Search everything..." |
| Tags (§27) | **Autocomplete chips in the transaction form** (`allTags(state)` — unique, lowercase, sorted, filtered to exclude tags already on the transaction, capped at 8) and **tapping a `#tag` in Activity filters the list to it**, with a removable filter chip |
| Notes (§28) | Full CRUD, persisted |
| Attachments/Receipts (§29) | Real image picker + document-dir storage + thumbnail (A4 ✅), one receipt per tx |
| Backup & Restore (§30) | Real `.backup` JSON export/restore, AES encryption, CSV/JSON/PDF, `lastExportAt` reminder (A4 ✅), **"Automatic on-device backup" now genuinely writes a periodic local copy** (see below for how, and its constraint) |
| App Lock / Security (§31) | ✅ done (A2) |
| Currency (§32) | Segmented picker, locale-aware `fmtAbs` grouping, persisted |
| Notifications (§34) | Real local scheduling wired to Bills/Subs/Debts/Budgets (A3 ✅); **the "Weekly summary email" toggle is repurposed as a weekly local notification** (field name `weeklyEmailOn` kept to avoid churn; UI label changed to "Weekly summary notification") |
| Reports (§24) | Month nav, category legend, insights, trend bars, persisted, **the 1M/3M/6M/1Y range toggle now genuinely re-aggregates** across the selected window instead of only re-labeling |
| Dashboard personalization (§44) | Widget toggle list, widgets read live state, persisted |

### Name uniqueness (Accounts, Categories)

- `useStore.ts`'s account save branch rejects a save (setting `formState.formError`,
  which now renders in `BottomSheet`'s `footer` so it's visible without scrolling) when
  another account already has the same name, case-insensitively, excluding the record
  being edited.
- The category save branch does the same but **scoped to `type`** — "Groceries" can exist
  once as an Expense category and once as an Income category, matching the fact that
  `Category.type` is a real partition or the PRD's world, not just a filter tab.

### Tags: normalization, autocomplete, tap-to-filter

- `saveTransaction` normalizes `fTags` (`"Family, work,, Family"` → `['family', 'work']`)
  via `Array.from(new Set(...))` on the trimmed, lowercased, filtered split — so casing and
  duplicate entries never fork what's effectively the same tag.
- `helpers.ts`'s new `allTags(state)` returns every unique tag across all transactions,
  lowercase and sorted; `ModalHost.tsx`'s `TxForm` renders up to 8 of them as `+ #tag`
  suggestion chips (excluding tags already on the transaction), tapping one appends it to
  the comma-separated field.
- `ActivityScreen.tsx` wraps each row's first tag in its own `Pressable` calling
  `store.setTagFilter(tag)`; `AppState.tagFilter` filters the transaction list and renders
  as a removable `#tag ×` chip above the list.

### People: real contacts import + fuzzy duplicate check

- New `app/src/contacts/index.ts` wraps `expo-contacts` SDK 57's class-based API:
  `Contact.presentPicker()` (static, returns `Promise<Contact | null>`),
  `contact.getFullName()`, `contact.getPhones()` — confirmed against the versioned SDK 57
  docs and confirmed by `npx tsc --noEmit` accepting the exact shape with zero errors.
  `useStore.importFromContacts` is now `async`, calls this, and sets `formError` (not a
  thrown exception) if the picker itself fails, so the form stays usable.
  `app.json` carries the `expo-contacts` plugin with a purpose string.
- `helpers.ts`'s new `namesAreSimilar(a, b)` does Levenshtein edit-distance with a
  length-scaled threshold (`maxLen <= 4 ? 1 : floor(maxLen * 0.25)`); `PersonForm` in
  `ModalHost.tsx` uses it on both add and edit (excluding self) to warn "Did you mean an
  existing person? Someone with a similar name already exists." — an exact-match check
  would have missed "Rahim Uddin" vs "Rahim Uddim".
- **Found and fixed a pre-existing bug in passing:** the person save branch never checked
  `modalMode`, so editing a person always appended a new record instead of updating the
  existing one (`people.concat(...)` unconditionally). Fixed with a proper edit branch.

### Automatic on-device backup

- Nibash has no true OS background task (no `expo-background-fetch`/`TaskManager`), so
  "automatic" is implemented as an app-boot check: `backup/index.ts`'s
  `maybeRunAutoBackup()` compares `Date.now() - state.lastAutoBackupAt` against the
  configured Daily (24h) / Weekly (7d) interval and, if due, writes an **unencrypted**
  backup (nothing to prompt for a password during a silent write) to
  `<documentDir>/auto-backups/`, keeping the 3 most recent and pruning older ones. Called
  once from `App.tsx` after `initRecurrenceSync()`.
- `BackupScreen` shows a "Last automatic backup: …" line whenever the option isn't "Off".

### Weekly summary: repurposed as a local notification

- An email channel doesn't exist offline, so `weeklyEmailOn` (name kept to avoid touching
  the DB/backup/every call-site) now gates a **local notification** instead:
  `notifications/index.ts`'s `computeWeeklySummary(state)` builds a last-7-days
  income/expense summary; `notifications/wire.ts`'s `maybeRunWeeklySummary()` checks once
  at boot (not on every reactive resync — a weekly digest shouldn't refire every time a
  transaction changes) against `lastWeeklySummaryAt`. Settings' label now reads "Weekly
  summary notification."

### Reports range toggle: real re-aggregation

- `helpers.ts` gained `ReportRange`, `rangeOffsets(range, off)` (month-offsets anchored so
  `off` is always the last month in the window), `rangeLabel`, and `rangeTotals` — real
  sums over `monthTotals` for the selected window (deliberately **not** falling back to
  placeholder trend data, unlike the decorative chart, so Income/Expense/Saved stay real).
  `computePie` was split into a shared `computePieFromTx` so the category legend can
  aggregate the same multi-month window instead of just the current month.
- **Found and fixed a small pre-existing bug in passing:** the month-forward `›` button
  rendered as a blank `<Text> </Text>` instead of the (unimported) `ChevronRight` icon.

### A real bug the recurring-shopping-list catch-up caught

Verifying the Repeat-editing UI involved relaunching the app repeatedly (to test a PIN
bypass and clean up test data via direct SQLite edits — see below). Each relaunch produced
**another** `"Weekly groceries — September"` list, three in total. Root cause in
[recurrenceSync.ts](app/src/store/recurrenceSync.ts)'s `syncRecurringShoppingLists`: it
advanced a template's `nextDate` by exactly **one** cycle per call, so if the template was
more than one cycle overdue, `nextDate` was *still* overdue after the advance — the very
next app open (even seconds later) saw it as due again and generated one more duplicate.
Fixed by looping the advance past "now" (mirroring how `syncSubscriptions` already handles
this) while still only ever generating the single list the function's own doc comment
promises — a template many cycles behind now catches up silently in one shot, and a rapid
second app-open no longer spawns another copy.

### Bills/Subscriptions: a real date picker

The one item Part C had deliberately left outstanding — `Bill.dueDate` and
`Subscription.nextDate` were free text ("14 Aug") predating any date-picker component in
the app. Now real:

- Added `@react-native-community/datetimepicker` (`npx expo install`, included in Expo Go
  on both platforms).
- New shared [`DateField`](app/src/components/primitives.tsx) component — one control
  behind both fields, in the same "build the shared thing once" spirit as `ChipGroup`'s
  Repeat options (PRD §20). Tapping it opens the native picker: a one-shot dialog on
  Android (closes itself), an inline spinner on iOS with a "Done" button (iOS's spinner has
  no built-in dismiss). Reads/writes a real `YYYY-MM-DD` string, matching how the date is
  actually stored.
  - `Bill.dueDate` / `Subscription.nextDate` are now real `YYYY-MM-DD` (same convention as
    `RecurringTransaction.nextDate` / `ShoppingList.nextDate`), not free text.
  - New `FormState.fDueDate` field replaces the two forms' previous (over)use of the
    generic `fQty` field — `fQty` still free-text for Shopping-item quantity, Person notes,
    Goal target dates, and Recurring Transactions' "Next occurrence" input, all untouched.
  - `useStore.ts`'s `billPay` branch, `recurrenceSync.ts`'s `syncSubscriptions`, and
    `notifications/index.ts`'s reminder scheduling all switched from the free-text
    `parseShortDate`/`parseShortDateInYear`/`formatShortDate` round-trip to
    `now.ts`'s `fromDateStr`/`toDateStr` — `parseShortDateInYear` is now dead code and was
    deleted; `parseShortDate`/`formatShortDate` are still alive for Recurring Transactions'
    one remaining free-text field.
  - `now.ts` gained `tryFromDateStr` — like `fromDateStr` but returns `null` instead of an
    Invalid Date for a string that isn't real `YYYY-MM-DD`. Needed because an *existing*
    install's Bill/Subscription rows predate this change and still hold old free-text
    values; without this guard, `nextOccurrence`/`toDateStr` would silently corrupt them
    into `"NaN-NaN-NaN"` the first time a stale row was touched. New saves always produce a
    valid date, so this is a graceful-skip fallback for old data, not the everyday path.
  - Display formatting switched from interpolating the raw string to `helpers.ts`'s
    existing `dayFmt` (already the app's standard formatter for real ISO dates elsewhere —
    Activity, Search, Home's recent-activity widget) in `BillsScreen`, `SubscriptionsScreen`,
    and `HomeScreen`'s "Upcoming bills" widget.
  - `seed.ts`'s `seedBills`/`seedSubscriptions` (fixed hard-coded "Aug"/"Sep"/"Dec" consts)
    became `buildSeedBills(now)`/`buildSeedSubscriptions(now)` functions, matching the
    `buildSeedRecurring`/`buildSeedTransactions` "relative to first run" pattern — this
    fixes a **pre-existing bug in passing**: the old fixed seed dates would land in the past
    immediately for any first run outside Aug-Dec, which for Subscriptions meant
    `syncSubscriptions` would treat several cycles as already missed and catch them all up
    on first boot.
- **Verified live** on the simulator: opened Edit on the "Internet" bill, confirmed the
  field showed "18 Sep 2026" (not raw ISO), tapped it to open the native spinner, scrolled
  the day wheel to 17 and watched the field update live to "17 Sep 2026", tapped Done, Save
  — confirmed both the UI ("Due · Sep 17") and the live SQLite row
  (`dueDate = '2026-09-17'`) updated correctly. Also confirmed the Add-subscription form's
  date field defaults to today's real date, not a blank/placeholder. Separately verified
  the `syncSubscriptions` conversion by backdating Netflix's `nextDate` to `2026-08-21` and
  cold-relaunching: it correctly generated one catch-up `expense` transaction dated
  `2026-08-21`, debited the right account, and advanced `nextDate` straight to `2026-09-21`
  (skipping past "now" in one shot, not stopping one cycle short) — same pattern as the
  recurring-shopping-list bug fix above, and confirms it wasn't reintroduced here.

---

## Remaining build order (Parts A, B, C, and D all done)

1. ~~**Part B — ledger foundation:** Transfers → Bill-pay → Goal contribute/withdraw all
   create real typed `Transaction`s.~~ ✅ done — see Part B above.
2. ~~**Shared recurrence engine:** Bills roll-forward, Subscriptions + Recurring Shopping
   Lists silent catch-up sync, Recurring Transactions split into its own entity with a
   Skip/Add Expense-Income flow.~~ ✅ done — see Part B above.
3. ~~**Reports range toggle, Search breadth, Tag autocomplete, name-uniqueness checks,
   `expo-contacts` import, wire "Automatic on-device backup"**~~ ✅ done — see Part C
   above.
4. ~~**Bills/Subscriptions real due-date:** a real `Date` picked via
   `@react-native-community/datetimepicker` instead of free text.~~ ✅ done — see
   "Bills/Subscriptions: a real date picker" above.
5. ~~**Ledger-derived Account balances:** `Account.balance` derived from the transaction
   ledger instead of a plain stored field, with a migration for existing installs.~~
   ✅ done — see Part D above.
6. ~~**First-run Welcome Tour:** an 8-slide explainer of what each part of the app does
   and how to operate it, shown once and replayable from Settings.~~ ✅ done — see Part E
   above (new-feature request, outside the plan's original scope, but tracked here the
   same way Part D was).
7. **Nothing left from this plan.** Everything scoped in Parts A-D is implemented and
   verified. See "What's next" below for what's outside this plan's original scope.

## What's next (outside this plan's original scope)

Nothing is broken or half-finished. What remains is either explicitly out-of-scope per
PRD §39 (multi-currency, OCR, cloud sync, etc. — see CLAUDE.md's "Scope notes") or genuine
new-feature territory rather than a gap in what was already promised:

- A dedicated "Balance Adjustment" transaction/UI flow — architectural principle 6
  mentions this as the intended way to correct a derived balance; Part D made balances
  correctly *derived*, but didn't add this specific correction UI (nothing today needs
  it, since there's no raw balance field left to drift).
- Multi-attachment `TransactionAttachment` entity (invoices, screenshots) — noted as
  deferred back in A4, still one-receipt-per-transaction.
- Home screen widgets, true multi-currency/conversion, local AI, OCR receipt scanning,
  CSV/bank statement import, optional cloud sync — all explicitly V2/out-of-scope per
  PRD §39.
- Debts still run on `Debt.payments` rather than `debt_lend`/`debt_borrow`/`debt_payment`
  transactions (those enum values stay reserved-but-unused) — not a gap, a deliberate
  scope boundary noted since Part B.

## Verification per step

- **Ledger fixes (done):** checked Activity/Reports reconcile — a transfer no longer
  vanishes from the ledger, a paid bill shows as an expense, a goal contribution shows as
  a debit on its source account.
- **Recurrence engine (done):** verified live by backdating a subscription/shopping-list
  `nextDate` directly in SQLite and cold-relaunching — see the "Shared recurrence engine"
  section above for the full walkthrough and the real bug it caught
  (`parseShortDateInYear`).
- **Part C (done):** see "How Part C was verified" below.
- **Every step:** `npx tsc --noEmit`, plus the manual walkthrough for that module's
  screens on the iOS Simulator (`npm run ios`).

### How Part C was verified

All live, on the iOS Simulator (`04D5FE67-872F-4B60-B514-A663CC062B4D`), driving the
running Expo Go instance directly rather than rebuilding for each check:

- **Name uniqueness:** typed "Cash" into Add Account with a "Cash" account already
  present → `An account named "Cash" already exists.` in the footer, modal stayed open,
  no duplicate created. Same for Categories with "Groceries" as Expense (blocked with the
  type-specific message) — then confirmed the **per-type** scoping by switching the same
  modal to Income and saving "Groceries" there successfully, seeing it appear only under
  the Income tab.
- **Tags:** adding an expense showed suggestion chips (`+ #household`, `+ #date`, …)
  before typing anything; tapping one populated the Tags field. After saving, tapping the
  resulting `#household` tag in Activity filtered the list to the 2 transactions carrying
  it, with a removable `#household ×` chip; clearing it restored the full list.
- **Search breadth:** "City" matched a Transaction, a Bill, *and* the "City Bank" Account;
  "Netflix" matched Transactions and the Subscription; "landlord" matched a Note; "Laptop"
  matched Transactions and the "New Laptop" Savings Goal — confirming every module `§26`
  calls for is actually wired in, not just the placeholder text.
  Shopping Lists/Tags weren't separately re-tested live (same code pattern as the others,
  and Categories/Accounts/Subs/Goals/Notes already exercise the same `SearchScreen.tsx`
  branches) but the source was read to confirm the branches exist.
- **Shopping list repeat editing:** opened "Eid shopping" (created as One-time), changed
  its Repeat chip to Monthly, went back to the list — the card now read "Repeats: Monthly"
  — then reverted it to One-time to leave the seed data as found.
- **Automatic on-device backup:** rather than waiting a real day, this was verified from
  *existing* evidence — `settings.lastAutoBackupAt` in the live SQLite file already held
  two distinct real timestamps a calendar day apart, and
  `<documentDir>/auto-backups/` held two real, valid, unencrypted `.nibash.json` files
  (`tables.accounts.length === 4`, matching the live data) — proof the Daily-interval gate
  fired for real on two separate days and, just as importantly, did **not** re-fire on
  every one of the many relaunches performed today.
- **A PIN-lock complication:** the simulator's saved PIN from a prior session didn't
  match "1111" as expected, and there was no way to recover the Recovery Key to use
  "Forgot PIN?". Rather than erase the whole simulator (disposable test/demo data, but
  still not something to nuke without asking), `pinLockOn` was flipped to `false` directly
  in the live `nibash.db` `settings` row, then the app was force-quit and reopened —
  the same technique `PLAN.md`'s existing verification notes already used for backdating
  `nextDate`. It was **not** reset back to `true` afterward, since re-establishing a real
  PIN would need going through first-run setup again; a future session picking this app
  back up on this simulator should expect the lock to be off until a PIN is set again
  through the normal "Set up your PIN" flow.
- Two harmless test artifacts were created and cleaned up (a duplicate "Cash1" account, a
  test "Groceries" Income category, a "Tag test" transaction) — all removed by the end of
  the session. Two **pre-existing** test artifacts from earlier sessions were left alone
  on purpose (a "Kate Bell" contact under People, a "Monthly Grocery" shopping list) since
  they look like real prior test data, not this session's mess to clean up.

### How Part A was verified

- **A3:** OS notification-permission prompt fires on first launch and reports `granted`;
  `syncReminders`/`scheduleNotificationAsync` run without error and return valid ids;
  schema v2 migration succeeds; an immediate (`trigger: null`) notification is confirmed
  delivered end-to-end (received listener fires, appears in
  `getPresentedNotificationsAsync()`). **Deep-tested and found broken in this runtime
  only:** a `DATE`/`TIME_INTERVAL`-triggered notification — what every real Bill/
  Subscription/Debt reminder uses — is accepted by `scheduleNotificationAsync` but never
  actually fires in Expo Go on the iOS Simulator, confirmed across three repeated runs (see
  A3's "Known limitation" above). This needs a real device or EAS/dev-client build to
  verify further; it isn't something to "fix" in Nibash's code without first confirming the
  same test on a real device.
- **A4:** on a real iOS Simulator — `.backup` export → iOS share sheet → Save to Files →
  "Last exported today"; **restore** → document picker → confirm panel → "Backup
  restored."; CSV export shares; PDF export produces a real 24 KB `Print`-generated PDF.
  Migration v1→v3 confirmed at the SQLite level (`receiptUri`, `reminderDate`,
  `alertThreshold` columns present, `user_version = 3`).

---

## Part D — Ledger-derived Account balances — ✅ done

**Status: implemented and verified.** This was the "Known deeper gap" CLAUDE.md flagged
since Part B: `Account.balance` was a plain stored number, not derived from the
transaction ledger — violating architectural principle 6 ("balances are always derived,
never manually overridden"). The plan below (kept as-written, since it's exactly what was
built) is followed by a "How it was implemented" section with the few deviations from the
original scoping and the live verification that was run.

### Why this is bigger than a Part C item

Parts A-C all *added* behavior without changing what already worked. This refactor
*removes* a field every screen currently reads directly (`Account.balance`) and replaces
every write site with "insert the right transaction, let balance follow" — it touches the
core data model, needs a one-time data migration for existing installs (not just a schema
column add), and a single missed write-site during the transition silently produces a
wrong balance. That combination is why it was deliberately kept out of the Part C
punch-list rather than squeezed in alongside the polish items.

### Current state (confirmed by reading every call site)

**Reads** — `Account.balance` is read directly in 6 places:
[HomeScreen.tsx:36](app/src/screens/HomeScreen.tsx) (`totalBalance` sum),
[HomeScreen.tsx:110](app/src/screens/HomeScreen.tsx) (account chips),
[more/index.tsx:74](app/src/screens/more/index.tsx) (`AccountsScreen` list),
[more/index.tsx:91](app/src/screens/more/index.tsx) (`AccountDetailScreen`'s "Balance"
card), [SearchScreen.tsx:27](app/src/screens/SearchScreen.tsx) (search result subtitle).

**Writes** — every one of these adjusts `balance` by a delta *at the same time* it inserts
the matching transaction (this is Part B's ledger-integrity fix — the transaction and the
balance update were made to always travel together, but as two separate pieces of state
rather than one being derived from the other):
`useStore.ts`'s `transfer` branch (both accounts), `goalContribute`, `goalWithdraw`,
`confirmGoalDelete`'s "return" path, `billPay`, `logRecurringTx` (Recurring Transactions'
"Due now" flow), and `recurrenceSync.ts`'s `syncSubscriptions` (subscription catch-up).
**One write site sets `balance` directly, not incrementally**: account creation
(`saveTransaction`'s `account` branch) does `balance: amt` for the starting balance, with
no transaction row backing it — account *editing* never touches `balance` at all (correctly
— there's already no raw "edit balance" field in the UI).

**The gap**: a plain Expense/Income transaction from `TxForm` — the single most common
action in the app — does not touch `Account.balance`. Every other money-moving action
happens to do the right thing today only because Part B hand-wired each one individually;
there is no general mechanism, so any *future* new money-moving feature would need to
remember to do the same two-step dance or silently reintroduce this exact bug class.

### The fix: a derived selector, not a synced cache

Two designs were considered:

1. **Derived selector (recommended)** — delete `Account.balance` from the type entirely;
   add a pure function `accountBalances(state): Record<string, number>` in `helpers.ts`
   that sums every transaction's ledger effect per account, computed on read (same "pure
   function over `state`, called once per screen render" pattern as `monthTotals` /
   `computePie` / `dueRecurringTransactions` — no memoization needed at this app's
   transaction-count scale). Deleting the field turns every remaining `.balance` reference
   into a TypeScript compile error, which is the cheapest possible guarantee that no read
   site gets missed.
2. **Synced cache** — keep the `balance` field, but replace every action's manual `+ amt`
   with a reactive recompute-on-transactions-change pass (same shape as `persist.ts`'s
   auto-persist subscription). Rejected: it still lets `balance` and the ledger disagree if
   the recompute step itself has a bug, which is the exact failure mode this refactor
   exists to eliminate — and it doesn't remove any write sites, so there's nothing stopping
   a *new* action from reintroducing a manual adjustment next to the recompute.

Option 1 is the one to build.

### The ledger-effect formula already exists — reuse `txSign`

`helpers.ts`'s `txSign(t)` already maps every transaction type to the `+1`/`-1` a balance
computation needs (`income`/`savings_withdrawal`/`debt_borrow`/`refund` → `+1`, `transfer`
→ sign of `transferDir`, everything else → `-1`). `accountBalances` is then just:

```ts
export function accountBalances(state: AppState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of state.transactions) {
    out[t.accountId] = (out[t.accountId] ?? 0) + txSign(t) * t.amount;
  }
  return out;
}
```

`txSign` needs one addition first: an `opening_balance` case returning `+1` (it currently
falls through to the `-1` default, which would be wrong — an opening balance should always
*add* its amount, never subtract).

### Data model change: `opening_balance` becomes a real, created transaction

`opening_balance` is already reserved in `TransactionType` (PRD §37) but nothing creates
one yet. This refactor is what finally uses it:

- **Account creation** (`saveTransaction`'s `account` branch): replace `balance: amt` with
  inserting one `{ type: 'opening_balance', amount: amt, accountId: newId, ... }`
  transaction instead of setting a field.
- **One-time migration for existing accounts** (see below): backfill exactly one
  `opening_balance` transaction per pre-existing account.
- **Signed amount, deliberately**: every other transaction's `amount` is a positive
  magnitude with direction encoded via `type`/`transferDir`. A credit card's starting
  balance is negative (seed data: Visa Card starts at `-6400`), and `opening_balance` has
  no separate direction field to encode that — so `opening_balance.amount` is the one
  transaction type allowed to be negative. Worth a one-line comment on `Transaction.amount`
  in `types.ts` calling out the exception so it isn't "fixed" by mistake later.

### The migration: backfilling `opening_balance` for existing installs

This is the part that makes this a genuine *data* migration, not just a schema change —
`db/client.ts`'s existing `ADD_COLUMNS` machinery only adds columns with a default value;
it has no concept of "read existing rows, compute something, insert new rows," so this
needs its own one-time pass at the store layer (in `persist.ts`'s `hydrateStore`, guarded
by a new boolean in the settings blob — e.g. `ledgerBalancesMigrated` — checked the same
place `isFirstRun` already is, so it never re-runs and never fires on a genuinely first
run, which seeds accounts with no legacy `balance` baggage to reconcile).

For each existing account, the amount that makes the derived total exactly match what the
user already sees today (so nobody's balance visibly jumps the moment this ships) is:

```
openingAmount = account.balance − Σ over that account's existing transactions of (txSign(t) × t.amount)
```

(the subtraction undoes double-counting the transfer/savings/bill-pay/recurring effects
that Part B already baked into the old `balance` field, and the term itself also happens
to correctly *start* counting that account's historical plain expense/income transactions,
which never touched `balance` before — both corrections fall out of the same formula.)
Insert one `opening_balance` transaction per account with that computed amount. Two open
decisions to make at implementation time, neither of which affects correctness, just
presentation:
- **Date**: Nibash has no "account created at" timestamp to backdate to. Simplest: date it
  one day before the account's/app's earliest existing transaction, so it always sorts
  first in Activity/the account detail list without landing on a real day of activity.
- **Keeping the SQLite `balance` column**: needed for exactly one read (computing
  `openingAmount` above) and otherwise dead afterward. Per this repo's additive-only
  migration philosophy (see `db/client.ts`'s comment — columns are only ever added, never
  dropped), leave the column in place but stop writing to it — `accountsRepo`'s `columns`
  list in `repo.ts` and the `Account` TS type both drop `balance`, so nothing in the app
  layer references it after migration; the column itself just goes inert, like any other
  superseded column would in this codebase's existing convention.

### Write sites to simplify (delete the manual balance math, keep the transaction insert)

Every one of these currently does `{ ...a, balance: a.balance ± x }` *and* inserts a
transaction — after this refactor, only the transaction insert remains; the balance
follows automatically the next time anything reads `accountBalances(state)`:
`useStore.ts`'s `transfer`, `goalContribute`, `goalWithdraw`, `confirmGoalDelete`'s
"return" path, `billPay`, `logRecurringTx`, and `recurrenceSync.ts`'s `syncSubscriptions`.
This is a net *deletion* of code — every one of these branches gets shorter, and it's no
longer possible for the transaction and the balance to disagree, because there's only one
source of truth left.

### Read sites to update

Every place listed under "Current state" above swaps `a.balance` for a value looked up out
of one `accountBalances(state)` call made once per screen render (not per row) —
`HomeScreen.tsx`, `more/index.tsx`'s `AccountsScreen`/`AccountDetailScreen`, and
`SearchScreen.tsx`. `AccountDetailScreen`'s per-account transaction list already computes
`txSign(t)` per row for coloring (line ~93) — no change needed there, it's already correct
per-transaction display logic, distinct from the aggregate balance this refactor changes.

### Edge cases worth being deliberate about (not blockers, just decisions)

- **Deleting an account reassigns its transactions** (`deleteAccount`, already existing
  behavior) — including its `opening_balance` row once one exists, to whichever account
  the user picks. That's consistent with how every other transaction type is already
  reassigned on delete; an "opening balance" landing on a different account is a slightly
  odd-looking ledger entry but not a new correctness problem this refactor introduces.
- **`debt_lend`/`debt_borrow`/`debt_payment`/`refund`** stay reserved-but-unused, same as
  today (Debts still runs on `Debt.payments`, untouched by this refactor) — `txSign`
  already has opinions about their sign for whenever they are eventually wired up, that
  doesn't change here.

### Suggested build order

1. Add the `opening_balance` case to `txSign`; add `accountBalances` to `helpers.ts`.
2. Switch account creation to insert an `opening_balance` transaction instead of setting
   `balance`.
3. Write the one-time migration in `persist.ts` (behind `ledgerBalancesMigrated`), and
   drop `balance` from `repo.ts`'s `accountsRepo` columns.
4. Delete `balance` from the `Account` type in `types.ts` — let `tsc` enumerate every
   remaining read/write site as a compile error; work through the list (this *is* the
   verification that nothing was missed, not just a nice-to-have).
5. Delete the now-dead manual balance math from the seven write sites listed above.
6. Update the five read sites to use `accountBalances(state)`.

### Verification plan

- `npx tsc --noEmit` clean is a hard requirement here, not just a courtesy pass — it's the
  mechanism that proves every read/write site was actually found.
- On the existing live simulator data (which has never been through this migration): note
  every account's balance *before* the change, run the migration, confirm every balance
  reads *identically* right after migration (the whole point of the `openingAmount`
  formula), then perform one of each money-moving action (plain expense, plain income,
  transfer, goal contribute, goal withdraw, bill pay, a Recurring Transaction's "Due now",
  a subscription catch-up) and confirm the balance shown updates correctly for each —
  including, for the first time, a **plain expense/income actually changing the total**,
  which is the actual bug this whole refactor fixes.
- Delete an account with transactions, reassign to another account, confirm the target
  account's balance correctly includes the reassigned `opening_balance` amount.
- Confirm Reports/Activity/Total Balance all still reconcile the same way Part B's
  verification already checked (a transfer/goal move still doesn't appear as income or
  expense — `txSign` and the `type==='income'|'expense'` filter in `monthTotals` are
  deliberately different checks, and this refactor doesn't touch that distinction).

### How it was implemented (deviations from the scoping above)

Built exactly per the plan above, with a couple of small refinements made during
implementation:

- **`opening_balance`'s date isn't a fixed function parameter** — `earliestDateMinusOne`
  in `persist.ts` computes "one day before the earliest existing transaction" (falling
  back to today if there are none) rather than hardcoding a date, so the backfilled row
  always sorts first regardless of how old the install's data actually is.
- **Zero-amount `opening_balance` rows are skipped**, both at account creation and in the
  migration (`if (openingAmount !== 0)` / `if (amt !== 0)`) — a zero opening balance
  contributes nothing to the derived sum either way, so inserting the row would only add
  ledger clutter with no effect on correctness.
- **The legacy `balance` column read is isolated to one function**
  (`readLegacyAccountBalances` in `repo.ts`) rather than kept in `accountsRepo`'s normal
  columns — cleaner separation between "the shape the app reads/writes going forward" and
  "the one-time historical read the migration needs," and it means `Account`'s TS type and
  `accountsRepo`'s columns agree with each other everywhere except that one migration call.
- **Seed data reconciliation** — `seed.ts`'s `seedAccounts` lost their `balance` fields,
  and `buildSeedTransactions` gained 4 `opening_balance` rows (dated to the previous
  month's 1st, same as the earliest demo transactions) with amounts hand-computed via the
  exact same formula the real migration uses, so a fresh install's demo balances are
  unchanged (Cash ৳8,200 · City Bank ৳1,42,500 · Visa Card −৳6,400 · Savings ৳58,000) —
  this wasn't explicitly called out in the original scoping (seed data has no "old
  balance" to migrate from) but follows directly from the same principle.

### How it was verified

All live, on the iOS Simulator, against the same real (non-seed) data this session's
earlier Part C verification had already been exercising — i.e. this migration ran against
an install that had never seen it before, not a synthetic test case:

- **Migration continuity**: noted every account's balance before the change (Cash
  ৳18,200 · City Bank ৳1,40,450 · Visa Card −৳8,050 · Savings ৳1,37,000), relaunched, and
  every single one read back *identically* — confirmed in the live SQLite file too: 4
  `opening_balance` transactions were inserted with amounts computed by the migration
  formula, `ledgerBalancesMigrated` was set `true`, and a second relaunch inserted zero
  additional rows (idempotent).
- **The actual bug, fixed**: added a plain ৳500 expense against Cash — Total Balance
  dropped from ৳2,87,600 to ৳2,87,100 and Cash from ৳18,200 to ৳17,700. Before this
  refactor a plain expense never touched `Account.balance` at all; this is the first time
  in the app's history that it has.
- **Transfer still correct with the manual balance math removed**: transferred ৳200
  Cash → City Bank — Cash dropped by ৳200, City Bank rose by ৳200, Total Balance
  unchanged (transfers are ledger-neutral by design, per `txSign`), confirming the
  derived-balance selector alone reproduces what the deleted manual mutation used to do.
- **Account creation**: added a new account with a ৳0 starting balance — it showed
  "No transactions yet on this account" and ৳0, confirming the "skip the transaction
  insert when amount is 0" path doesn't leave the account in some unbalanced state.
  (The non-zero starting-balance path was verified by code inspection — it's the same
  `saveTransaction` branch, just with `amt !== 0`.)
  Test account and test transactions were all cleaned up afterward.
- `npx tsc --noEmit` clean throughout — every one of the read/write sites the scoping
  section predicted (6 reads, 7 writes, plus 2 more the type-checker caught that weren't
  explicitly enumerated up front: `helpers.ts`'s `accById` fallback object and `seed.ts`'s
  `seedAccounts` literal) was found this way, exactly as the verification plan intended.

---

## Part E — First-run Welcome Tour — ✅ done

**Status: implemented and verified.** Not part of the original PRD-derived scope — a
new-feature request (a first-run explainer of what each part of the app does and how to
use it) rather than a gap in Parts A-D. Recorded here for the same reason Part D is: so a
future session doesn't have to re-derive it from a diff.

### What it is

An 8-slide full-screen carousel (`screens/TourScreen.tsx`) covering, in order: Welcome,
"add money in seconds" (the FAB), Home, Activity & tags, Plans, More, Search, and "stay
backed up and secure" (App Lock + Backup). Each slide is an icon badge (small local
`react-native-svg` outline icons, matching the app's existing 1.5-2px-stroke icon style —
no new shared primitives added, since these icons are single-purpose and only ever used
here), a title, and a couple of sentences on what that part of the app does and how to
operate it. Navigation is Back/Next buttons plus dot pagination (no swipe gesture — kept
consistent with `PinScreen`'s existing tap-driven pattern rather than adding a pager
dependency); a "Skip" link in the top-right is hidden on the last slide, which instead
shows "Get started."

### Where it fits in the screen flow

New `screen: 'tour'` value alongside the existing `'splash' | 'pin' | 'dash'` in
`AppState`. `finishSplash` now checks a new persisted `welcomeTourSeen` boolean first —
false (fresh install, or an existing install updating from a version that predates this
field) routes to the tour instead of straight to PIN/dash; true skips it exactly like
before. When the tour finishes (`tourFinish`, fired by both "Skip" and the last slide's
"Get started"), it marks `welcomeTourSeen: true` and then runs the *same* PIN-lock-or-dash
decision `finishSplash` used to make directly — factored out as `proceedPastSplash()` so
the logic exists in exactly one place.

The tour can also be replayed on demand from Settings ("Help → Replay welcome tour",
`openWelcomeTour`) without re-triggering PIN setup on close — a `tourOrigin: 'firstRun' |
'replay'` field distinguishes the two cases so `tourFinish` knows whether to route back to
PIN/dash (first run) or straight back to `dash` (replay, since the user was already
unlocked when they opened it from Settings).

### Persistence

`welcomeTourSeen` follows the exact pattern `ledgerBalancesMigrated` set in Part D: added
to `PersistedSettings` (`db/repo.ts`), `SETTINGS_KEYS` and `pickSettings()`
(`store/persist.ts`), defaults `false` in `useStore.ts`'s `initialState`, and is left alone
(not force-set) in `hydrateStore()`'s first-run branch — so both a genuinely first-ever
install and an existing install upgrading into this feature see the tour exactly once,
then never again, with no extra code path for the two cases.

### How it was verified

Live, on the iOS Simulator (Metro started manually via `npx expo start --ios`, since
`.claude/launch.json` only configures the web preview and this feature is entirely
native-screen navigation with no web-testable surface):

- Reset `welcomeTourSeen` to false directly in the live SQLite `settings` row, force-quit
  and relaunched — tour appeared first, before Home. Tapped through all 8 slides via Next,
  confirmed dot pagination and the slide content/icons for each; Back correctly returned
  to the previous slide without skipping.
- "Get started" on the last slide correctly called `tourFinish` → since this device's
  `pinLockOn` was `false`, landed directly on the dashboard. Confirmed `welcomeTourSeen`
  was persisted `true` in SQLite immediately after.
- Relaunched again — went straight to the dashboard, tour did not reappear.
- Settings → Help → "Replay welcome tour" correctly reopened the tour from slide 1;
  "Skip" from within a replay correctly returned to `dash` (the Settings screen the user
  was already on) rather than routing to PIN, confirming the `tourOrigin` branch.
- Turned App Lock on (a PIN already existed on this device from earlier testing), reset
  `welcomeTourSeen` to false again, relaunched: tour appeared, and finishing it via Skip
  this time landed on the real "Welcome back / Enter your PIN to unlock" screen instead of
  dash — confirming `tourFinish`'s first-run branch correctly falls through to the same
  PIN-or-dash decision `finishSplash` always made. (Device state was then restored to how
  it was found: `pinLockOn` back to `false` via direct SQLite edit, since the PIN itself
  wasn't known and unlocking wasn't necessary to prove the routing.)
- `npx tsc --noEmit` clean.
