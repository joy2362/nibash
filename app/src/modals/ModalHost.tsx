import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, textAlpha } from '../theme';
import { BottomSheet } from '../components/BottomSheet';
import {
  AmountField, ChipGroup, TextField, DateField, PrimaryButton, SecondaryButton, DashedButton, RadioDot, CheckBox,
} from '../components/primitives';
import { monthLabel, fmtAbs, namesAreSimilar, allTags } from '../store/helpers';

const REPEAT_OPTIONS = ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly', 'Custom'].map((r) => ({ label: r, value: r }));
const ACCOUNT_TYPES: any[] = ['Cash', 'Bank', 'Credit card', 'Wallet', 'Other'].map((t) => ({ label: t, value: t }));
const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Friend'].map((r) => ({ label: r, value: r }));
const ALERT_OPTIONS = ['50%', '80%', '90%', '100%', 'Off'].map((a) => ({ label: a, value: a }));
const REMINDER_OPTIONS = ['None', '1 day before', '3 days before', '7 days before'].map((r) => ({ label: r, value: r }));

const NO_SAVE_MODALS = ['recoveryKey', 'monthPicker', 'confirmDelete', 'goalDelete', 'templatePicker', 'shoppingCheck', 'newShoppingList'];

const TITLES: Record<string, string> = {
  expense: 'Add expense', income: 'Add income', transfer: 'Transfer money', debt: 'Add debt',
  shoppingItem: 'Add item', debtPayment: 'Add payment', account: 'Account', category: 'Category',
  profile: 'Profile', person: 'Add person', budget: 'Budget', goal: 'Savings goal',
  goalContribute: 'Add money', goalWithdraw: 'Withdraw money', bill: 'Add bill', billPay: 'Pay bill', subscription: 'Subscription',
  recurring: 'Recurring transaction', recoveryKey: 'New recovery key', monthPicker: 'Select month',
  goalDelete: 'Delete goal', newShoppingList: 'New shopping list', templatePicker: 'Use a template',
  shoppingCheck: 'Mark as purchased',
};

export function ModalHost() {
  const s = useStore();
  const modal = s.modal;
  if (!modal) return null;

  let title = TITLES[modal] || '';
  const editing = s.modalMode === 'edit';
  if (modal === 'expense') title = editing ? 'Edit expense' : 'Add expense';
  if (modal === 'income') title = editing ? 'Edit income' : 'Add income';
  if (modal === 'account') title = editing ? 'Edit account' : 'Add account';
  if (modal === 'category') title = editing ? 'Edit category' : 'Add category';
  if (modal === 'profile') title = editing ? 'Edit profile' : 'Add profile';
  if (modal === 'budget') title = editing ? 'Edit budget' : 'Add budget';
  if (modal === 'goal') title = editing ? 'Edit goal' : 'Add goal';
  if (modal === 'subscription') title = editing ? 'Edit subscription' : 'Add subscription';
  if (modal === 'bill') title = editing ? 'Edit bill' : 'Add bill';
  if (modal === 'recurring') title = editing ? 'Edit recurring transaction' : 'Add recurring transaction';
  if (modal === 'confirmDelete') title = s.confirmTitle;

  const showSave = !NO_SAVE_MODALS.includes(modal);
  const showDelete = (modal === 'expense' || modal === 'income') && editing;

  return (
    <BottomSheet
      visible={!!modal}
      title={title}
      onClose={s.closeModal}
      footer={(
        <>
          {!!s.formError && <Text style={styles.formErrorText}>{s.formError}</Text>}
          {showSave && <PrimaryButton label={editing ? 'Save changes' : 'Add'} onPress={s.saveTransaction} style={{ marginTop: 4 }} />}
          {showDelete && <SecondaryButton label="Delete" onPress={s.deleteTransaction} style={{ marginTop: 8 }} />}
        </>
      )}
    >
      <ModalBody modal={modal} />
    </BottomSheet>
  );
}

