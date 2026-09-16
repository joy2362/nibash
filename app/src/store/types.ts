export type TxType = 'income' | 'expense';

/** The closed transaction-type enum (PRD §37) — every feature that moves real
 * money must create one of these rather than a bespoke side-table update, so
 * Total Balance/Reports/Activity stay accurate across features. Only
 * income/expense/transfer/savings_contribution/savings_withdrawal are wired
 * up so far (Part B); debt_lend/debt_borrow/debt_payment/opening_balance/
 * refund are reserved for later work (Debts currently uses its own
 * `Debt.payments` history instead, and account creation still stores a raw
 * starting `balance`) — don't remove them or code will need to widen the
 * union again later. */
export type TransactionType =
  | 'income' | 'expense' | 'transfer'
  | 'debt_lend' | 'debt_borrow' | 'debt_payment'
  | 'savings_contribution' | 'savings_withdrawal'
  | 'opening_balance' | 'refund';

export interface Account {
  id: string;
  name: string;
  type: 'Cash' | 'Bank' | 'Credit card' | 'Wallet' | 'Other';
  /** No stored balance field — an account's balance is always derived from
   * its ledger (principle 6). See `helpers.ts`'s `accountBalances(state)`
   * and this account's `opening_balance` transaction (created once, at
   * account-creation time or by the one-time migration in `persist.ts` for
   * accounts that predate this). */
  includeInTotal: boolean;
  creditLimit?: number;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  color: string; // key into colors, e.g. 'accent500'
}

export interface Profile {
  id: string;
  name: string;
  relationship: string;
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  note: string;
}

export interface DebtPayment {
  date: string;
  amount: number;
}

export interface Debt {
  id: string;
  personId: string;
  direction: 'owe' | 'owed';
  original: number;
  payments: DebtPayment[];
  reminderDate?: string; // free text e.g. "20 Aug"; A3 best-effort parses it
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  /** Real `YYYY-MM-DD` (see `now.ts`'s `toDateStr`/`fromDateStr`) — picked via
   * the shared `DateField` component, not typed free text. */
  dueDate: string;
  repeat: string;
  catId: string;
  accountId: string;
  paid: boolean;
  amountVaries?: boolean;
  reminder?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  cycle: string;
  /** Real `YYYY-MM-DD` (see `now.ts`'s `toDateStr`/`fromDateStr`) — picked via
   * the shared `DateField` component, not typed free text. */
  nextDate: string;
  /** Which category/account each auto-generated billing-cycle `expense`
   * lands against (PRD §21a). Optional only because subscriptions created
   * before this field existed may not have one yet — the recurrence sync
   * skips generating for a subscription until both are set. */
  catId?: string;
  accountId?: string;
}

/** A standalone recurring money movement (PRD §20) — Salary, Rent, etc. —
 * distinct from Bills (always an expense against a due date) and
 * Subscriptions (always an expense billing cycle). Unlike those two
 * free-text-dated entities, `nextDate` here is a real `YYYY-MM-DD` (see
 * `store/now.ts`'s `toDateStr`/`fromDateStr`) since there's no prior
 * free-text convention to preserve for a brand-new entity. */
export interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  type: TxType;
  catId: string;
  accountId: string;
  repeat: string;
  nextDate: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  targetDate: string;
}

export interface Budget {
  id: string;
  catId: string;
  amount: number;
  alertThreshold?: number; // percent (e.g. 80); undefined = alerts off for this budget
}

export interface ShoppingItem {
  id: string;
  name: string;
  qty: string;
  price: number;
  checked: boolean;
  actualPrice?: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  budget: number;
  items: ShoppingItem[];
  repeat?: string;
  /** Real `YYYY-MM-DD` — when this template should next auto-generate a
   * fresh copy of itself (PRD §12). Only meaningful when `repeat` is set to
   * something other than 'One-time'. */
  nextDate?: string;
}

export interface ShoppingTemplate {
  id: string;
  name: string;
  items: { name: string; qty: string }[];
}

export interface Note {
  id: string;
  text: string;
}

