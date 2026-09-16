import { create } from 'zustand';
import type {
  AppState, FormState, ModalKind, DashKey, Account, Category, Profile, Person,
} from './types';
import {
  seedAccounts, seedCategories, seedProfiles, seedPeople, seedDebts, buildSeedBills,
  buildSeedSubscriptions, buildSeedRecurring, seedGoals, seedBudgets, seedShoppingLists, seedShoppingTemplates,
  seedNotes, buildSeedTransactions, seedWidgets,
} from './seed';
import { accById, catById, dayFmt, monthKey, personById, namesAreSimilar } from './helpers';
import { todayStr, today, toDateStr, fromDateStr, tryFromDateStr } from './now';
import { nextOccurrence, parseShortDate, formatShortDate } from './recurrence';
import {
  hasPinSet, setPin, verifyPin, generateRecoveryKey, setRecoveryKeyHash, verifyRecoveryKeyMatch,
} from '../security/pin';
import { isBiometricAvailable, authenticateWithBiometric } from '../security/biometric';
import { ensureNotificationPermission } from '../notifications';
import { pickReceiptImage, deleteReceiptFile } from '../backup/attachments';
import { pickContact } from '../contacts';

// `../backup` imports this store, so it's pulled in lazily to avoid a static
// import cycle (same reasoning as notifications/wire.ts).
function backupApi(): typeof import('../backup') {
  return require('../backup');
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

async function runExport(fn: () => Promise<void>, okText: string) {
  if (useStore.getState().backupBusy) return;
  useStore.setState({ backupBusy: true, backupToastText: '' });
  try {
    await fn();
    useStore.setState({ backupToastText: okText });
  } catch (e) {
    useStore.setState({ backupToastText: errMsg(e) });
  } finally {
    useStore.setState({ backupBusy: false });
  }
}

/** "80%" -> 80, "Off" / anything unparseable -> undefined (alerts off). */
function parseAlertPct(v: string): number | undefined {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function resetForm(state: AppState): FormState {
  return {
    fAmount: '', fTitle: '', fTags: '', fQty: '', fPhone: '',
    fCatId: null, fAccId: state.accounts[0].id, fProfileId: null,
    fDebtDirection: 'owe', fDebtPersonId: null,
    fTransferFrom: state.accounts[0].id,
    fTransferTo: state.accounts[1] ? state.accounts[1].id : state.accounts[0].id,
    fShoppingListId: state.shoppingLists[0].id,
    fAccountType: 'Bank', fAccountIncludeTotal: true, fAccountCreditLimit: '',
    fCategoryType: 'expense', fRelationship: 'Friend', fRepeat: 'Monthly', fAlertPct: '80%',
    fBudgetCatId: null, fRecurringType: 'expense',
    fBillAmountVaries: false, fBillReminder: '3 days before', fDueDate: todayStr(),
    fDebtReminderDate: '', fReceiptUri: '', fApplyScope: 'going', formError: '',
  };
}

/** Shared by `finishSplash` (tour already seen) and `tourFinish` (tour just
 * finished on a first run) — routes to PIN setup/unlock if App Lock is on,
 * else straight to the dashboard. */
async function proceedPastSplash(set: (partial: Partial<Store>) => void, get: () => Store): Promise<void> {
  const s = get();
  if (!s.pinLockOn) { set({ screen: 'dash' }); return; }
  const alreadySet = await hasPinSet();
  set({ screen: 'pin', pinRecoveryStep: alreadySet ? null : 'setup', pinEntry: '', pinError: '' });
}

interface Actions {
  // navigation
  goHome: () => void;
  goActivity: () => void;
  goPlans: () => void;
  goMore: () => void;
  goBudgets: () => void;
  goBills: () => void;
  goDebts: () => void;
  goShopping: () => void;
  goGoals: () => void;
  goSubscriptions: () => void;
  viewAllActivity: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  backToMore: () => void;
  backToAccounts: () => void;
  backToPeople: () => void;
  backToDebts: () => void;
  backToLists: () => void;
  setDash: (d: DashKey) => void;
  openAccountDetail: (id: string) => void;
  openDebtDetail: (id: string) => void;
  openPersonDetail: (id: string) => void;
  openShoppingDetail: (id: string) => void;
  setPlansTab: (t: AppState['plansTab']) => void;
  setCatTab: (t: AppState['catTab']) => void;
  setDebtsTab: (t: AppState['debtsTab']) => void;

  monthPrev: () => void;
  monthNext: () => void;
  monthToday: () => void;
  openMonthPicker: () => void;
  pickMonth: (offset: number) => void;

  // pin / splash
  finishSplash: () => Promise<void>;
  tourNext: () => void;
  tourBack: () => void;
  tourFinish: () => Promise<void>;
  openWelcomeTour: () => void;
  checkBiometricAvailability: () => Promise<void>;
  pressKey: (k: string) => void;
  useFingerprint: () => Promise<void>;
  openForgotPin: () => void;
  cancelPinRecovery: () => void;
  selectBiometricOption: () => void;
  selectKeyOption: () => void;
  continueRecovery: () => Promise<void>;
  setRecoveryKeyInput: (v: string) => void;
  verifyRecoveryKey: () => Promise<void>;
  pressNewPinKey: (k: string) => void;
  acknowledgeRecoveryKey: () => void;

  // fab / modal
  toggleFab: () => void;
  closeFab: () => void;
  closeModal: () => void;
  openTxModal: (type: 'expense' | 'income', id: string | null) => void;
  openExpenseModal: () => void;
  openIncomeModal: () => void;
  openTransferModal: () => void;
  openDebtModal: () => void;
  openShoppingItemModalFromFab: () => void;
  openShoppingItemModal: () => void;
  addShoppingList: () => void;
  createShoppingList: () => void;
  setShoppingListRepeat: (listId: string, repeat: string) => void;
  openTemplatePicker: () => void;
  useShoppingTemplate: (tplId: string) => void;
  saveAsTemplate: () => void;
  askDelete: (title: string, message: string, reassignList: { id: string; label: string }[] | null, onConfirm: ((targetId: string | null) => void) | null) => void;
  confirmDeleteRun: () => void;
  openAddAccount: () => void;
  openEditAccount: () => void;
  deleteAccount: () => void;
  openAddCategory: () => void;
  editCategory: (catId: string) => void;
  deleteCategory: () => void;
  openAddProfile: () => void;
  editProfile: (profileId: string) => void;
  deleteProfile: () => void;
  openAddPerson: () => void;
  editPerson: (personId: string) => void;
  importFromContacts: () => Promise<void>;
  deletePerson: () => void;
  openAddBudget: () => void;
  editBudget: (budgetId: string) => void;
  deleteBudget: () => void;
  openAddGoal: () => void;
  editGoal: (goalId: string) => void;
  contributeGoal: (goalId: string) => void;
  withdrawGoal: (goalId: string) => void;
  askDeleteGoal: () => void;
  confirmGoalDelete: () => void;
  openAddBill: () => void;
  editBill: (billId: string) => void;
  deleteBill: () => void;
  payBill: (billId: string) => void;
  openAddSubscription: () => void;
  editSubscription: (subId: string) => void;
  cancelSubscription: () => void;
  openAddRecurring: () => void;
  editRecurring: (id: string) => void;
  deleteRecurringTx: () => void;
  skipRecurringTx: (id: string) => void;
  logRecurringTx: (id: string) => void;
  openDebtPaymentModal: () => void;
  openRecoveryKey: () => void;

  saveTransaction: () => void;
  deleteTransaction: () => void;

  toggleWidget: (key: keyof AppState['widgets']) => void;
  togglePinLock: () => Promise<void>;
  toggleBiometric: () => Promise<void>;
  toggleNotif: () => Promise<void>;
  toggleWeeklyEmail: () => void;
  toggleBackupEncrypt: () => void;
  toggleUseRecoveryKey: () => void;
  runBackup: () => Promise<void>;
  runRestore: () => Promise<void>;
  confirmRestore: () => Promise<void>;
  cancelRestore: () => void;
  setRestorePassword: (v: string) => void;
  exportCsv: () => Promise<void>;
  exportJson: () => Promise<void>;
  exportPdf: () => Promise<void>;
  setBackupPassword: (v: string) => void;
  setBackupPasswordConfirm: (v: string) => void;
  setAutoBackupOption: (v: AppState['autoBackupOption']) => void;
  pickReceipt: () => Promise<void>;
  clearReceipt: () => void;
  toggleModalIncludeTotal: () => void;
  toggleShoppingItem: (listId: string, itemId: string) => void;
  sameAsEstimated: () => void;
  confirmShoppingCheck: () => void;
  deleteNote: (id: string) => void;
  addNote: () => void;
  setNewNoteText: (v: string) => void;

  // simple field setters used across modals
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setCurrency: (c: string) => void;
  setTxFilter: (f: AppState['txFilter']) => void;
  setTagFilter: (tag: string | null) => void;
  setTxSearch: (v: string) => void;
  setSearchQuery: (v: string) => void;
  setCalSelectedDate: (d: string) => void;
  setGoalDeleteChoice: (c: AppState['goalDeleteChoice']) => void;
  setGoalDeleteAccountId: (id: string) => void;
  setGoalDeleteCategoryId: (id: string) => void;
  setConfirmReassignTarget: (id: string) => void;
  setApplyScope: (s: AppState['fApplyScope']) => void;
}

export type Store = AppState & Actions;

const initialState: AppState = {
  screen: 'splash', pinEntry: '', dash: 'home', monthOffset: 0, fabOpen: false,
  modal: null, modalMode: 'add', editId: null,
  welcomeTourSeen: false, tourStep: 0, tourOrigin: 'firstRun',
  pinRecoveryStep: null, recoveryOption: 'biometric', recoveryKeyInput: '', newPinEntry: '',
  pinError: '', biometricAvailable: false, newRecoveryKeyText: '', securityMessage: '',
  fAmount: '', fTitle: '', fTags: '', fQty: '', fPhone: '',
  fCatId: null, fAccId: null, fProfileId: null,
  fDebtDirection: 'owe', fDebtPersonId: null,
  fTransferFrom: null, fTransferTo: null,
  fShoppingListId: null, fAccountType: 'Bank', fAccountIncludeTotal: true, fAccountCreditLimit: '',
  fCategoryType: 'expense', fRelationship: 'Friend', fRepeat: 'Monthly', fAlertPct: '80%',
  fBudgetCatId: null, fRecurringType: 'expense',
  fBillAmountVaries: false, fBillReminder: '3 days before', fDueDate: '', fDebtReminderDate: '', fReceiptUri: '',
  fApplyScope: 'going', formError: '',
  txFilter: 'all', txSearch: '', searchQuery: '', tagFilter: null,
  plansTab: 'lists', activeListId: null, catTab: 'expense', debtsTab: 'debts',
  activeDebtId: null, activePersonId: null, activeAccountId: null, calSelectedDate: null,
  backupEncrypt: false, useRecoveryKey: false, backupPassword: '', backupPasswordConfirm: '', backupToastText: '',
  backupBusy: false, restorePending: null, restorePassword: '',
  confirmTitle: '', confirmMessage: '', confirmReassignRaw: null, confirmReassignTarget: null, confirmAction: null,
  goalDeleteChoice: 'return', goalDeleteAccountId: null, goalDeleteCategoryId: null,
  fShoppingCheckListId: null, fShoppingCheckItemId: null,
  budgetOverrides: {},
  budgetAlertsSent: {},
  shoppingTemplates: seedShoppingTemplates,
  autoBackupOption: 'Daily', lastExportAt: 0, lastAutoBackupAt: 0, ledgerBalancesMigrated: false, currency: '৳',
  pinLockOn: true, biometricOn: false, notifOn: true, notifMessage: '', weeklyEmailOn: false, lastWeeklySummaryAt: 0,
  widgets: seedWidgets,
  newNoteText: '',
  accounts: seedAccounts,
  categories: seedCategories,
  profiles: seedProfiles,
  people: seedPeople,
  debts: seedDebts,
  bills: buildSeedBills(),
  subscriptions: buildSeedSubscriptions(),
  recurringTransactions: buildSeedRecurring(),
  goals: seedGoals,
  budgets: seedBudgets,
  shoppingLists: seedShoppingLists,
  notesList: seedNotes,
  transactions: buildSeedTransactions(),
};

export const useStore = create<Store>((set, get) => ({
  ...initialState,

  // ---------- navigation ----------
  goHome: () => set({ dash: 'home', fabOpen: false }),
  goActivity: () => set({ dash: 'activity', fabOpen: false }),
  goPlans: () => set({ dash: 'plans', fabOpen: false }),
  goMore: () => set({ dash: 'more', fabOpen: false }),
  goBudgets: () => set({ dash: 'plans', plansTab: 'budgets' }),
  goBills: () => set({ dash: 'moreBills' }),
  goDebts: () => set({ dash: 'moreDebts', debtsTab: 'debts' }),
  goShopping: () => set({ dash: 'plans', plansTab: 'lists' }),
  goGoals: () => set({ dash: 'plans', plansTab: 'goals' }),
  goSubscriptions: () => set({ dash: 'moreSubscriptions' }),
  viewAllActivity: () => set({ dash: 'activity' }),
  openSearch: () => set({ dash: 'search' }),
  closeSearch: () => set({ dash: 'home', searchQuery: '' }),
  backToMore: () => set({ dash: 'more' }),
  backToAccounts: () => set({ dash: 'moreAccounts' }),
  backToPeople: () => set({ dash: 'moreDebts', debtsTab: 'people' }),
  backToDebts: () => set({ dash: 'moreDebts', debtsTab: 'debts' }),
  backToLists: () => set({ dash: 'plans', plansTab: 'lists' }),
  setDash: (d) => set({ dash: d }),
  openAccountDetail: (id) => set({ dash: 'moreAccountDetail', activeAccountId: id }),
  openDebtDetail: (id) => set({ dash: 'moreDebtDetail', activeDebtId: id }),
  openPersonDetail: (id) => set({ dash: 'morePersonDetail', activePersonId: id }),
  openShoppingDetail: (id) => set({ dash: 'plansShoppingDetail', activeListId: id }),
  setPlansTab: (t) => set({ plansTab: t }),
  setCatTab: (t) => set({ catTab: t }),
  setDebtsTab: (t) => set({ debtsTab: t }),

  monthPrev: () => set((s) => ({ monthOffset: s.monthOffset - 1 })),
  monthNext: () => set((s) => ({ monthOffset: s.monthOffset + 1 })),
  monthToday: () => set({ monthOffset: 0 }),
  openMonthPicker: () => set({ modal: 'monthPicker' }),
  pickMonth: (offset) => set({ monthOffset: offset, modal: null }),

  // ---------- splash / pin ----------
  // `pinRecoveryStep` doubles as the PIN-screen sub-mode: null = normal
  // unlock, 'setup' = first PIN ever being created (pinLockOn is on but
  // SecureStore has no hash yet — happens on first launch, or right after
  // togglePinLock turns the lock on), 'showKey' = the freshly-generated
  // Recovery Key must be acknowledged before continuing, and
  // 'options'/'key'/'newpin' are the existing "Forgot PIN?" steps.
  finishSplash: async () => {
    const s = get();
    if (!s.welcomeTourSeen) { set({ screen: 'tour', tourStep: 0, tourOrigin: 'firstRun' }); return; }
    await proceedPastSplash(set, get);
  },
  tourNext: () => set((s) => ({ tourStep: s.tourStep + 1 })),
  tourBack: () => set((s) => ({ tourStep: Math.max(s.tourStep - 1, 0) })),
  tourFinish: async () => {
    set({ welcomeTourSeen: true });
    if (get().tourOrigin === 'replay') { set({ screen: 'dash' }); return; }
    await proceedPastSplash(set, get);
  },
  openWelcomeTour: () => set({ screen: 'tour', tourStep: 0, tourOrigin: 'replay' }),
  checkBiometricAvailability: async () => {
    const available = await isBiometricAvailable();
    set({ biometricAvailable: available });
  },
  pressKey: (k) => {
    if (k === '') return;
    if (k === '⌫') { set((s) => ({ pinEntry: s.pinEntry.slice(0, -1), pinError: '' })); return; }
    const s = get();
    if (s.pinEntry.length >= 4) return;
    const next = s.pinEntry + k;
    set({ pinEntry: next, pinError: '' });
    if (next.length === 4) {
      setTimeout(async () => {
        const ok = await verifyPin(next);
        if (ok) set({ screen: 'dash', pinEntry: '' });
        else set({ pinEntry: '', pinError: 'Incorrect PIN' });
      }, 200);
    }
  },
  useFingerprint: async () => {
    const ok = await authenticateWithBiometric();
    if (ok) set({ screen: 'dash', pinError: '' });
  },
  openForgotPin: () => {
    const s = get();
    set({
      pinRecoveryStep: 'options',
      recoveryOption: s.biometricAvailable && s.biometricOn ? 'biometric' : 'key',
      pinError: '',
    });
  },
  cancelPinRecovery: () => set({ pinRecoveryStep: null, recoveryKeyInput: '', newPinEntry: '', pinError: '' }),
  selectBiometricOption: () => set({ recoveryOption: 'biometric' }),
  selectKeyOption: () => set({ recoveryOption: 'key' }),
  continueRecovery: async () => {
    const s = get();
    if (s.recoveryOption === 'biometric') {
      const ok = await authenticateWithBiometric();
      if (ok) set({ screen: 'dash', pinRecoveryStep: null, pinError: '' });
      else set({ pinError: 'Biometric authentication failed' });
      return;
    }
    set({ pinRecoveryStep: 'key', pinError: '' });
  },
  setRecoveryKeyInput: (v) => set({ recoveryKeyInput: v }),
  verifyRecoveryKey: async () => {
    const s = get();
    const ok = await verifyRecoveryKeyMatch(s.recoveryKeyInput);
    if (ok) set({ pinRecoveryStep: 'newpin', recoveryKeyInput: '', pinError: '', newPinEntry: '' });
    else set({ pinError: "That recovery key doesn't match" });
  },
  pressNewPinKey: (k) => {
    if (k === '') return;
    if (k === '⌫') { set((s) => ({ newPinEntry: s.newPinEntry.slice(0, -1) })); return; }
    const s = get();
    if (s.newPinEntry.length >= 4) return;
    const next = s.newPinEntry + k;
    set({ newPinEntry: next });
    if (next.length === 4) {
      setTimeout(async () => {
        await setPin(next);
        const st = get();
        if (st.pinRecoveryStep === 'setup') {
          const key = await generateRecoveryKey();
          await setRecoveryKeyHash(key);
          set({ pinRecoveryStep: 'showKey', newRecoveryKeyText: key, newPinEntry: '' });
        } else {
          set({ screen: 'dash', pinRecoveryStep: null, pinEntry: '', newPinEntry: '' });
        }
      }, 350);
    }
  },
  acknowledgeRecoveryKey: () => set({ screen: 'dash', pinRecoveryStep: null, newRecoveryKeyText: '' }),

  toggleFab: () => set((s) => ({ fabOpen: !s.fabOpen })),
  closeFab: () => set({ fabOpen: false }),

  // ---------- modal open/close ----------
  closeModal: () => set({ modal: null, editId: null }),
  openTxModal: (type, id) => {
    const s = get();
    if (id) {
      const t = s.transactions.find((x) => x.id === id)!;
      set({ ...resetForm(s), modal: type, modalMode: 'edit', editId: id, fAmount: String(t.amount), fTitle: t.title, fCatId: t.catId, fAccId: t.accountId, fTags: t.tags.join(', '), fProfileId: t.profileId, fReceiptUri: t.receiptUri ?? '' });
    } else {
      set({ ...resetForm(s), modal: type, modalMode: 'add', editId: null });
    }
  },
  openExpenseModal: () => { get().openTxModal('expense', null); set({ fabOpen: false }); },
  openIncomeModal: () => { get().openTxModal('income', null); set({ fabOpen: false }); },
  openTransferModal: () => set((s) => ({ ...resetForm(s), modal: 'transfer', modalMode: 'add', fabOpen: false })),
  openDebtModal: () => set((s) => ({ ...resetForm(s), modal: 'debt', modalMode: 'add', fabOpen: false })),
  openShoppingItemModalFromFab: () => set((s) => ({ ...resetForm(s), modal: 'shoppingItem', modalMode: 'add', fabOpen: false })),
  openShoppingItemModal: () => set((s) => ({ ...resetForm(s), modal: 'shoppingItem', modalMode: 'add', fShoppingListId: s.activeListId })),
  addShoppingList: () => set((s) => ({ ...resetForm(s), modal: 'newShoppingList', modalMode: 'add', fTitle: '', fRepeat: 'One-time' })),
  createShoppingList: () => {
    const s = get();
    const id = 'list' + Date.now();
    const name = s.fTitle.trim() || `Untitled list ${s.shoppingLists.length + 1}`;
    const next = s.fRepeat !== 'One-time' ? nextOccurrence(today(), s.fRepeat) : null;
    set({
      shoppingLists: s.shoppingLists.concat([{ id, name, budget: 0, items: [], repeat: s.fRepeat, nextDate: next ? toDateStr(next) : undefined }]),
      activeListId: id, dash: 'plansShoppingDetail', modal: null,
    });
  },
  setShoppingListRepeat: (listId, repeat) => {
    const s = get();
    const next = repeat !== 'One-time' ? nextOccurrence(today(), repeat) : null;
    set({
      shoppingLists: s.shoppingLists.map((l) => (l.id === listId
        ? { ...l, repeat, nextDate: next ? toDateStr(next) : undefined }
        : l)),
    });
  },
  openTemplatePicker: () => set({ modal: 'templatePicker' }),
  useShoppingTemplate: (tplId) => {
    const s = get();
    const tpl = s.shoppingTemplates.find((t) => t.id === tplId);
    if (!tpl) return;
    const id = 'list' + Date.now();
    set({
      shoppingLists: s.shoppingLists.concat([{
        id, name: tpl.name.replace(' Template', ''), budget: 0, repeat: 'One-time',
        items: tpl.items.map((it, i) => ({ id: 'i' + Date.now() + i, name: it.name, qty: it.qty, price: 0, checked: false })),
      }]),
      activeListId: id, dash: 'plansShoppingDetail', modal: null,
    });
  },
  saveAsTemplate: () => {
    const s = get();
    const list = s.shoppingLists.find((l) => l.id === s.activeListId);
    if (!list) return;
    set({ shoppingTemplates: s.shoppingTemplates.concat([{ id: 'tpl' + Date.now(), name: list.name + ' Template', items: list.items.map((it) => ({ name: it.name, qty: it.qty })) }]) });
  },
  askDelete: (title, message, reassignList, onConfirm) => {
    set({ modal: 'confirmDelete', confirmTitle: title, confirmMessage: message, confirmReassignRaw: reassignList, confirmReassignTarget: reassignList && reassignList.length ? reassignList[0].id : null, confirmAction: onConfirm });
  },
  confirmDeleteRun: () => {
    const s = get();
    if (s.confirmAction) s.confirmAction(s.confirmReassignTarget);
  },
  openAddAccount: () => set((s) => ({ ...resetForm(s), modal: 'account', modalMode: 'add' })),
  openEditAccount: () => {
    const s = get();
    const a = accById(s, s.activeAccountId);
    set({ ...resetForm(s), modal: 'account', modalMode: 'edit', editId: a.id, fTitle: a.name, fAccountType: a.type, fAccountIncludeTotal: a.includeInTotal, fAccountCreditLimit: a.creditLimit ? String(a.creditLimit) : '' });
  },
  deleteAccount: () => {
    const s = get();
    const a = accById(s, s.editId);
    const count = s.transactions.filter((t) => t.accountId === a.id).length;
    const others = s.accounts.filter((x) => x.id !== a.id);
    const reassign = count > 0 && others.length > 0 ? others.map((o) => ({ id: o.id, label: o.name })) : null;
    get().askDelete(`Delete "${a.name}"?`, `${count} transaction(s) reference this account${reassign ? '. Choose an account to move them to.' : '.'}`, reassign, (targetId) => {
      set((st) => ({
        transactions: targetId ? st.transactions.map((t) => (t.accountId === a.id ? { ...t, accountId: targetId } : t)) : st.transactions,
        accounts: st.accounts.filter((x) => x.id !== a.id), modal: null, dash: 'moreAccounts',
      }));
    });
  },
  openAddCategory: () => set((s) => ({ ...resetForm(s), modal: 'category', modalMode: 'add', fCategoryType: s.catTab })),
  editCategory: (catId) => {
    const s = get();
    const cat = catById(s, catId);
    set({ ...resetForm(s), modal: 'category', modalMode: 'edit', editId: cat.id, fTitle: cat.name, fCategoryType: cat.type });
  },
  deleteCategory: () => {
    const s = get();
    const c = catById(s, s.editId);
    const count = s.transactions.filter((t) => t.catId === c.id).length;
    const others = s.categories.filter((x) => x.id !== c.id && x.type === c.type);
    const reassign = count > 0 && others.length > 0 ? others.map((o) => ({ id: o.id, label: o.name })) : null;
    get().askDelete(`Delete "${c.name}"?`, `${count} transaction(s) use this category${reassign ? '. Choose a category to move them to.' : '.'}`, reassign, (targetId) => {
      set((st) => ({
        transactions: targetId ? st.transactions.map((t) => (t.catId === c.id ? { ...t, catId: targetId } : t)) : st.transactions,
        categories: st.categories.filter((x) => x.id !== c.id), modal: null, dash: 'moreCategories',
      }));
    });
  },
  openAddProfile: () => set((s) => ({ ...resetForm(s), modal: 'profile', modalMode: 'add' })),
  editProfile: (profileId) => {
    const s = get();
    const p = s.profiles.find((x) => x.id === profileId)!;
    set({ ...resetForm(s), modal: 'profile', modalMode: 'edit', editId: p.id, fTitle: p.name, fRelationship: p.relationship });
  },
  deleteProfile: () => {
    const s = get();
    const p = s.profiles.find((x) => x.id === s.editId);
    if (!p || p.id === 'me') { set({ modal: null }); return; }
    get().askDelete(`Delete "${p.name}"?`, 'Transactions attributed to this profile will be reassigned to Me.', null, () => {
      set((st) => ({
        transactions: st.transactions.map((t) => (t.profileId === p.id ? { ...t, profileId: 'me' } : t)),
        profiles: st.profiles.filter((x) => x.id !== p.id), modal: null, dash: 'moreProfiles',
      }));
    });
  },
  openAddPerson: () => set((s) => ({ ...resetForm(s), modal: 'person', modalMode: 'add' })),
  editPerson: (personId) => {
    const s = get();
    const p = personById(s, personId);
    set({ ...resetForm(s), modal: 'person', modalMode: 'edit', editId: p.id, fTitle: p.name, fPhone: p.phone, fQty: p.note });
  },
  importFromContacts: async () => {
    try {
      const picked = await pickContact();
      if (picked) set({ fTitle: picked.name, fPhone: picked.phone, formError: '' });
    } catch {
      set({ formError: 'Couldn’t open contacts. You can still type the name manually.' });
    }
  },
  deletePerson: () => {
    const s = get();
    const p = personById(s, s.activePersonId);
    const outstanding = s.debts.filter((d) => d.personId === p.id).reduce((sum, d) => sum + (d.original - d.payments.reduce((a, pm) => a + pm.amount, 0)), 0);
    if (outstanding !== 0) {
      get().askDelete(`Can't delete "${p.name}"`, `This person has an outstanding balance of ${s.currency}${Math.abs(outstanding)}. Settle or reassign their debts first.`, null, null);
      return;
    }
    get().askDelete(`Delete "${p.name}"?`, 'This removes them from your People list.', null, () => {
      set((st) => ({ people: st.people.filter((x) => x.id !== p.id), modal: null, dash: 'moreDebts', debtsTab: 'people' }));
    });
  },
  openAddBudget: () => set((s) => ({ ...resetForm(s), modal: 'budget', modalMode: 'add' })),
  editBudget: (budgetId) => {
    const s = get();
    const b = s.budgets.find((x) => x.id === budgetId)!;
    set({ ...resetForm(s), modal: 'budget', modalMode: 'edit', editId: b.id, fBudgetCatId: b.catId, fAmount: String(b.amount), fAlertPct: b.alertThreshold != null ? `${b.alertThreshold}%` : 'Off', fApplyScope: 'going' });
  },
  deleteBudget: () => {
    const s = get();
    const b = s.budgets.find((x) => x.id === s.editId);
    if (!b) return;
    const cat = catById(s, b.catId);
    get().askDelete(`Delete "${cat.name}" budget?`, `This removes the ${s.currency}${b.amount}/month cap going forward. Past months' history is kept.`, null, () => {
      set((st) => ({ budgets: st.budgets.filter((x) => x.id !== b.id), modal: null }));
    });
  },
  openAddGoal: () => set((s) => ({ ...resetForm(s), modal: 'goal', modalMode: 'add' })),
  editGoal: (goalId) => {
    const s = get();
    const g = s.goals.find((x) => x.id === goalId)!;
    set({ ...resetForm(s), modal: 'goal', modalMode: 'edit', editId: g.id, fTitle: g.name, fAmount: String(g.target), fQty: g.targetDate });
  },
  contributeGoal: (goalId) => set((s) => ({ ...resetForm(s), modal: 'goalContribute', modalMode: 'add', editId: goalId })),
  withdrawGoal: (goalId) => set((s) => ({ ...resetForm(s), modal: 'goalWithdraw', modalMode: 'add', editId: goalId })),
  askDeleteGoal: () => {
    const s = get();
    const g = s.goals.find((x) => x.id === s.editId);
    if (!g) return;
    set({ modal: 'goalDelete', goalDeleteChoice: 'return', goalDeleteAccountId: s.accounts[0].id, goalDeleteCategoryId: (s.categories.find((c) => c.type === 'expense') || { id: null }).id });
  },
  confirmGoalDelete: () => {
    const s = get();
    const g = s.goals.find((x) => x.id === s.editId);
    if (!g) { set({ modal: null }); return; }
    if (s.goalDeleteChoice === 'return') {
      const accId = s.goalDeleteAccountId!;
      set((st) => ({
        transactions: g.saved > 0
          ? st.transactions.concat([{ id: 'tx' + Date.now(), title: `${g.name} (goal returned)`, catId: '', accountId: accId, type: 'savings_withdrawal', amount: g.saved, date: todayStr(), tags: [], profileId: 'me' }])
          : st.transactions,
        goals: st.goals.filter((x) => x.id !== g.id), modal: null,
      }));
    } else {
      set((st) => ({
        transactions: g.saved > 0
          ? st.transactions.concat([{ id: 'tx' + Date.now(), title: `${g.name} (goal write-off)`, catId: s.goalDeleteCategoryId!, accountId: st.accounts[0].id, type: 'expense', amount: g.saved, date: todayStr(), tags: [], profileId: 'me' }])
          : st.transactions,
        goals: st.goals.filter((x) => x.id !== g.id), modal: null,
      }));
    }
  },
  openAddBill: () => set((s) => ({ ...resetForm(s), modal: 'bill', modalMode: 'add' })),
  editBill: (billId) => {
    const s = get();
    const b = s.bills.find((x) => x.id === billId)!;
    set({ ...resetForm(s), modal: 'bill', modalMode: 'edit', editId: b.id, fTitle: b.name, fAmount: String(b.amount), fDueDate: b.dueDate, fRepeat: b.repeat, fCatId: b.catId, fAccId: b.accountId, fBillAmountVaries: !!b.amountVaries, fBillReminder: b.reminder || '3 days before' });
  },
  deleteBill: () => {
    const s = get();
    const b = s.bills.find((x) => x.id === s.editId);
    if (!b) return;
    get().askDelete(`Delete "${b.name}"?`, 'Stops future reminders for this bill. Past payment history is kept.', null, () => {
      set((st) => ({ bills: st.bills.filter((x) => x.id !== b.id), modal: null }));
    });
  },
  payBill: (billId) => {
    const s = get();
    const b = s.bills.find((x) => x.id === billId)!;
    set({ ...resetForm(s), modal: 'billPay', modalMode: 'add', editId: b.id, fAmount: String(b.amount), fAccId: b.accountId });
  },
  openAddSubscription: () => set((s) => ({ ...resetForm(s), modal: 'subscription', modalMode: 'add' })),
  editSubscription: (subId) => {
    const s = get();
    const sub = s.subscriptions.find((x) => x.id === subId)!;
    set({ ...resetForm(s), modal: 'subscription', modalMode: 'edit', editId: sub.id, fTitle: sub.name, fAmount: String(sub.amount), fRepeat: sub.cycle, fDueDate: sub.nextDate, fCatId: sub.catId ?? null, fAccId: sub.accountId ?? s.accounts[0].id });
  },
  cancelSubscription: () => set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== s.editId), modal: null })),
  openAddRecurring: () => set((s) => ({ ...resetForm(s), modal: 'recurring', modalMode: 'add', fQty: formatShortDate(nextOccurrence(today(), 'Monthly') ?? today()) })),
  editRecurring: (id) => {
    const s = get();
    const r = s.recurringTransactions.find((x) => x.id === id);
    if (!r) return;
    set({ ...resetForm(s), modal: 'recurring', modalMode: 'edit', editId: r.id, fTitle: r.title, fAmount: String(r.amount), fRecurringType: r.type, fCatId: r.catId, fAccId: r.accountId, fRepeat: r.repeat, fQty: formatShortDate(fromDateStr(r.nextDate)) });
  },
  deleteRecurringTx: () => set((s) => ({ recurringTransactions: s.recurringTransactions.filter((x) => x.id !== s.editId), modal: null })),
  skipRecurringTx: (id) => {
    const s = get();
    const r = s.recurringTransactions.find((x) => x.id === id);
    if (!r) return;
    const advanced = nextOccurrence(fromDateStr(r.nextDate), r.repeat);
    if (advanced) set({ recurringTransactions: s.recurringTransactions.map((x) => (x.id === id ? { ...x, nextDate: toDateStr(advanced) } : x)) });
    else set({ recurringTransactions: s.recurringTransactions.filter((x) => x.id !== id) });
  },
  logRecurringTx: (id) => {
    const s = get();
    const r = s.recurringTransactions.find((x) => x.id === id);
    if (!r) return;
    const dueDate = fromDateStr(r.nextDate);
    const advanced = nextOccurrence(dueDate, r.repeat);
    set({
      transactions: s.transactions.concat([{ id: 'tx' + Date.now(), title: r.title, catId: r.catId, accountId: r.accountId, type: r.type, amount: r.amount, date: r.nextDate, tags: ['recurring'], profileId: 'me' }]),
      recurringTransactions: advanced
        ? s.recurringTransactions.map((x) => (x.id === id ? { ...x, nextDate: toDateStr(advanced) } : x))
        : s.recurringTransactions.filter((x) => x.id !== id),
    });
  },
  openDebtPaymentModal: () => set((s) => ({ ...resetForm(s), modal: 'debtPayment', modalMode: 'add' })),
  // Regenerates the Recovery Key rather than "viewing" it — only the hash is
  // ever stored (per PRD §31, "we don't store this and can't recover it for
  // you"), so the original plaintext genuinely cannot be shown again.
  openRecoveryKey: () => {
    (async () => {
      const key = await generateRecoveryKey();
      await setRecoveryKeyHash(key);
      set({ modal: 'recoveryKey', newRecoveryKeyText: key });
    })();
  },

  // ---------- save/delete ----------
  saveTransaction: () => {
    const s = get();
    const amt = parseFloat(s.fAmount) || 0;
    if (s.modal === 'expense' || s.modal === 'income') {
      const tags = Array.from(new Set(s.fTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)));
      const receiptUri = s.fReceiptUri || undefined;
      if (s.modalMode === 'edit') {
        const prev = s.transactions.find((t) => t.id === s.editId);
        if (prev?.receiptUri && prev.receiptUri !== receiptUri) deleteReceiptFile(prev.receiptUri);
        set({ transactions: s.transactions.map((t) => (t.id === s.editId ? { ...t, amount: amt, title: s.fTitle || t.title, catId: s.fCatId || t.catId, accountId: s.fAccId || t.accountId, tags, profileId: s.fProfileId!, receiptUri } : t)), modal: null });
      } else {
        const id = 'tx' + Date.now();
        const date = s.monthOffset === 0 ? new Date().toISOString().slice(0, 10) : monthKey(s.monthOffset) + '-01';
        set({ transactions: s.transactions.concat([{ id, title: s.fTitle || (s.modal === 'income' ? 'Income' : 'Expense'), catId: s.fCatId || (s.modal === 'income' ? 'salary' : 'groceries'), accountId: s.fAccId!, type: s.modal, amount: amt, date, tags, profileId: s.fProfileId!, receiptUri }]), modal: null });
      }
    } else if (s.modal === 'transfer') {
      const fromId = s.fTransferFrom!;
      const toId = s.fTransferTo!;
      const fromAcc = accById(s, fromId);
      const toAcc = accById(s, toId);
      const pairId = 'tx' + Date.now();
      set({
        transactions: amt > 0 && fromId !== toId
          ? s.transactions.concat([
              { id: pairId + '_out', title: `Transfer to ${toAcc.name}`, catId: '', accountId: fromId, type: 'transfer', transferDir: 'out', amount: amt, date: todayStr(), tags: [], profileId: 'me' },
              { id: pairId + '_in', title: `Transfer from ${fromAcc.name}`, catId: '', accountId: toId, type: 'transfer', transferDir: 'in', amount: amt, date: todayStr(), tags: [], profileId: 'me' },
            ])
          : s.transactions,
        modal: null,
      });
    } else if (s.modal === 'debt') {
      const personId = s.fDebtPersonId || ('p' + Date.now());
      let people = s.people;
      if (!s.fDebtPersonId && s.fTitle) people = people.concat([{ id: personId, name: s.fTitle, phone: '', note: '' }]);
      set({ people, debts: s.debts.concat([{ id: 'd' + Date.now(), personId, direction: s.fDebtDirection, original: amt, payments: [], reminderDate: s.fDebtReminderDate.trim() || undefined }]), modal: null });
    } else if (s.modal === 'shoppingItem') {
      set({ shoppingLists: s.shoppingLists.map((l) => (l.id === s.fShoppingListId ? { ...l, items: l.items.concat([{ id: 'i' + Date.now(), name: s.fTitle || 'Item', qty: s.fQty, price: amt, checked: false }]) } : l)), modal: null });
    } else if (s.modal === 'debtPayment') {
      set({ debts: s.debts.map((d) => (d.id === s.editId ? { ...d, payments: d.payments.concat([{ date: dayFmt(new Date().toISOString().slice(0, 10)), amount: amt }]) } : d)), modal: null });
    } else if (s.modal === 'account') {
      const name = s.fTitle.trim() || 'Account';
      const dupe = s.accounts.some((a) => a.id !== s.editId && a.name.trim().toLowerCase() === name.toLowerCase());
      if (dupe) { set({ formError: `An account named "${name}" already exists.` }); return; }
      const creditLimit = s.fAccountCreditLimit ? parseFloat(s.fAccountCreditLimit) || 0 : undefined;
      if (s.modalMode === 'edit') set({ accounts: s.accounts.map((a) => (a.id === s.editId ? { ...a, name, type: s.fAccountType, includeInTotal: s.fAccountIncludeTotal, creditLimit } : a)), modal: null });
      else {
        const newAccId = 'acc' + Date.now();
        set({
          accounts: s.accounts.concat([{ id: newAccId, name, type: s.fAccountType, includeInTotal: s.fAccountIncludeTotal, creditLimit }]),
          // Starting balance is a real opening_balance transaction, not a
          // raw field (principle 6) — see helpers.ts's accountBalances. A
          // zero starting balance needs no row: an account with no
          // transactions yet already derives to 0.
          transactions: amt !== 0
            ? s.transactions.concat([{ id: 'tx' + Date.now(), title: 'Opening balance', catId: '', accountId: newAccId, type: 'opening_balance', amount: amt, date: todayStr(), tags: [], profileId: 'me' }])
            : s.transactions,
          modal: null,
        });
      }
    } else if (s.modal === 'category') {
      const name = s.fTitle.trim() || 'Category';
      const type = s.modalMode === 'edit' ? catById(s, s.editId).type : s.fCategoryType;
      const dupe = s.categories.some((c) => c.id !== s.editId && c.type === type && c.name.trim().toLowerCase() === name.toLowerCase());
      if (dupe) { set({ formError: `A${type === 'expense' ? 'n expense' : 'n income'} category named "${name}" already exists.` }); return; }
      if (s.modalMode === 'edit') set({ categories: s.categories.map((c) => (c.id === s.editId ? { ...c, name } : c)), modal: null });
      else set({ categories: s.categories.concat([{ id: 'cat' + Date.now(), name, type, color: 'accent500' }]), modal: null });
    } else if (s.modal === 'profile') {
      if (s.modalMode === 'edit') set({ profiles: s.profiles.map((p) => (p.id === s.editId ? { ...p, name: s.fTitle || p.name, relationship: s.fRelationship } : p)), modal: null });
      else set({ profiles: s.profiles.concat([{ id: 'pr' + Date.now(), name: s.fTitle || 'Profile', relationship: s.fRelationship }]), modal: null });
    } else if (s.modal === 'person') {
      const name = s.fTitle.trim() || 'Person';
      if (s.modalMode === 'edit') {
        set({ people: s.people.map((p) => (p.id === s.editId ? { ...p, name, phone: s.fPhone, note: s.fQty } : p)), modal: null });
      } else {
        set({ people: s.people.concat([{ id: 'p' + Date.now(), name, phone: s.fPhone, note: s.fQty }]), modal: null });
      }
    } else if (s.modal === 'budget') {
      if (s.modalMode === 'edit') {
        if (s.fApplyScope === 'month') {
          const ov = { ...s.budgetOverrides };
          ov[s.editId + ':' + s.monthOffset] = amt;
          set({ budgetOverrides: ov, modal: null });
        } else {
          set({ budgets: s.budgets.map((b) => (b.id === s.editId ? { ...b, amount: amt, alertThreshold: parseAlertPct(s.fAlertPct) } : b)), modal: null });
        }
      } else set({ budgets: s.budgets.concat([{ id: 'bu' + Date.now(), catId: s.fBudgetCatId || 'groceries', amount: amt, alertThreshold: parseAlertPct(s.fAlertPct) }]), modal: null });
    } else if (s.modal === 'goal') {
      if (s.modalMode === 'edit') set({ goals: s.goals.map((g) => (g.id === s.editId ? { ...g, name: s.fTitle || g.name, target: amt, targetDate: s.fQty } : g)), modal: null });
      else set({ goals: s.goals.concat([{ id: 'g' + Date.now(), name: s.fTitle || 'Goal', target: amt, saved: 0, targetDate: s.fQty }]), modal: null });
    } else if (s.modal === 'goalContribute') {
      const g = s.goals.find((x) => x.id === s.editId);
      const accId = s.fAccId || s.accounts[0].id;
      set({
        goals: s.goals.map((x) => (x.id === s.editId ? { ...x, saved: x.saved + amt } : x)),
        transactions: amt > 0
          ? s.transactions.concat([{ id: 'tx' + Date.now(), title: `${g?.name ?? 'Goal'} (contribution)`, catId: '', accountId: accId, type: 'savings_contribution', amount: amt, date: todayStr(), tags: [], profileId: 'me' }])
          : s.transactions,
        modal: null,
      });
    } else if (s.modal === 'goalWithdraw') {
      const g = s.goals.find((x) => x.id === s.editId);
      const accId = s.fAccId || s.accounts[0].id;
      const withdrawAmt = g ? Math.min(amt, g.saved) : 0;
      set({
        goals: s.goals.map((x) => (x.id === s.editId ? { ...x, saved: x.saved - withdrawAmt } : x)),
        transactions: withdrawAmt > 0
          ? s.transactions.concat([{ id: 'tx' + Date.now(), title: `${g?.name ?? 'Goal'} (withdrawal)`, catId: '', accountId: accId, type: 'savings_withdrawal', amount: withdrawAmt, date: todayStr(), tags: [], profileId: 'me' }])
          : s.transactions,
        modal: null,
      });
    } else if (s.modal === 'bill') {
      if (s.modalMode === 'edit') set({ bills: s.bills.map((b) => (b.id === s.editId ? { ...b, name: s.fTitle || b.name, amount: s.fBillAmountVaries ? b.amount : amt, dueDate: s.fDueDate, repeat: s.fRepeat, catId: s.fCatId || b.catId, accountId: s.fAccId!, amountVaries: s.fBillAmountVaries, reminder: s.fBillReminder } : b)), modal: null });
      else set({ bills: s.bills.concat([{ id: 'b' + Date.now(), name: s.fTitle || 'Bill', amount: amt, dueDate: s.fDueDate, repeat: s.fRepeat, catId: s.fCatId || 'utilities', accountId: s.fAccId!, paid: false, amountVaries: s.fBillAmountVaries, reminder: s.fBillReminder }]), modal: null });
    } else if (s.modal === 'billPay') {
      const b = s.bills.find((x) => x.id === s.editId);
      const accId = s.fAccId || b?.accountId || s.accounts[0].id;
      // Recurring bills roll straight to their next cycle on payment instead
      // of just sitting "Paid" forever (PRD §22a: "confirming payment also
      // generates the next occurrence"); a one-time bill (or one whose
      // Repeat is 'Custom' — no interval field exists yet, see
      // `recurrence.ts`) just flips to Paid as before.
      const advanced = b && b.repeat !== 'One-time' ? nextOccurrence(tryFromDateStr(b.dueDate) ?? today(), b.repeat) : null;
      set({
        bills: s.bills.map((x) => (x.id === s.editId
          ? (advanced ? { ...x, dueDate: toDateStr(advanced), paid: false } : { ...x, paid: true })
          : x)),
        transactions: amt > 0 && b
          ? s.transactions.concat([{ id: 'tx' + Date.now(), title: b.name, catId: b.catId, accountId: accId, type: 'expense', amount: amt, date: todayStr(), tags: [], profileId: 'me' }])
          : s.transactions,
        modal: null,
      });
    } else if (s.modal === 'subscription') {
      if (s.modalMode === 'edit') set({ subscriptions: s.subscriptions.map((sub) => (sub.id === s.editId ? { ...sub, name: s.fTitle || sub.name, amount: amt, cycle: s.fRepeat, nextDate: s.fDueDate, catId: s.fCatId || sub.catId, accountId: s.fAccId || sub.accountId } : sub)), modal: null });
      else set({ subscriptions: s.subscriptions.concat([{ id: 's' + Date.now(), name: s.fTitle || 'Subscription', amount: amt, cycle: s.fRepeat, nextDate: s.fDueDate, catId: s.fCatId || 'entertainment', accountId: s.fAccId! }]), modal: null });
    } else if (s.modal === 'recurring') {
      const nextDateIso = toDateStr(parseShortDate(s.fQty, today()) ?? today());
      if (s.modalMode === 'edit') {
        set({
          recurringTransactions: s.recurringTransactions.map((r) => (r.id === s.editId ? {
            ...r, title: s.fTitle || r.title, amount: amt, type: s.fRecurringType,
            catId: s.fCatId || r.catId, accountId: s.fAccId || r.accountId, repeat: s.fRepeat, nextDate: nextDateIso,
          } : r)),
          modal: null,
        });
      } else {
        set({
          recurringTransactions: s.recurringTransactions.concat([{
            id: 'rt' + Date.now(), title: s.fTitle || 'Recurring', amount: amt, type: s.fRecurringType,
            catId: s.fCatId || (s.fRecurringType === 'income' ? 'salary' : 'groceries'),
            accountId: s.fAccId!, repeat: s.fRepeat, nextDate: nextDateIso,
          }]),
          modal: null,
        });
      }
    } else {
      set({ modal: null });
    }
  },
  deleteTransaction: () => {
    const s = get();
    if (s.modal === 'expense' || s.modal === 'income') {
      const prev = s.transactions.find((t) => t.id === s.editId);
      if (prev?.receiptUri) deleteReceiptFile(prev.receiptUri);
      set({ transactions: s.transactions.filter((t) => t.id !== s.editId), modal: null });
    } else set({ modal: null });
  },

  // ---------- toggles ----------
  toggleWidget: (key) => set((s) => ({ widgets: { ...s.widgets, [key]: !s.widgets[key] } })),
  togglePinLock: async () => {
    const s = get();
    const turningOn = !s.pinLockOn;
    if (turningOn && !(await hasPinSet())) {
      // Can't enable a lock with nothing to check against — send the user
      // through PIN setup now rather than silently arming an empty lock.
      set({ pinLockOn: true, screen: 'pin', pinRecoveryStep: 'setup', pinEntry: '', newPinEntry: '' });
      return;
    }
    set({ pinLockOn: turningOn });
  },
  toggleBiometric: async () => {
    const s = get();
    if (!s.biometricOn) {
      const available = await isBiometricAvailable();
      if (!available) {
        set({ securityMessage: 'Biometric authentication isn’t available on this device.' });
        return;
      }
    }
    set((st) => ({ biometricOn: !st.biometricOn, securityMessage: '' }));
  },
  toggleNotif: async () => {
    const turningOn = !get().notifOn;
    set({ notifOn: turningOn, notifMessage: '' });
    if (turningOn) {
      const granted = await ensureNotificationPermission();
      if (!granted) set({ notifMessage: 'Turn on notifications for Nibash in your device Settings to get reminders.' });
    }
  },
  toggleWeeklyEmail: () => set((s) => ({ weeklyEmailOn: !s.weeklyEmailOn })),
  toggleBackupEncrypt: () => set((s) => ({ backupEncrypt: !s.backupEncrypt, backupToastText: '' })),
  toggleUseRecoveryKey: () => set((s) => ({ useRecoveryKey: !s.useRecoveryKey })),
  runBackup: async () => {
    if (get().backupBusy) return;
    set({ backupBusy: true, backupToastText: '' });
    try {
      await backupApi().exportBackup();
      set({ backupToastText: 'Backup file ready — save it somewhere safe.' });
    } catch (e) {
      set({ backupToastText: errMsg(e) });
    } finally {
      set({ backupBusy: false });
    }
  },
  runRestore: async () => {
    if (get().backupBusy) return;
    set({ backupBusy: true, backupToastText: '' });
    try {
      const picked = await backupApi().pickBackupFile();
      if (picked) set({ restorePending: picked, restorePassword: '' });
    } catch (e) {
      set({ backupToastText: errMsg(e) });
    } finally {
      set({ backupBusy: false });
    }
  },
  confirmRestore: async () => {
    const s = get();
    if (!s.restorePending || s.backupBusy) return;
    set({ backupBusy: true, backupToastText: '' });
    try {
      await backupApi().restoreBackup(s.restorePending.raw, s.restorePassword || undefined);
      set({ restorePending: null, restorePassword: '', backupToastText: 'Backup restored.' });
    } catch (e) {
      set({ backupToastText: errMsg(e) });
    } finally {
      set({ backupBusy: false });
    }
  },
  cancelRestore: () => set({ restorePending: null, restorePassword: '', backupToastText: '' }),
  setRestorePassword: (v) => set({ restorePassword: v }),
  exportCsv: () => runExport(() => backupApi().exportCsv(), 'Transactions exported as CSV.'),
  exportJson: () => runExport(() => backupApi().exportJson(), 'Full data exported as JSON.'),
  exportPdf: () => runExport(() => backupApi().exportPdf(), 'Report exported as PDF.'),
  setBackupPassword: (v) => set({ backupPassword: v }),
  setBackupPasswordConfirm: (v) => set({ backupPasswordConfirm: v }),
  setAutoBackupOption: (v) => set({ autoBackupOption: v }),
  pickReceipt: async () => {
    const uri = await pickReceiptImage();
    if (uri) set({ fReceiptUri: uri });
  },
  clearReceipt: () => {
    const uri = get().fReceiptUri;
    // Only delete the file if it isn't the one already saved on the edited tx —
    // that gets cleaned up by deleteTransaction / a later save.
    const saved = get().transactions.find((t) => t.id === get().editId)?.receiptUri;
    if (uri && uri !== saved) deleteReceiptFile(uri);
    set({ fReceiptUri: '' });
  },
  toggleModalIncludeTotal: () => set((s) => ({ fAccountIncludeTotal: !s.fAccountIncludeTotal })),
  toggleShoppingItem: (listId, itemId) => {
    const s = get();
    const list = s.shoppingLists.find((l) => l.id === listId);
    const item = list && list.items.find((i) => i.id === itemId);
    if (!item) return;
    if (item.checked) {
      set({ shoppingLists: s.shoppingLists.map((l) => (l.id !== listId ? l : { ...l, items: l.items.map((it) => (it.id === itemId ? { ...it, checked: false } : it)) })) });
      return;
    }
    set({ modal: 'shoppingCheck', fShoppingCheckListId: listId, fShoppingCheckItemId: itemId, fAmount: '' });
  },
  sameAsEstimated: () => {
    const s = get();
    const list = s.shoppingLists.find((l) => l.id === s.fShoppingCheckListId);
    const item = list && list.items.find((i) => i.id === s.fShoppingCheckItemId);
    if (item) set({ fAmount: String(item.price) });
  },
  confirmShoppingCheck: () => {
    const s = get();
    const amt = parseFloat(s.fAmount) || 0;
    set({ shoppingLists: s.shoppingLists.map((l) => (l.id !== s.fShoppingCheckListId ? l : { ...l, items: l.items.map((it) => (it.id === s.fShoppingCheckItemId ? { ...it, checked: true, actualPrice: amt } : it)) })), modal: null });
  },
  deleteNote: (id) => set((s) => ({ notesList: s.notesList.filter((n) => n.id !== id) })),
  addNote: () => {
    const s = get();
    if (!s.newNoteText.trim()) return;
    set({ notesList: s.notesList.concat([{ id: 'n' + Date.now(), text: s.newNoteText.trim() }]), newNoteText: '' });
  },
  setNewNoteText: (v) => set({ newNoteText: v }),

  setField: (key, value) => set({ [key]: value, formError: '' } as any),
  setCurrency: (c) => set({ currency: c }),
  setTxFilter: (f) => set({ txFilter: f }),
  setTagFilter: (tag) => set({ tagFilter: tag }),
  setTxSearch: (v) => set({ txSearch: v }),
  setSearchQuery: (v) => set({ searchQuery: v }),
  setCalSelectedDate: (d) => set({ calSelectedDate: d }),
  setGoalDeleteChoice: (c) => set({ goalDeleteChoice: c }),
  setGoalDeleteAccountId: (id) => set({ goalDeleteAccountId: id }),
  setGoalDeleteCategoryId: (id) => set({ goalDeleteCategoryId: id }),
  setConfirmReassignTarget: (id) => set({ confirmReassignTarget: id }),
  setApplyScope: (v) => set({ fApplyScope: v }),
}));