function ModalBody({ modal }: { modal: string }) {
  const s = useStore();
  switch (modal) {
    case 'expense':
    case 'income':
      return <TxForm />;
    case 'transfer':
      return <TransferForm />;
    case 'debt':
      return <DebtForm />;
    case 'shoppingItem':
      return <ShoppingItemForm />;
    case 'debtPayment':
      return <AmountOnlyForm context={debtPaymentContext(s)} />;
    case 'account':
      return <AccountForm />;
    case 'category':
      return <CategoryForm />;
    case 'profile':
      return <ProfileForm />;
    case 'person':
      return <PersonForm />;
    case 'budget':
      return <BudgetForm />;
    case 'goal':
      return <GoalForm />;
    case 'goalContribute':
      return <GoalContributeForm />;
    case 'goalWithdraw':
      return <GoalWithdrawForm />;
    case 'bill':
      return <BillForm />;
    case 'billPay':
      return <AmountOnlyForm context={debtPaymentContext(s)} accountPicker />;
    case 'subscription':
      return <SubscriptionForm />;
    case 'recurring':
      return <RecurringForm />;
    case 'recoveryKey':
      return <RecoveryKeyBody />;
    case 'monthPicker':
      return <MonthPickerBody />;
    case 'confirmDelete':
      return <ConfirmDeleteBody />;
    case 'goalDelete':
      return <GoalDeleteBody />;
    case 'newShoppingList':
      return <NewShoppingListBody />;
    case 'templatePicker':
      return <TemplatePickerBody />;
    case 'shoppingCheck':
      return <ShoppingCheckBody />;
    default:
      return null;
  }
}

function debtPaymentContext(s: ReturnType<typeof useStore.getState>) {
  const debt = s.debts.find((d) => d.id === s.editId);
  if (debt) return s.people.find((p) => p.id === debt.personId)?.name || '';
  const bill = s.bills.find((b) => b.id === s.editId);
  return bill?.name || '';
}

function TxForm() {
  const s = useStore();
  const catType = s.modal === 'income' ? 'income' : 'expense';
  const categories = s.categories.filter((c) => c.type === catType).map((c) => ({ label: c.name, value: c.id }));
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  const profiles = s.profiles.map((p) => ({ label: p.name, value: p.id }));
  const currentTags = s.fTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  const suggestions = allTags(s).filter((t) => !currentTags.includes(t)).slice(0, 8);
  const addTag = (tag: string) => s.setField('fTags', currentTags.concat(tag).join(', '));
  return (
    <>
      <AmountField value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} currency={s.currency} />
      <TextField label="Title" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Weekly groceries" />
      <Field label="Category"><ChipGroup options={categories} value={s.fCatId} onChange={(v) => s.setField('fCatId', v)} /></Field>
      <Field label="Account"><ChipGroup options={accounts} value={s.fAccId} onChange={(v) => s.setField('fAccId', v)} /></Field>
      <TextField label="Tags (comma separated, optional)" value={s.fTags} onChangeText={(v) => s.setField('fTags', v)} placeholder="e.g. family, work" />
      {suggestions.length > 0 && (
        <View style={styles.tagSuggestRow}>
          {suggestions.map((tag) => (
            <Pressable key={tag} onPress={() => addTag(tag)} style={styles.tagSuggestChip}>
              <Text style={styles.tagSuggestChipText}>+ #{tag}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Field label="Profile"><ChipGroup options={profiles} value={s.fProfileId} onChange={(v) => s.setField('fProfileId', v)} /></Field>
      <ReceiptField />
    </>
  );
}

function ReceiptField() {
  const s = useStore();
  if (s.fReceiptUri) {
    return (
      <View style={{ marginBottom: 4 }}>
        <Text style={styles.fieldLabel}>Receipt</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={{ uri: s.fReceiptUri }} style={styles.receiptThumb} resizeMode="cover" />
          <Pressable onPress={s.clearReceipt}><Text style={{ color: colors.expense, fontSize: 13 }}>Remove</Text></Pressable>
        </View>
      </View>
    );
  }
  return <DashedButton label="📎 Attach receipt" onPress={s.pickReceipt} />;
}

function TransferForm() {
  const s = useStore();
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  return (
    <>
      <AmountField value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} currency={s.currency} />
      <Field label="From"><ChipGroup options={accounts} value={s.fTransferFrom} onChange={(v) => s.setField('fTransferFrom', v)} /></Field>
      <Field label="To"><ChipGroup options={accounts} value={s.fTransferTo} onChange={(v) => s.setField('fTransferTo', v)} /></Field>
    </>
  );
}

function DebtForm() {
  const s = useStore();
  const people = s.people.map((p) => ({ label: p.name, value: p.id }));
  return (
    <>
      <AmountField value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} currency={s.currency} />
      <Field label="Direction">
        <ChipGroup flexItems options={[{ label: 'I owe', value: 'owe' }, { label: 'Owed to me', value: 'owed' }]} value={s.fDebtDirection} onChange={(v) => s.setField('fDebtDirection', v as any)} />
      </Field>
      <Field label="Person"><ChipGroup options={people} value={s.fDebtPersonId} onChange={(v) => s.setField('fDebtPersonId', v)} /></Field>
      <TextField label="Or new person" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Rahim" />
      <TextField label="Reminder date (optional)" value={s.fDebtReminderDate} onChangeText={(v) => s.setField('fDebtReminderDate', v)} placeholder="e.g. 20 Aug" />
    </>
  );
}

function ShoppingItemForm() {
  const s = useStore();
  const lists = s.shoppingLists.map((l) => ({ label: l.name, value: l.id }));
  return (
    <>
      <Field label="List"><ChipGroup options={lists} value={s.fShoppingListId} onChange={(v) => s.setField('fShoppingListId', v)} /></Field>
      <TextField label="Item name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Milk" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><TextField label="Quantity" value={s.fQty} onChangeText={(v) => s.setField('fQty', v)} placeholder="e.g. 1 kg" /></View>
        <View style={{ flex: 1 }}><TextField label="Est. price" value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} placeholder="0" keyboardType="decimal-pad" /></View>
      </View>
    </>
  );
}

function AmountOnlyForm({ context, accountPicker }: { context?: string; accountPicker?: boolean }) {
  const s = useStore();
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  return (
    <>
      {!!context && <Text style={styles.context}>{context}</Text>}
      <AmountField value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} currency={s.currency} />
      {accountPicker && <Field label="Paid from"><ChipGroup options={accounts} value={s.fAccId} onChange={(v) => s.setField('fAccId', v)} /></Field>}
    </>
  );
}