export interface Transaction {
  id: string;
  title: string;
  catId: string;
  accountId: string;
  type: TransactionType;
  /** A positive magnitude for every type except `opening_balance` — that one
   * has no separate direction field, so a credit card's negative starting
   * balance has to be encoded as a negative `amount` here. Every other type
   * encodes direction via `type`/`transferDir` and `helpers.ts`'s `txSign`,
   * and must stay a positive magnitude. */
  amount: number;
  date: string; // YYYY-MM-DD
  tags: string[];
  profileId: string;
  /** Only set (and only meaningful) when `type === 'transfer'` — a transfer
   * is recorded as two rows, one per account, and this says whether *this*
   * row's account is the one money left ('out') or arrived at ('in'). See
   * `txSign()` in helpers.ts. */
  transferDir?: 'in' | 'out';
  /** file:// URI of an attached receipt image in the app document dir, or
   * undefined. One receipt per transaction for MVP — a full multi-attachment
   * `TransactionAttachment` entity (invoices, screenshots) is deferred. */
  receiptUri?: string;
}

export type ModalKind =
  | 'expense' | 'income' | 'transfer' | 'debt' | 'shoppingItem' | 'debtPayment'
  | 'account' | 'category' | 'profile' | 'person' | 'budget' | 'goal'
  | 'goalContribute' | 'goalWithdraw' | 'goalDelete' | 'bill' | 'billPay' | 'subscription'
  | 'recurring' | 'recoveryKey' | 'monthPicker' | 'confirmDelete'
  | 'newShoppingList' | 'templatePicker' | 'shoppingCheck' | null;

export type DashKey =
  | 'home' | 'activity' | 'search' | 'plans' | 'plansShoppingDetail'
  | 'more' | 'moreAccounts' | 'moreAccountDetail' | 'moreCategories'
  | 'moreProfiles' | 'moreDebts' | 'morePersonDetail' | 'moreDebtDetail'
  | 'moreBills' | 'moreSubscriptions' | 'moreRecurring' | 'moreReports'
  | 'moreNotes' | 'moreBackup' | 'moreSettings';

export interface Widgets {
  balance: boolean;
  incomeExpense: boolean;
  budget: boolean;
  bills: boolean;
  debts: boolean;
  shopping: boolean;
  goals: boolean;
  subscriptions: boolean;
  profile: boolean;
  recent: boolean;
}

export interface FormState {
  fAmount: string;
  fTitle: string;
  fTags: string;
  fQty: string;
  fPhone: string;
  fCatId: string | null;
  fAccId: string | null;
  fProfileId: string | null;
  fDebtDirection: 'owe' | 'owed';
  fDebtPersonId: string | null;
  fTransferFrom: string | null;
  fTransferTo: string | null;
  fShoppingListId: string | null;
  fAccountType: Account['type'];
  fAccountIncludeTotal: boolean;
  fAccountCreditLimit: string;
  fCategoryType: TxType;
  fRelationship: string;
  fRepeat: string;
  fAlertPct: string;
  fBudgetCatId: string | null;
  fRecurringType: TxType;
  fBillAmountVaries: boolean;
  fBillReminder: string;
  /** Bill.dueDate / Subscription.nextDate while a modal is open — a real
   * `YYYY-MM-DD` (see `now.ts`), picked via the shared `DateField` component
   * rather than typed as free text. */
  fDueDate: string;
  fDebtReminderDate: string;
  fReceiptUri: string;
  fApplyScope: 'going' | 'month';
  /** Blocking validation message for the currently open modal (e.g. a
   * duplicate Account/Category name) — cleared automatically by
   * `resetForm()` whenever a modal opens. Rendered in the sheet's footer, so
   * it's visible without scrolling regardless of form length. */
  formError: string;
}

