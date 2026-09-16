# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

[PRD.md](PRD.md) is the product source of truth. The app itself lives in [app/](app/) — an Expo (React Native + TypeScript) project scaffolded from the `blank-typescript` template.

Originally built as a UI-complete prototype ported screen-for-screen from a Claude Design canvas (`Expense Tracker.dc.html`), now taken to a genuinely finished app per [PLAN.md](PLAN.md) (Part A: foundational infra, Part B: data-integrity fixes, Part C: per-module checklist). **Parts A, B, and C are all complete.** Status:
- Every screen/modal in the PRD's MVP scope (Section 38) is built and navigable — Splash, PIN lock + recovery, Dashboard, Activity, Plans (Lists/Budgets/Goals/Calendar), all "More" sub-screens, and ~24 modals.
- **Local SQLite persistence is wired up (plan's "A1")**: the Zustand store ([app/src/store/useStore.ts](app/src/store/useStore.ts)) hydrates from SQLite on boot and auto-persists every change — see "Persistence" below for how, and don't re-add per-action save calls, the mechanism is generic.
- **The hardcoded "August 2026" demo clock is gone (plan's "A5")**: month navigation (`monthInfo` in `store/helpers.ts`) and "today" (`store/now.ts`) are both computed from the real device clock now — there's no more `BASE_Y`/`BASE_M`/`TODAY_STR`. Sample data seeded on first run is generated relative to whenever that first run actually happens (`buildSeedTransactions(now)` in `store/seed.ts`), not tied to a fixed calendar month, so it always lands in "this month" and "last month" no matter when someone installs the app. Any new code needing "today" should import from `store/now.ts` rather than calling `new Date()` inline or hardcoding a date.
- **Real App Lock is wired up (plan's "A2")**: salted-SHA-256 PIN + Recovery Key hashes in `expo-secure-store`, real `expo-local-authentication` biometrics — see "Security" below. First launch routes to a "Set up your PIN" flow; wrong PINs are actually rejected now.
- **Local notifications are wired up (plan's "A3")** and **backup/restore/exports/attachments (plan's "A4")** — see "Notifications" and "Backup & files" below.
- **Part B is done**: Transfers, Bill-pay, and Goal contribute/withdraw all create real typed `Transaction` rows (`transfer`, `savings_contribution`, `savings_withdrawal`, plus the existing `expense`) instead of silently mutating balances/flags — see "Money movement" below. The shared recurrence engine also shipped: Bills roll forward, Subscriptions and Recurring Shopping Lists silently catch up missed cycles on boot, and Recurring Transactions is its own entity (not piggybacked on `bills` anymore) with a Skip/Add "Due now" flow.
- **Part C (per-module polish) is done**: Account/Category name uniqueness (the latter scoped per income/expense type), tag normalization + autocomplete + tap-to-filter in Activity, a real `expo-contacts` import with a Levenshtein-based fuzzy duplicate-name check for People, Search extended to every module, Reports' range toggle genuinely re-aggregating instead of just relabeling, and "Automatic on-device backup" actually writing periodic local copies. See [PLAN.md](PLAN.md)'s Part C section for the full list and how each was verified.
- **Bills/Subscriptions now have a real date picker**: `Bill.dueDate` / `Subscription.nextDate` are real `YYYY-MM-DD` (same convention as `RecurringTransaction`/`ShoppingList`), edited via the new shared `DateField` component ([app/src/components/primitives.tsx](app/src/components/primitives.tsx), wrapping `@react-native-community/datetimepicker`) instead of typed free text. See [PLAN.md](PLAN.md)'s "Bills/Subscriptions: a real date picker" for the full detail, including the `tryFromDateStr` graceful-fallback for pre-existing installs' old free-text data.
- **`Account.balance` is now ledger-derived, not a stored field**: removed entirely from the `Account` type — every balance is computed on read via `helpers.ts`'s `accountBalances(state)`, which sums `txSign(t) * t.amount` per account (an `opening_balance` transaction case was added to `txSign` for this). An existing install gets a one-time migration in `persist.ts` (gated by the `ledgerBalancesMigrated` setting) that backfills one `opening_balance` transaction per account so nobody's displayed balance jumps; a fresh install's seed data carries its own hand-computed `opening_balance` rows instead. This closes the "Known deeper gap" noted below — see [PLAN.md](PLAN.md)'s "Part D — Ledger-derived Account balances" for the full detail and how it was verified.
- **There's a first-run Welcome Tour** (new-feature work, outside the original PRD-derived plan): an 8-slide explainer (`screens/TourScreen.tsx`) of what each part of the app does and how to use it, shown once before PIN setup/dash on a genuinely first run (gated by a persisted `welcomeTourSeen` boolean, same pattern as `ledgerBalancesMigrated`) and replayable any time from Settings → Help → "Replay welcome tour". See [PLAN.md](PLAN.md)'s "Part E — First-run Welcome Tour" for the full detail.
- Repository is not yet a git repo; initialize it when the user asks.

No `.dc.html` design-canvas files should be treated as ongoing source of truth once a feature has been implemented from them — [app/src/](app/src/) and this file are what future sessions should read first.

## Persistence (`app/src/db/`)

- `client.ts` — opens the single `nibash.db` connection and runs schema migrations (`PRAGMA user_version`-gated; currently **v5**). Also exports `enqueue()`: **every** read/write to `db` must go through this queue — including `migrate()` itself. expo-sqlite's single native connection is not safe under overlapping `withTransactionAsync` calls — discovered live (see git-less history: this was debugged against a real iOS Simulator run) as "cannot start a transaction within a transaction" / "cannot rollback - no transaction is active" when e.g. the first-run seed fired 14 concurrent table writes. `enqueue` serializes everything so only one statement/transaction touches the connection at a time. If you add any new direct `db.*Async(...)` call, wrap it in `enqueue(...)` or route it through `repo.ts`'s `makeRepo`, which already does. **New columns:** add a `{ table, column, ddl }` entry to `ADD_COLUMNS` and bump `SCHEMA_VERSION` — the migrator checks `PRAGMA table_info` before each `ALTER`, so it's idempotent and never swallows a real error (a swallowed ALTER once let a broken schema get stamped as migrated).
- `repo.ts` — one repo per entity (`accountsRepo`, `transactionsRepo`, etc.) via a generic `makeRepo<T>({table, columns, jsonColumns, boolColumns})` factory: `getAll()` and `replaceAll(items)` (full delete+reinsert per table — correct and simple at this app's row counts; don't optimize to incremental diffing without a reason). Nested arrays (a `Debt`'s `payments`, a `ShoppingList`'s `items`) are stored JSON-encoded in one column rather than normalized into child tables. `budgetOverridesRepo` and `settingsRepo` are hand-written (not entity-shaped).
- `store/persist.ts` — `hydrateStore()` (call once at boot, before rendering past splash — see `App.tsx`) reads every table; on a genuinely empty DB it seeds from `store/seed.ts` and persists that immediately, otherwise it loads the persisted data. After hydration, `startAutoPersist()` subscribes to the Zustand store and diffs every persisted slice (accounts, categories, ..., transactions, and a `settings` bundle of currency/toggles/widgets) on every `set()` call, `replaceAll`-ing whichever slice's reference changed. **This means a new store action never needs its own persistence call** — if it returns a new array/object for a persisted field, it's saved automatically. Don't hand-roll a repo call inside an action; that would double-write and fight the subscription.

## Security / App Lock (`app/src/security/`)

- Auth material lives in `expo-secure-store` (OS keychain), **never** in `nibash.db` — hashes only, never the plaintext PIN or Recovery Key. `pin.ts` = salted SHA-256 (via `expo-crypto`) with `setPin`/`verifyPin`/`hasPinSet`/`clearPin` and `generateRecoveryKey`/`setRecoveryKeyHash`/`verifyRecoveryKeyMatch`/`hasRecoveryKeySet`. `biometric.ts` wraps `expo-local-authentication` with `disableDeviceFallback: true` (App Lock is self-contained, not the device passcode).
- The PIN screen's sub-mode is `store.pinRecoveryStep`: `null` = normal unlock, `'setup'` = first PIN ever (routed to when `pinLockOn && !hasPinSet()` — first launch, or right after `togglePinLock` arms the lock), `'showKey'` = one-time Recovery Key must be acknowledged, `'options'`/`'key'`/`'newpin'` = the "Forgot PIN?" steps. `finishSplash` is async and does the `hasPinSet()` check.
- The original Recovery Key plaintext is shown exactly once (at setup / on `'showKey'`); Settings' row is **"Regenerate recovery key"** because only the hash is stored — it can't be re-displayed, only rotated.
- Biometric UI (`Use fingerprint instead`, the recovery biometric option) only renders when `biometricAvailable && biometricOn`; `checkBiometricAvailability()` runs once from `App.tsx`.

## Notifications (`app/src/notifications/`)

- Local only (`expo-notifications`) — Nibash is offline; the Expo Go "remote push removed in SDK 53" warnings are expected and harmless.
- **Confirmed live limitation:** delayed triggers (`DATE`/`TIME_INTERVAL` — what every real Bill/Subscription/Debt reminder uses) are accepted by `scheduleNotificationAsync` (valid id, no error) but never actually fire in Expo Go on the iOS Simulator; an immediate (`trigger: null`) notification fires and is received correctly in the same environment, so permissions/scheduling/receive-pipeline code is not at fault. Don't try to "fix" this in app code — verifying real delayed delivery needs a real device or an EAS/dev-client build. See PLAN.md's A3 section for the repro.
- `index.ts` is **store-free** (takes state as a param, like `security/*`): `configureNotifications`, `ensureNotificationPermission`, `parseReminderDate` (best-effort free-text "14 Aug" → next Date at 9am — bill/sub dates are still strings), `syncReminders(state)` (cancels everything and reschedules the whole plan — cheap, drift-proof; no-ops when `notifOn` is false), `computeBudgetAlerts(state)`.
- `wire.ts` is the store-aware layer: `initNotifications()` (call once from `App.tsx` after hydrate) does the first sync and subscribes for debounced re-syncs when bills/subs/debts/budgets/transactions/`notifOn`/currency change.
- Reminders come from: unpaid **Bills** (`reminder` field → N days before), **Subscriptions** (fixed 3-day lead), **Debts** (`Debt.reminderDate`, on the day, while outstanding). **Budget alerts** are *immediate* (not scheduled) the first time spend crosses `Budget.alertThreshold` — deduped via the persisted `budgetAlertsSent` map (`${budgetId}:${YYYY-MM}` → ts).

## Money movement / ledger (`store/types.ts`, `store/helpers.ts`, `useStore.ts`)

- `Transaction.type` is `TransactionType` (not the old `TxType`), the full PRD §37 enum:
  `income | expense | transfer | debt_lend | debt_borrow | debt_payment |
  savings_contribution | savings_withdrawal | opening_balance | refund`. Only `income`,
  `expense`, `transfer`, and the two `savings_*` values are actually created anywhere yet —
  the rest are reserved (Debts still uses its own `Debt.payments` history instead of
  `debt_*` transactions, and account creation still stores a raw starting `balance` instead
  of an `opening_balance` row). `Category.type` is unaffected — categories are still only
  ever `'income' | 'expense'` (that's still `TxType`).
- A transfer is **two rows**, one per account, both `type: 'transfer'`, distinguished by
  `Transaction.transferDir: 'in' | 'out'` — there's no single row that references both
  accounts. Every other type is single-row.
- **`helpers.ts`'s `txSign(t)`** is the one place that maps a transaction to `+1`/`-1` for
  *display* (Activity row color/sign, day/account net totals) — it is deliberately separate
  from `monthTotals`'s `type==='income'|'expense'` filter, because transfers and savings
  moves are real money movement but must never count toward Income/Expense totals (PRD §8
  says a transfer "should not become an expense"; §19b says the same for savings moves).
  Any new UI that renders a transaction's amount/color must go through `txSign`, not
  `type === 'income'`, or it will misrender every non-income/expense row as a debit.
- Money-moving actions in `useStore.ts` (`saveTransaction`'s `transfer`/`goalContribute`/
  `goalWithdraw`/`billPay` branches, plus `confirmGoalDelete`'s "return" path) only need to
  push the right typed `Transaction` row(s) now — no separate balance mutation. Account
  balance is **derived**, not stored (see below), so inserting the transaction is the
  complete effect; skipping it is the only way to reintroduce Part B's original bug now.
- **Fixed (Part D): `Account.balance` is ledger-derived, not a stored field.** The
  `balance` field was removed from `Account` entirely — `helpers.ts`'s
  `accountBalances(state)` computes every account's balance on read by summing
  `txSign(t) * t.amount` over its transactions. Every account's starting balance is (or
  was backfilled to be, for an existing install — see `persist.ts`'s one-time migration
  gated by `ledgerBalancesMigrated`) its own `opening_balance` transaction — `txSign` maps
  that type to `+1`. `opening_balance.amount` is the **one exception** to "amounts are
  always a positive magnitude": a credit card's starting balance is negative, and
  `opening_balance` has no separate direction field to encode that. Full detail (exact
  read/write sites, the migration formula, live verification) in [PLAN.md](PLAN.md)'s
  "Part D — Ledger-derived Account balances."
- Rows created by these flows use an empty `catId: ''` (no real category applies to a
  transfer or a savings move) — `catById`'s fallback (`{ name: '—', color: 'neutral500' }`)
  handles that gracefully in every list that shows a category subtitle.

## Backup & files (`app/src/backup/`)

- The `.backup` archive is a **single self-contained JSON file** (`nibash-<date>.nibash.json`), optionally AES-encrypted with `crypto-js` — *not* a zip of the raw sqlite file. It carries every table + `budgetOverrides` + persisted settings + receipt images as base64. Restore = per-table `repo.replaceAll` + push into the live store (no reload). `index.ts`: `exportBackup` / `pickBackupFile` / `restoreBackup(raw, password?)` / `exportCsv` / `exportJson` / `exportPdf` (via `expo-print`). `useStore` imports this **lazily** (`require`) to avoid a cycle.
- Encryption passphrase is either the password+confirm fields or the user's Recovery Key (verified against A2's hash first). `lastExportAt` is tracked and surfaced on the Backup screen.
- Receipts: `Transaction.receiptUri` (one image per tx). `attachments.ts` (`expo-image-picker` + `expo-file-system`'s new `File`/`Directory`/`Paths` API — v57, not the legacy API) copies picks into `<documentDir>/attachments/`; `store.pickReceipt` / `clearReceipt`, thumbnail in `TxForm`. Files are deleted on tx delete / receipt swap and pruned on restore.
- `expo-secure-store` / `expo-file-system` / `expo-image-picker` / `expo-notifications` are all **native-only** in the same way `expo-sqlite` is — `npm run web` can't exercise any of A2–A4.

## Commands (run from `app/`)

```bash
npm install          # install dependencies
npm run ios          # open in iOS Simulator (via Expo)
npm run android       # open in Android emulator
npm run web           # run in browser — fastest loop for UI-only changes
npx tsc --noEmit      # typecheck (no test suite or lint config yet)
```

There is no dev server config at the repo root for the Browser-preview tooling; `.claude/launch.json` at the repo root runs `cd app && npm run web`.

## What Nibash is

A private, **100% offline** personal finance app (iOS & Android) for an individual/household user — expense/income tracking, budgets, shopping lists, debt tracking, savings goals, bills, subscriptions, and backup/restore, all backed by local SQLite. No login, no cloud sync, no backend, no analytics. Target market is Bangladesh-first (BDT/৳, bKash/Nagad mobile wallets, Bangla + English mixed text).

Read [PRD.md](PRD.md) in full before implementing any feature — it is the source of truth for every screen, field, and edge case (deletion guards, empty states, validation rules). The summary below only covers the cross-cutting architectural decisions that matter across many files/features, so you don't have to re-derive them from scratch each session.

## Tech stack (recommended in the PRD, Section 40)

**React Native + Expo + SQLite** — chosen over Flutter/Drift or native Swift/Kotlin because the target developer has a web background. Expo + TypeScript is scaffolded in [app/](app/); SQLite persistence is wired up via `expo-sqlite` (see Persistence below) — **native only**, `expo-sqlite`'s web backend needs `SharedArrayBuffer`/COOP-COEP headers the Expo web dev server doesn't set and fails to bundle its wasm asset, so `npm run web` is UI-preview-only for anything touching the database (fine — Nibash targets iOS/Android per the PRD, web was never a shipping target).

## App structure (`app/src/`)

- `theme.ts` — design tokens ported from the Expense Tracker canvas's dark theme (matches PRD Section 48b/48c colors: teal primary, gold accent, income/expense/warning semantic colors).
- `store/` — `types.ts` (entity shapes), `seed.ts` (mock data matching Section 36's entities), `helpers.ts` (pure formatting/date/lookup functions — `fmtAbs` already implements lakh-crore grouping per Section 48g), `useStore.ts` (the single Zustand store: all app state + every action, e.g. `saveTransaction`, `deleteAccount`, `toggleShoppingItem`).
- `components/` — shared primitives (`primitives.tsx`: Card, ListRow, ChipGroup, ProgressBar, TextField, DateField (native date picker, wraps `@react-native-community/datetimepicker`), buttons, icons), `charts.tsx` (Donut/Sparkline/BarChart via `react-native-svg`), `Shell.tsx` (bottom nav + FAB menu), `BottomSheet.tsx` (modal container).
- `screens/` — one file per top-level screen (`HomeScreen`, `ActivityScreen`, `SearchScreen`, `PlansScreen`), plus `screens/more/index.tsx` holding all ~14 "More" sub-screens (Accounts, Categories, Debts & People, Bills, Settings, etc.) since they share the same header/list/card patterns.
- `modals/ModalHost.tsx` — every Add/Edit/Delete/Confirm modal (~24), switched on `store.modal`, sharing one `BottomSheet` + form-field vocabulary (`AmountField`, `ChipGroup`, `RadioDot`). `BottomSheet` takes a `footer` prop (Save/Delete buttons) rendered *outside* its `ScrollView` — found live as a real bug: a long form (Edit subscription) pushed its Save button far enough down to be unreliably reachable when it was scrollable content like everything else. Any new modal's primary action goes in `footer`, never as a scrollable child, or it risks the same bug for that form.
- `App.tsx` — top-level switch on `store.screen` (splash/pin/tour/dash) and `store.dash` (which screen renders inside the bottom-nav shell).

When adding a feature, follow this same pattern: extend `types.ts` + `seed.ts` + the relevant `useStore.ts` actions first (mirroring PRD Section 36/37), then build the screen/modal from the shared primitives rather than one-off styles.

## Core architectural principles (apply to every feature)

1. **Offline-only, local-first.** No feature may require a network request. All state lives in local SQLite + local files + local preferences + local notifications (Section 40–41).
2. **Single global currency**, not per-account/per-transaction (Section 32). Currency conversion is explicitly out of scope until V2 (Section 33) — don't build rate-conversion logic.
3. **Locale-aware number formatting, not currency-aware.** BDT uses lakh-crore grouping (৳1,25,450), not Western 3-digit grouping. This must be a single shared formatting utility used everywhere money is displayed (Section 48g) — never format numbers per-screen.
4. **Soft-delete/archive everywhere**, not hard delete. Accounts, Categories, Family Profiles, People, and Budgets all use a guarded delete pattern: if the entity has history (transactions, debts, budgets), the user must choose to reassign/reference-clear or explicitly cascade-delete; the underlying record is archived, not destroyed, so Backup/Restore can recover it. Implement this once as a shared pattern, not per-entity.
5. **One shared "Repeat" control** (One-time / Weekly / Bi-weekly / Monthly / Yearly / Custom) used identically by Recurring Transactions, Shopping Lists, Subscriptions, and Bills (Section 20). Build it once; every recurrence picker in the app renders this same component with the same options in the same order.
6. **Balances are always derived, never manually overridden.** An account's balance is computed from its transaction ledger (including an `OPENING_BALANCE` transaction for the starting balance). To correct a balance, the user adds a Balance Adjustment transaction — there is no raw "edit balance" field anywhere.
7. **Money movement is modeled through a closed transaction-type enum** (Section 37): `INCOME, EXPENSE, TRANSFER, DEBT_LEND, DEBT_BORROW, DEBT_PAYMENT, SAVINGS_CONTRIBUTION, SAVINGS_WITHDRAWAL, OPENING_BALANCE, REFUND`. Every feature that moves money (transfers, lending, savings goal contributions, account transfers) must create one of these typed transactions rather than a bespoke side-table update — this is what keeps Total Balance and Reports accurate across features.
8. **Family/Joint Profiles are an attribution label, not multi-user.** Still one person, one device, one database (Section 6a). `profileId` on a Transaction is optional and defaults to "Me" — never make it a required extra step in the fast-entry flow (<10s add-expense goal, Section 2).
9. **Debts/lending reference a `Person` entity**, never a free-text name field (Section 14a, 17) — this is what makes per-person debt history and duplicate-name warnings possible.

## Data model

See Section 36 of the PRD for the full entity list and Section 37 for the transaction-type enum. Key relationships:
- `Account` → Transactions, RecurringTransactions, Subscriptions, Bills
- `Category` → Transactions, and at most one active `Budget`
- `Person` → `Debt` → `DebtPayment`
- `SavingsGoal` → contributions/withdrawals, modeled as `SAVINGS_CONTRIBUTION`/`SAVINGS_WITHDRAWAL` transactions against a real Account (so saved money isn't double-counted as both "in Cash" and "saved")
- `FamilyProfile` → Transactions (optional attribution)

## Backup format (Section 42)

Custom `.backup` archive (optionally password-encrypted): `manifest.json` + `database.sqlite` + `attachments/`. This is distinct from CSV/JSON/PDF exports, which are plain unencrypted data dumps for analysis, not restorable backups.

## Design system (Section 48) — do not invent ad hoc styles

- Brand: Primary teal `#16443C`, Secondary gold `#D9A441`, cream `#F5EFE6`. Gold is an accent (CTAs, savings motif) — never a competing primary.
- Semantic colors carry fixed meaning app-wide: green `#2E7D32` = income/positive/under-budget, red `#C0392B` = expense/negative/over-budget/overdue. Never rely on color alone — always pair with a `+`/`−` prefix or icon direction for colorblind accessibility.
- Dark mode is required, not optional; brand colors stay fixed across modes, only background/text/border surfaces flip.
- Typography: Inter (or system default) + **Noto Sans Bengali is required**, not optional — mixed Bangla/English strings (e.g. a name plus a Bangla note) are a normal input and must render without baseline/glyph issues.
- Emoji are acceptable only for category icons; everywhere else (nav, system UI, buttons) uses an outline icon set, 1.5–2px stroke.
- 8px spacing grid; flat elevation (hairline borders, not drop shadows) — the app should feel calm, not "glossy fintech."

## Scope notes

- MVP (Section 38) is the **full feature set** — no phased rollout — but build in dependency order regardless: Accounts → Categories → Transactions → Transfers before anything that depends on them (Budgets, Reports); People before Debts; the shared Repeat control before any of its four consumers.
- V2/out-of-scope for now (Section 39): home screen widgets, true multi-currency/conversion, local AI, OCR receipt scanning, CSV/bank statement import, optional cloud sync. Do not build toward these speculatively.