function AccountForm() {
  const s = useStore();
  return (
    <>
      <TextField label="Account name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. City Bank" />
      <Field label="Type"><ChipGroup options={ACCOUNT_TYPES} value={s.fAccountType} onChange={(v) => s.setField('fAccountType', v)} /></Field>
      {s.modalMode === 'add' && <TextField label="Starting balance" value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} placeholder="0" keyboardType="decimal-pad" />}
      {s.fAccountType === 'Credit card' && <TextField label="Credit limit (optional)" value={s.fAccountCreditLimit} onChangeText={(v) => s.setField('fAccountCreditLimit', v)} placeholder="0" keyboardType="decimal-pad" />}
      <Pressable onPress={() => s.toggleModalIncludeTotal()} style={styles.checkRow}>
        <CheckBox checked={s.fAccountIncludeTotal} onPress={s.toggleModalIncludeTotal} />
        <Text style={styles.checkLabel}>Include in Total Balance</Text>
      </Pressable>
      {s.modalMode === 'edit' && <SecondaryButton label="Delete account" onPress={s.deleteAccount} color={colors.expense} />}
    </>
  );
}

function CategoryForm() {
  const s = useStore();
  return (
    <>
      {s.modalMode === 'add' && (
        <Field label="Type">
          <ChipGroup flexItems options={[{ label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }]} value={s.fCategoryType} onChange={(v) => s.setField('fCategoryType', v as any)} />
        </Field>
      )}
      <TextField label="Name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Pet Care" />
      {s.modalMode === 'edit' && <SecondaryButton label="Delete category" onPress={s.deleteCategory} color={colors.expense} />}
    </>
  );
}

function ProfileForm() {
  const s = useStore();
  return (
    <>
      <TextField label="Name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Spouse" />
      <Field label="Relationship"><ChipGroup options={RELATIONSHIPS} value={s.fRelationship} onChange={(v) => s.setField('fRelationship', v)} /></Field>
      {s.modalMode === 'edit' && s.editId !== 'me' && <SecondaryButton label="Delete profile" onPress={s.deleteProfile} color={colors.expense} />}
    </>
  );
}

function PersonForm() {
  const s = useStore();
  const isDuplicate = !!s.fTitle.trim() && s.people.some((p) => p.id !== s.editId && namesAreSimilar(p.name, s.fTitle));
  return (
    <>
      {s.modalMode === 'add' && <DashedButton label="📇 Import from Contacts" onPress={s.importFromContacts} style={{ marginBottom: 16 }} />}
      <TextField label="Name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Rahim Uddin" />
      {isDuplicate && <Text style={styles.warnText}>Did you mean an existing person? Someone with a similar name already exists.</Text>}
      <TextField label="Phone (optional)" value={s.fPhone} onChangeText={(v) => s.setField('fPhone', v)} placeholder="01712-345678" keyboardType="phone-pad" />
      <TextField label="Note (optional)" value={s.fQty} onChangeText={(v) => s.setField('fQty', v)} placeholder="e.g. Colleague" />
    </>
  );
}