export interface AppState extends FormState {
  screen: 'splash' | 'pin' | 'tour' | 'dash';
  /** Whether the first-run/what's-new welcome tour has been shown. Persisted
   * setting, defaults false — an existing install updating to a version that
   * added this field sees the tour once too, same as a fresh install. */
  welcomeTourSeen: boolean;
  tourStep: number;
  /** 'firstRun' routes on to PIN setup/dash when the tour finishes (the
   * splash-time flow); 'replay' (opened from Settings) just returns to dash
   * without re-triggering PIN setup. */
  tourOrigin: 'firstRun' | 'replay';
  pinEntry: string;
  dash: DashKey;
  monthOffset: number;
  fabOpen: boolean;
  modal: ModalKind;
  modalMode: 'add' | 'edit';
  editId: string | null;

  pinRecoveryStep: null | 'setup' | 'options' | 'key' | 'newpin' | 'showKey';
  recoveryOption: 'biometric' | 'key';
  recoveryKeyInput: string;
  newPinEntry: string;
  pinError: string;
  biometricAvailable: boolean;
  newRecoveryKeyText: string;
  securityMessage: string;

  txFilter: 'all' | 'expense' | 'income' | 'tagged';
  txSearch: string;
  searchQuery: string;
  /** Set by tapping a `#tag` in Activity (§27) — narrows the list to
   * transactions carrying this exact tag, on top of `txFilter`/`txSearch`. */
  tagFilter: string | null;

  plansTab: 'lists' | 'budgets' | 'goals' | 'calendar';
  activeListId: string | null;
  catTab: TxType;
  debtsTab: 'debts' | 'people';
  activeDebtId: string | null;
  activePersonId: string | null;
  activeAccountId: string | null;
  calSelectedDate: string | null;

  backupEncrypt: boolean;
  useRecoveryKey: boolean;
  backupPassword: string;
  backupPasswordConfirm: string;
  backupToastText: string;
  backupBusy: boolean;
  restorePending: { raw: string; encrypted: boolean } | null;
  restorePassword: string;

  confirmTitle: string;
  confirmMessage: string;
  confirmReassignRaw: { id: string; label: string }[] | null;
  confirmReassignTarget: string | null;
  confirmAction: ((targetId: string | null) => void) | null;

  goalDeleteChoice: 'return' | 'writeoff';
  goalDeleteAccountId: string | null;
  goalDeleteCategoryId: string | null;

  fShoppingCheckListId: string | null;
  fShoppingCheckItemId: string | null;

  budgetOverrides: Record<string, number>;
  shoppingTemplates: ShoppingTemplate[];

  autoBackupOption: 'Off' | 'Daily' | 'Weekly';
  lastExportAt: number; // epoch ms of the last off-device backup export; 0 = never
  /** epoch ms of the last *silent, on-device* backup written by
   * `maybeRunAutoBackup` (0 = never) — separate from `lastExportAt`, which
   * only tracks the manual share-sheet export. */
  lastAutoBackupAt: number;
  /** Whether `persist.ts`'s one-time ledger-derived-balance backfill has run
   * (see PLAN.md's "Part D") — true immediately for a fresh seed (already
   * ledger-correct from the start), and set true after the migration runs
   * once for an existing install. Never re-runs once true. */
  ledgerBalancesMigrated: boolean;
  currency: string;

  pinLockOn: boolean;
  biometricOn: boolean;
  notifOn: boolean;
  notifMessage: string;
  /** Kept its original field name from the PRD's email-era design — it now
   * gates a weekly local-notification summary instead (Nibash is offline,
   * §2 — see `notifications/index.ts`'s `computeWeeklySummary`). */
  weeklyEmailOn: boolean;
  /** epoch ms the weekly summary notification last fired (0 = never). */
  lastWeeklySummaryAt: number;
  widgets: Widgets;
  newNoteText: string;

  /** `${budgetId}:${YYYY-MM}` -> timestamp; dedupes the "you've hit X% of your
   * budget" alert so it fires once per budget per month, not every app open. */
  budgetAlertsSent: Record<string, number>;

  accounts: Account[];
  categories: Category[];
  profiles: Profile[];
  people: Person[];
  debts: Debt[];
  bills: Bill[];
  subscriptions: Subscription[];
  recurringTransactions: RecurringTransaction[];
  goals: Goal[];
  budgets: Budget[];
  shoppingLists: ShoppingList[];
  notesList: Note[];
  transactions: Transaction[];
}