function BudgetForm() {
  const s = useStore();
  const cats = s.categories.filter((c) => c.type === 'expense').map((c) => ({ label: c.name, value: c.id }));
  return (
    <>
      {s.modalMode === 'add' && <Field label="Category"><ChipGroup options={cats} value={s.fBudgetCatId} onChange={(v) => s.setField('fBudgetCatId', v)} /></Field>}
      <AmountField value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} currency={s.currency} suffix="/ month" />
      <Field label="Alert me at"><ChipGroup options={ALERT_OPTIONS} value={s.fAlertPct} onChange={(v) => s.setField('fAlertPct', v)} /></Field>
      {s.modalMode === 'edit' && (
        <>
          <Field label="Apply change to">
            <View style={{ gap: 8 }}>
              <RadioDot selected={s.fApplyScope !== 'month'} onPress={() => s.setApplyScope('going')} label="This month and going forward" />
              <RadioDot selected={s.fApplyScope === 'month'} onPress={() => s.setApplyScope('month')} label="This month only" />
            </View>
          </Field>
          <SecondaryButton label="Delete budget" onPress={s.deleteBudget} color={colors.expense} />
        </>
      )}
    </>
  );
}

function GoalForm() {
  const s = useStore();
  return (
    <>
      <TextField label="Name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. New Laptop" />
      <TextField label="Target amount" value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} placeholder="0" keyboardType="decimal-pad" />
      <TextField label="Target date (optional)" value={s.fQty} onChangeText={(v) => s.setField('fQty', v)} placeholder="e.g. Dec 2026" />
      {s.modalMode === 'edit' && <SecondaryButton label="Delete goal" onPress={s.askDeleteGoal} color={colors.expense} />}
    </>
  );
}

function GoalContributeForm() {
  const s = useStore();
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  return (
    <>
      <AmountField value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} currency={s.currency} />
      <Field label="From account"><ChipGroup options={accounts} value={s.fAccId} onChange={(v) => s.setField('fAccId', v)} /></Field>
    </>
  );
}

function GoalWithdrawForm() {
  const s = useStore();
  const g = s.goals.find((x) => x.id === s.editId);
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  return (
    <>
      <Text style={styles.context}>{`Available to withdraw: ${s.currency}${fmtAbs(g?.saved ?? 0)}`}</Text>
      <AmountField value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} currency={s.currency} />
      <Field label="To account"><ChipGroup options={accounts} value={s.fAccId} onChange={(v) => s.setField('fAccId', v)} /></Field>
    </>
  );
}

function BillForm() {
  const s = useStore();
  const cats = s.categories.filter((c) => c.type === 'expense').map((c) => ({ label: c.name, value: c.id }));
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  return (
    <>
      <TextField label="Name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Electricity" />
      <TextField label="Amount" value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} placeholder="0" keyboardType="decimal-pad" editable={!s.fBillAmountVaries} />
      <Pressable onPress={() => s.setField('fBillAmountVaries', !s.fBillAmountVaries)} style={styles.checkRow}>
        <CheckBox checked={s.fBillAmountVaries} onPress={() => s.setField('fBillAmountVaries', !s.fBillAmountVaries)} />
        <Text style={styles.checkLabel}>Amount varies each cycle</Text>
      </Pressable>
      <DateField label="Due date" value={s.fDueDate} onChange={(v) => s.setField('fDueDate', v)} />
      <Field label="Repeats"><ChipGroup options={REPEAT_OPTIONS} value={s.fRepeat} onChange={(v) => s.setField('fRepeat', v)} /></Field>
      <Field label="Category"><ChipGroup options={cats} value={s.fCatId} onChange={(v) => s.setField('fCatId', v)} /></Field>
      <Field label="Account"><ChipGroup options={accounts} value={s.fAccId} onChange={(v) => s.setField('fAccId', v)} /></Field>
      <Field label="Remind me"><ChipGroup options={REMINDER_OPTIONS} value={s.fBillReminder} onChange={(v) => s.setField('fBillReminder', v)} /></Field>
      {s.modalMode === 'edit' && <SecondaryButton label="Delete bill" onPress={s.deleteBill} color={colors.expense} />}
    </>
  );
}

function SubscriptionForm() {
  const s = useStore();
  const cats = s.categories.filter((c) => c.type === 'expense').map((c) => ({ label: c.name, value: c.id }));
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  return (
    <>
      <TextField label="Name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Netflix" />
      <TextField label="Amount" value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} placeholder="0" keyboardType="decimal-pad" />
      <Field label="Billing cycle"><ChipGroup options={REPEAT_OPTIONS} value={s.fRepeat} onChange={(v) => s.setField('fRepeat', v)} /></Field>
      <DateField label="Next billing date" value={s.fDueDate} onChange={(v) => s.setField('fDueDate', v)} />
      <Field label="Category"><ChipGroup options={cats} value={s.fCatId} onChange={(v) => s.setField('fCatId', v)} /></Field>
      <Field label="Account"><ChipGroup options={accounts} value={s.fAccId} onChange={(v) => s.setField('fAccId', v)} /></Field>
      {s.modalMode === 'edit' && <SecondaryButton label="Cancel (keep history)" onPress={s.cancelSubscription} style={{ marginBottom: 8 }} />}
    </>
  );
}

function RecurringForm() {
  const s = useStore();
  const cats = s.categories.filter((c) => c.type === s.fRecurringType).map((c) => ({ label: c.name, value: c.id }));
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  return (
    <>
      <TextField label="Name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. Rent" />
      <TextField label="Amount" value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} placeholder="0" keyboardType="decimal-pad" />
      <Field label="Type"><ChipGroup flexItems options={[{ label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }]} value={s.fRecurringType} onChange={(v) => s.setField('fRecurringType', v as any)} /></Field>
      <Field label="Category"><ChipGroup options={cats} value={s.fCatId} onChange={(v) => s.setField('fCatId', v)} /></Field>
      <Field label="Account"><ChipGroup options={accounts} value={s.fAccId} onChange={(v) => s.setField('fAccId', v)} /></Field>
      <Field label="Repeat"><ChipGroup options={REPEAT_OPTIONS} value={s.fRepeat} onChange={(v) => s.setField('fRepeat', v)} /></Field>
      <TextField label="Next occurrence" value={s.fQty} onChangeText={(v) => s.setField('fQty', v)} placeholder="e.g. 1 Oct" />
      {s.modalMode === 'edit' && <SecondaryButton label="Delete" onPress={s.deleteRecurringTx} color={colors.expense} style={{ marginBottom: 8 }} />}
    </>
  );
}

function RecoveryKeyBody() {
  const s = useStore();
  return (
    <>
      <Text style={[styles.context, { textAlign: 'left', marginBottom: 16 }]}>
        This replaces your old Recovery Key — it stops working the moment you leave this screen.
        Save the new one somewhere safe; we don't store it and can't recover it for you.
      </Text>
      <View style={styles.keyBox}><Text style={styles.keyText}>{s.newRecoveryKeyText}</Text></View>
    </>
  );
}

function MonthPickerBody() {
  const s = useStore();
  const options = Array.from({ length: 12 }, (_, i) => -i);
  return (
    <View style={{ maxHeight: 320 }}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => s.pickMonth(o)} style={[styles.monthOption, o === s.monthOffset && { backgroundColor: colors.accent }]}>
          <Text style={{ color: o === s.monthOffset ? colors.onAccent : colors.text, fontSize: 14 }}>{monthLabel(o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ConfirmDeleteBody() {
  const s = useStore();
  const hasReassign = !!s.confirmReassignRaw;
  const hasAction = !!s.confirmAction;
  return (
    <>
      <Text style={[styles.context, { textAlign: 'left', marginBottom: 16 }]}>{s.confirmMessage}</Text>
      {hasReassign && (
        <Field label="Move existing items to">
          <ChipGroup
            options={(s.confirmReassignRaw || []).map((o) => ({ label: o.label, value: o.id }))}
            value={s.confirmReassignTarget}
            onChange={s.setConfirmReassignTarget}
          />
        </Field>
      )}
      {hasAction ? (
        <>
          <Pressable onPress={s.confirmDeleteRun} style={styles.dangerBtn}><Text style={styles.dangerBtnLabel}>Delete</Text></Pressable>
          <SecondaryButton label="Cancel" onPress={s.closeModal} style={{ marginTop: 8 }} />
        </>
      ) : (
        <PrimaryButton label="OK" onPress={s.closeModal} />
      )}
    </>
  );
}

function GoalDeleteBody() {
  const s = useStore();
  const accounts = s.accounts.map((a) => ({ label: a.name, value: a.id }));
  const cats = s.categories.filter((c) => c.type === 'expense').map((c) => ({ label: c.name, value: c.id }));
  return (
    <>
      <Text style={[styles.context, { textAlign: 'left', marginBottom: 16 }]}>This money must go somewhere — choose one:</Text>
      <Pressable onPress={() => s.setGoalDeleteChoice('return')} style={styles.goalOption}>
        <RadioDot selected={s.goalDeleteChoice === 'return'} onPress={() => s.setGoalDeleteChoice('return')} label="Return it to an account" />
        {s.goalDeleteChoice === 'return' && (
          <View style={{ marginTop: 10 }}>
            <ChipGroup options={accounts} value={s.goalDeleteAccountId} onChange={s.setGoalDeleteAccountId} />
          </View>
        )}
      </Pressable>
      <Pressable onPress={() => s.setGoalDeleteChoice('writeoff')} style={styles.goalOption}>
        <RadioDot selected={s.goalDeleteChoice === 'writeoff'} onPress={() => s.setGoalDeleteChoice('writeoff')} label="Write it off as spent" />
        {s.goalDeleteChoice === 'writeoff' && (
          <View style={{ marginTop: 10 }}>
            <ChipGroup options={cats} value={s.goalDeleteCategoryId} onChange={s.setGoalDeleteCategoryId} />
          </View>
        )}
      </Pressable>
      <Pressable onPress={s.confirmGoalDelete} style={[styles.dangerBtn, { marginTop: 6 }]}><Text style={styles.dangerBtnLabel}>Delete goal</Text></Pressable>
    </>
  );
}

function NewShoppingListBody() {
  const s = useStore();
  return (
    <>
      <TextField label="List name" value={s.fTitle} onChangeText={(v) => s.setField('fTitle', v)} placeholder="e.g. August Monthly Shopping" />
      <Field label="Repeat"><ChipGroup options={REPEAT_OPTIONS} value={s.fRepeat} onChange={(v) => s.setField('fRepeat', v)} /></Field>
      <PrimaryButton label="Create list" onPress={s.createShoppingList} />
    </>
  );
}

function TemplatePickerBody() {
  const s = useStore();
  return (
    <View style={{ gap: 10 }}>
      {s.shoppingTemplates.map((t) => (
        <Pressable key={t.id} onPress={() => s.useShoppingTemplate(t.id)} style={styles.templateRow}>
          <Text style={{ fontSize: 14, color: colors.text }}>{t.name}</Text>
          <Text style={styles.mutedSmall}>{t.items.length} items</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ShoppingCheckBody() {
  const s = useStore();
  return (
    <>
      <Text style={styles.mutedSmall}>How much did you actually pay?</Text>
      <AmountField value={s.fAmount} onChangeText={(v) => s.setField('fAmount', v)} currency={s.currency} />
      <SecondaryButton label="Same as estimated" onPress={s.sameAsEstimated} style={{ marginBottom: 16 }} />
      <PrimaryButton label="Confirm" onPress={s.confirmShoppingCheck} />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  context: { textAlign: 'center', fontSize: 13, color: textAlpha(0.6), marginBottom: 6 },
  mutedSmall: { fontSize: 12, color: textAlpha(0.55) },
  fieldLabel: { fontSize: 12, color: textAlpha(0.7), marginBottom: 8 },
  receiptThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.surface },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  checkLabel: { fontSize: 12, color: colors.text },
  warnText: { fontSize: 12, color: colors.warning, marginTop: -10, marginBottom: 16 },
  formErrorText: { fontSize: 12, color: colors.expense, marginBottom: 8, textAlign: 'center' },
  tagSuggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -10, marginBottom: 16 },
  tagSuggestChip: { borderWidth: 1, borderColor: colors.divider, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  tagSuggestChipText: { fontSize: 11, color: textAlpha(0.65) },
  keyBox: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.divider, borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 20,
  },
  keyText: { fontFamily: fonts.headingSemibold, fontSize: 18, color: colors.text, letterSpacing: 1 },
  monthOption: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  dangerBtn: { backgroundColor: colors.expense, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  dangerBtnLabel: { color: colors.onExpense, fontFamily: fonts.bodyMedium, fontSize: 14 },
  goalOption: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  templateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, paddingHorizontal: 16,
  },
});
