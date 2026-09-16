import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { colors, fonts, textAlpha } from '../../theme';
import {
  catById, accById, personById, debtRemaining, fmtAbs, dayFmt, accountBalances,
  expenseTotalFor, monthShort, txSign, dueRecurringTransactions, rangeTotals, rangeLabel,
  rangeOffsets, computePieFromTx, monthTx, type ReportRange,
} from '../../store/helpers';
import {
  Header, Card, ListRow, SegmentedTabs, DashedButton, EmptyState, ToggleSwitch, TextField,
  PrimaryButton, SecondaryButton, resolveColor, ChevronLeft, ChevronRight,
} from '../../components/primitives';
import { BarChart } from '../../components/charts';

const MENU: { key: any; label: string }[] = [
  { key: 'moreAccounts', label: 'Accounts' },
  { key: 'moreCategories', label: 'Categories' },
  { key: 'moreProfiles', label: 'Family profiles' },
  { key: 'moreDebts', label: 'Debts & people' },
  { key: 'moreBills', label: 'Bills' },
  { key: 'moreSubscriptions', label: 'Subscriptions' },
  { key: 'moreRecurring', label: 'Recurring transactions' },
  { key: 'moreReports', label: 'Reports' },
  { key: 'moreNotes', label: 'Notes' },
  { key: 'moreBackup', label: 'Backup & Restore' },
  { key: 'moreSettings', label: 'Settings' },
];

export function MoreMenuScreen() {
  const s = useStore();
  const previewFor = (key: string) => {
    switch (key) {
      case 'moreAccounts': return `${s.accounts.length} accounts`;
      case 'moreCategories': return `${s.categories.length} categories`;
      case 'moreProfiles': return `${s.profiles.length} profiles`;
      case 'moreDebts': return `${s.debts.length} debts`;
      case 'moreBills': return `${s.bills.filter((b) => !b.paid).length} due`;
      case 'moreSubscriptions': return `${s.subscriptions.length} active`;
      case 'moreNotes': return `${s.notesList.length} notes`;
      default: return '';
    }
  };
  return (
    <Screen>
      <Text style={styles.h1}>More</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {MENU.map((m, i) => (
          <ListRow
            key={m.key}
            dot="accent400"
            title={m.label}
            right={<Text style={styles.mutedSmall}>{previewFor(m.key)}</Text>}
            onPress={() => s.setDash(m.key)}
          />
        ))}
      </Card>
    </Screen>
  );
}

export function AccountsScreen() {
  const s = useStore();
  const balances = accountBalances(s);
  return (
    <Screen>
      <Header title="Accounts" onBack={s.backToMore} right={<AddBtn label="+ Add" onPress={s.openAddAccount} />} />
      <View style={{ gap: 10 }}>
        {s.accounts.map((a) => {
          const bal = balances[a.id] ?? 0;
          return (
            <Card key={a.id} onPress={() => s.openAccountDetail(a.id)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.rowText}>{a.name}</Text>
                <Text style={styles.mutedTiny}>{a.type}</Text>
              </View>
              <Text style={styles.balanceText}>{(bal < 0 ? '−' : '') + s.currency + fmtAbs(bal)}</Text>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

export function AccountDetailScreen() {
  const s = useStore();
  const acc = accById(s, s.activeAccountId);
  const balance = accountBalances(s)[acc.id] ?? 0;
  const tx = s.transactions.filter((t) => t.accountId === s.activeAccountId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  return (
    <Screen>
      <Header title={acc.name} onBack={s.backToAccounts} right={<Pressable onPress={s.openEditAccount}><Text style={styles.ghostLink}>Edit</Text></Pressable>} />
      <Card style={{ marginBottom: 20 }}>
        <Text style={styles.mutedLabel}>Balance</Text>
        <Text style={styles.bigValue}>{s.currency}{fmtAbs(balance)}</Text>
      </Card>
      <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Transactions on this account</Text>
      {tx.map((t) => {
        const cat = catById(s, t.catId);
        const sign = txSign(t);
        return (
          <View key={t.id} style={styles.txRow}>
            <View style={[styles.txAvatar, { backgroundColor: resolveColor(cat.color) }]}><Text style={styles.txAvatarText}>{t.title.charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowText}>{t.title}</Text>
              <Text style={styles.mutedTiny}>{cat.name} · {t.date}</Text>
            </View>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: sign > 0 ? colors.income : colors.expense }}>
              {(sign > 0 ? '+' : '−') + s.currency + fmtAbs(t.amount)}
            </Text>
          </View>
        );
      })}
      {tx.length === 0 && <EmptyState text="No transactions yet on this account." />}
    </Screen>
  );
}

export function CategoriesScreen() {
  const s = useStore();
  const cats = s.categories.filter((c) => c.type === s.catTab);
  return (
    <Screen>
      <Header title="Categories" onBack={s.backToMore} />
      <View style={{ marginBottom: 16 }}>
        <SegmentedTabs options={[{ label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }]} value={s.catTab} onChange={s.setCatTab} />
      </View>
      <View style={{ marginBottom: 16 }}>
        {cats.map((cat) => (
          <ListRow key={cat.id} dot={cat.color} title={cat.name} onPress={() => s.editCategory(cat.id)} right={<View />} />
        ))}
      </View>
      <DashedButton label="+ Add category" onPress={s.openAddCategory} />
    </Screen>
  );
}

export function ProfilesScreen() {
  const s = useStore();
  return (
    <Screen>
      <Header title="Family profiles" onBack={s.backToMore} />
      <View style={{ gap: 10, marginBottom: 16 }}>
        {s.profiles.map((p) => (
          <Card key={p.id} onPress={() => s.editProfile(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{p.name.charAt(0)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{p.name}</Text>
              <Text style={styles.mutedTiny}>{p.relationship}</Text>
            </View>
          </Card>
        ))}
      </View>
      <DashedButton label="+ Add profile" onPress={s.openAddProfile} />
    </Screen>
  );
}

export function DebtsAndPeopleScreen() {
  const s = useStore();
  const iOwe = s.debts.filter((d) => d.direction === 'owe').reduce((sum, d) => sum + debtRemaining(d), 0);
  const owedToMe = s.debts.filter((d) => d.direction === 'owed').reduce((sum, d) => sum + debtRemaining(d), 0);
  return (
    <Screen>
      <Header title="Debts" onBack={s.backToMore} />
      <View style={{ marginBottom: 16 }}>
        <SegmentedTabs options={[{ label: 'Debts', value: 'debts' }, { label: 'People', value: 'people' }]} value={s.debtsTab} onChange={s.setDebtsTab} />
      </View>
      {s.debtsTab === 'debts' ? (
        <>
          <View style={styles.grid2}>
            <Card style={{ flex: 1 }}>
              <Text style={styles.mutedLabel}>I owe</Text>
              <Text style={[styles.gridValue, { color: colors.expense }]}>{s.currency}{fmtAbs(iOwe)}</Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <Text style={styles.mutedLabel}>Owed to me</Text>
              <Text style={[styles.gridValue, { color: colors.accent300 }]}>{s.currency}{fmtAbs(owedToMe)}</Text>
            </Card>
          </View>
          <View style={{ gap: 10 }}>
            {s.debts.map((d) => {
              const p = personById(s, d.personId);
              return (
                <Card key={d.id} onPress={() => s.openDebtDetail(d.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText}>{p.name}</Text>
                    <Text style={styles.mutedTiny}>{d.direction === 'owe' ? 'You owe' : 'Owes you'}</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: d.direction === 'owed' ? colors.income : colors.expense }}>
                    {s.currency}{fmtAbs(debtRemaining(d))}
                  </Text>
                </Card>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <View style={{ gap: 10, marginBottom: 16 }}>
            {s.people.map((p) => {
              const owe = s.debts.filter((d) => d.personId === p.id && d.direction === 'owe').reduce((sum, d) => sum + debtRemaining(d), 0);
              const owed = s.debts.filter((d) => d.personId === p.id && d.direction === 'owed').reduce((sum, d) => sum + debtRemaining(d), 0);
              const net = owed - owe;
              return (
                <Card key={p.id} onPress={() => s.openPersonDetail(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{p.name.charAt(0)}</Text></View>
                  <Text style={[styles.rowText, { flex: 1 }]}>{p.name}</Text>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: textAlpha(0.6) }}>{(net >= 0 ? '+' : '−') + s.currency + fmtAbs(net)}</Text>
                </Card>
              );
            })}
          </View>
          <DashedButton label="+ Add person" onPress={s.openAddPerson} />
        </>
      )}
    </Screen>
  );
}

export function PersonDetailScreen() {
  const s = useStore();
  const p = personById(s, s.activePersonId);
  const debts = s.debts.filter((d) => d.personId === s.activePersonId);
  const iOwe = debts.filter((d) => d.direction === 'owe').reduce((sum, d) => sum + debtRemaining(d), 0);
  const owesMe = debts.filter((d) => d.direction === 'owed').reduce((sum, d) => sum + debtRemaining(d), 0);
  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={s.backToPeople} hitSlop={10}><ChevronLeft /></Pressable>
        <Text style={[styles.h2, { flex: 1 }]}>{p.name}</Text>
        <Pressable onPress={() => s.editPerson(p.id)}><Text style={[styles.ghostLink, { marginRight: 14 }]}>Edit</Text></Pressable>
        <Pressable onPress={s.deletePerson}><Text style={{ color: colors.expense, fontSize: 13 }}>Delete</Text></Pressable>
      </View>
      <Text style={[styles.mutedSmall, { marginBottom: 16 }]}>{p.phone}</Text>
      <View style={styles.grid2}>
        <Card style={{ flex: 1 }}><Text style={styles.mutedLabel}>I owe</Text><Text style={styles.midValue}>{s.currency}{fmtAbs(iOwe)}</Text></Card>
        <Card style={{ flex: 1 }}><Text style={styles.mutedLabel}>Owes me</Text><Text style={[styles.midValue, { color: colors.accent300 }]}>{s.currency}{fmtAbs(owesMe)}</Text></Card>
      </View>
      <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Debts</Text>
      <View style={{ gap: 8 }}>
        {debts.map((d) => (
          <Card key={d.id} onPress={() => s.openDebtDetail(d.id)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.smallBody}>{d.direction === 'owe' ? 'You owe' : 'Owes you'}</Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text }}>{s.currency}{fmtAbs(debtRemaining(d))}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

export function DebtDetailScreen() {
  const s = useStore();
  const debt = s.debts.find((d) => d.id === s.activeDebtId) || s.debts[0];
  const person = personById(s, debt.personId);
  const paid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = debt.original - paid;
  return (
    <Screen>
      <Header title={person.name} onBack={s.backToDebts} />
      <Text style={[styles.mutedSmall, { marginBottom: 16 }]}>{debt.direction === 'owe' ? `You owe ${person.name}` : `${person.name} owes you`}</Text>
      <View style={styles.summaryGrid}>
        <View><Text style={styles.mutedTiny}>Original</Text><Text style={styles.summaryValue}>{s.currency}{fmtAbs(debt.original)}</Text></View>
        <View><Text style={styles.mutedTiny}>Paid</Text><Text style={styles.summaryValue}>{s.currency}{fmtAbs(paid)}</Text></View>
        <View><Text style={styles.mutedTiny}>Remaining</Text><Text style={[styles.summaryValue, { color: colors.accent300 }]}>{s.currency}{fmtAbs(remaining)}</Text></View>
      </View>
      <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Payment history</Text>
      <View style={{ marginBottom: 16 }}>
        {debt.payments.map((p, i) => (
          <View key={i} style={styles.paymentRow}>
            <Text style={styles.mutedSmall}>{p.date}</Text>
            <Text style={{ fontFamily: fonts.bodyMedium, color: colors.text }}>{s.currency}{fmtAbs(p.amount)}</Text>
          </View>
        ))}
        {debt.payments.length === 0 && <EmptyState text="No payments yet." />}
      </View>
      {remaining <= 0 ? (
        <Text style={{ textAlign: 'center', color: colors.accent300, fontSize: 13 }}>Settled in full.</Text>
      ) : (
        <PrimaryButton label="Add payment" onPress={s.openDebtPaymentModal} />
      )}
    </Screen>
  );
}

export function BillsScreen() {
  const s = useStore();
  return (
    <Screen>
      <Header title="Bills" onBack={s.backToMore} right={<AddBtn label="+ Add" onPress={s.openAddBill} />} />
      <View style={{ gap: 10 }}>
        {s.bills.map((b) => {
          const cat = catById(s, b.catId);
          return (
            <Card key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => s.payBill(b.id)}>
                <Text style={styles.rowText}>{b.name}</Text>
                <Text style={{ fontSize: 11, color: b.paid ? colors.income : colors.warning }}>{b.paid ? 'Paid' : 'Due'} · {dayFmt(b.dueDate)}</Text>
              </Pressable>
              <Pressable onPress={() => s.payBill(b.id)}><Text style={styles.balanceText}>{s.currency}{fmtAbs(b.amount)}</Text></Pressable>
              <Pressable onPress={() => s.editBill(b.id)} hitSlop={8}><Text style={{ color: textAlpha(0.5) }}>✎</Text></Pressable>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

export function SubscriptionsScreen() {
  const s = useStore();
  const monthly = s.subscriptions.reduce((sum, sub) => sum + (sub.cycle === 'Yearly' ? sub.amount / 12 : sub.amount), 0);
  return (
    <Screen>
      <Header title="Subscriptions" onBack={s.backToMore} right={<AddBtn label="+ Add" onPress={s.openAddSubscription} />} />
      <View style={styles.grid2}>
        <Card style={{ flex: 1 }}><Text style={styles.mutedLabel}>Monthly</Text><Text style={styles.midValue}>{s.currency}{fmtAbs(monthly)}</Text></Card>
        <Card style={{ flex: 1 }}><Text style={styles.mutedLabel}>Yearly</Text><Text style={styles.midValue}>{s.currency}{fmtAbs(monthly * 12)}</Text></Card>
      </View>
      <View style={{ gap: 10 }}>
        {s.subscriptions.map((sub) => (
          <Card key={sub.id} onPress={() => s.editSubscription(sub.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{sub.name}</Text>
              <Text style={styles.mutedTiny}>{sub.cycle} · Next {dayFmt(sub.nextDate)}</Text>
            </View>
            <Text style={styles.balanceText}>{s.currency}{fmtAbs(sub.amount)}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

export function RecurringScreen() {
  const s = useStore();
  const due = dueRecurringTransactions(s);
  return (
    <Screen>
      <Header title="Recurring transactions" onBack={s.backToMore} right={<AddBtn label="+ Add" onPress={s.openAddRecurring} />} />
      {due.length > 0 && (
        <View style={{ gap: 10, marginBottom: 20 }}>
          <Text style={styles.cardTitle}>Due now</Text>
          {due.map((r) => {
            const cat = catById(s, r.catId);
            return (
              <Card key={r.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.rowText}>{r.title}</Text>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: r.type === 'income' ? colors.income : colors.expense }}>
                    {(r.type === 'income' ? '+' : '−') + s.currency + fmtAbs(r.amount)}
                  </Text>
                </View>
                <Text style={styles.mutedTiny}>{cat.name} · {r.repeat}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Pressable onPress={() => s.skipRecurringTx(r.id)} style={[styles.smallOutlineBtn, { flex: 1, alignItems: 'center' }]}><Text style={styles.smallOutlineBtnLabel}>Skip</Text></Pressable>
                  <Pressable onPress={() => s.logRecurringTx(r.id)} style={[styles.smallOutlineBtn, { flex: 1, alignItems: 'center' }]}><Text style={[styles.smallOutlineBtnLabel, { color: colors.accent }]}>{r.type === 'income' ? 'Add Income' : 'Add Expense'}</Text></Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      )}
      <Text style={[styles.cardTitle, { marginBottom: 10 }]}>All recurring</Text>
      <View style={{ gap: 10 }}>
        {s.recurringTransactions.map((r) => {
          const cat = catById(s, r.catId);
          return (
            <Card key={r.id} onPress={() => s.editRecurring(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{r.title}</Text>
                <Text style={styles.mutedTiny}>{r.repeat} · {cat.name}</Text>
              </View>
              <Text style={[styles.balanceText, { color: r.type === 'income' ? colors.income : colors.text }]}>
                {r.type === 'income' ? '+' : '−'}{s.currency}{fmtAbs(r.amount)}
              </Text>
            </Card>
          );
        })}
        {s.recurringTransactions.length === 0 && <EmptyState text="No recurring transactions yet." />}
      </View>
    </Screen>
  );
}

const RANGE_OPTIONS = [
  { label: 'This month', value: 'month' }, { label: 'Last 3mo', value: '3mo' },
  { label: 'Last 6mo', value: '6mo' }, { label: 'This year', value: 'year' },
];

export function ReportsScreen() {
  const s = useStore();
  const off = s.monthOffset;
  const [range, setRange] = React.useState<ReportRange>('month');
  const totals = rangeTotals(s, range, off);
  const savings = totals.income - totals.expense;
  const prevRangeSpan = rangeOffsets(range, off).length;
  const prevExpense = (range === 'month' ? expenseTotalFor(s, off - 1) : rangeTotals(s, range, off - prevRangeSpan).expense) || 1;
  const expenseDeltaPct = Math.round(((totals.expense - prevExpense) / prevExpense) * 100);
  const periodPhrase = range === 'month' ? 'this month than last month' : 'this period than the previous one';
  const subsMonthly = s.subscriptions.reduce((sum, sub) => sum + (sub.cycle === 'Yearly' ? sub.amount / 12 : sub.amount), 0);
  const insights = [
    (expenseDeltaPct >= 0 ? `💡 You spent ${expenseDeltaPct}% more ` : `💡 You spent ${Math.abs(expenseDeltaPct)}% less `) + periodPhrase + '.',
    `🔔 ${s.subscriptions.length} active subscriptions costing ${s.currency}${fmtAbs(subsMonthly)}/month.`,
  ];
  const rangeTx = rangeOffsets(range, off).flatMap((o) => monthTx(s, o)).filter((t) => t.type === 'expense');
  const pieLegend = computePieFromTx(s, rangeTx);
  const trendOffsets = [-5, -4, -3, -2, -1, 0];
  const trendVals = trendOffsets.map((o) => expenseTotalFor(s, off + o));
  const maxTrend = Math.max(...trendVals, 1);
  const trendBars = trendOffsets.map((o, i) => ({ h: Math.round((trendVals[i] / maxTrend) * 100), label: monthShort(off + o) }));

  return (
    <Screen>
      <Header title="Reports" onBack={s.backToMore} />
      <View style={styles.monthRow}>
        <Pressable onPress={s.monthPrev} hitSlop={8}><ChevronLeft size={16} color={textAlpha(0.55)} /></Pressable>
        <Text style={styles.monthLabel}>{rangeLabel(range, off)}</Text>
        <Pressable onPress={s.monthNext} hitSlop={8}><ChevronRight size={16} color={textAlpha(0.55)} /></Pressable>
      </View>
      <View style={{ marginBottom: 20 }}>
        <SegmentedTabs options={RANGE_OPTIONS} value={range} onChange={(v) => setRange(v as ReportRange)} />
      </View>
      <View style={styles.summaryGrid}>
        <View><Text style={styles.mutedTiny}>Income</Text><Text style={[styles.summaryValue, { color: colors.accent300 }]}>{s.currency}{fmtAbs(totals.income)}</Text></View>
        <View><Text style={styles.mutedTiny}>Expense</Text><Text style={styles.summaryValue}>{s.currency}{fmtAbs(totals.expense)}</Text></View>
        <View><Text style={styles.mutedTiny}>Saved</Text><Text style={styles.summaryValue}>{s.currency}{fmtAbs(savings)}</Text></View>
      </View>
      <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Insights</Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {insights.map((t, i) => <Card key={i}><Text style={styles.smallBody}>{t}</Text></Card>)}
      </View>
      <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Expense by category</Text>
      <Card style={{ marginBottom: 20, gap: 8 }}>
        {pieLegend.map((row) => (
          <View key={row.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: resolveColor(row.color) }} />
            <Text style={[styles.smallBody, { flex: 1 }]}>{row.name}</Text>
            <Text style={styles.mutedSmall}>{row.pct}%</Text>
          </View>
        ))}
      </Card>
      <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Monthly trend</Text>
      <Card>
        <BarChart bars={trendBars} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          {trendBars.map((tb, i) => <Text key={i} style={[styles.mutedTiny, { flex: 1, textAlign: 'center' }]}>{tb.label}</Text>)}
        </View>
      </Card>
    </Screen>
  );
}

export function NotesScreen() {
  const s = useStore();
  return (
    <Screen>
      <Header title="Notes" onBack={s.backToMore} />
      <TextField value={s.newNoteText} onChangeText={s.setNewNoteText} placeholder="Write a note..." multiline />
      <SecondaryButton label="Add note" onPress={s.addNote} style={{ marginBottom: 20 }} />
      <View style={{ gap: 8 }}>
        {s.notesList.map((n) => (
          <Card key={n.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Text style={[styles.smallBody, { flex: 1 }]}>{n.text}</Text>
            <Pressable onPress={() => s.deleteNote(n.id)}><Text style={{ color: textAlpha(0.45), fontSize: 16 }}>×</Text></Pressable>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function lastExportLabel(ts: number): string {
  if (!ts) return 'You haven’t exported a backup yet.';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'Last exported today.';
  if (days === 1) return 'Last exported yesterday.';
  return `Last exported ${days} days ago.`;
}

function lastAutoBackupLabel(ts: number): string {
  if (!ts) return 'No automatic backup yet — one will be written the next time you open the app.';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'Last automatic backup: today.';
  if (days === 1) return 'Last automatic backup: yesterday.';
  return `Last automatic backup: ${days} days ago.`;
}

export function BackupScreen() {
  const s = useStore();
  const stale = s.lastExportAt > 0 && Date.now() - s.lastExportAt > 30 * 86400000;
  return (
    <Screen>
      <Header title="Backup & Restore" onBack={s.backToMore} />
      <Text style={[styles.mutedSmall, { marginBottom: 8, lineHeight: 18 }]}>All data lives on this device only. Export a backup somewhere safe (Drive, Files, another device) so nothing is lost if this device is reset.</Text>
      <Text style={[styles.mutedTiny, { marginBottom: 20, color: stale ? colors.warning : textAlpha(0.5) }]}>{lastExportLabel(s.lastExportAt)}</Text>

      {s.restorePending ? (
        <Card style={{ marginBottom: 20, gap: 12 }}>
          <Text style={styles.smallBody}>Restore this backup? It replaces <Text style={{ color: colors.expense }}>all</Text> data currently on this device.</Text>
          {s.restorePending.encrypted && (
            <TextField label="Backup password" value={s.restorePassword} onChangeText={s.setRestorePassword} secureTextEntry />
          )}
          <PrimaryButton label={s.backupBusy ? 'Restoring…' : 'Replace all data'} onPress={s.confirmRestore} />
          <SecondaryButton label="Cancel" onPress={s.cancelRestore} />
        </Card>
      ) : (
        <>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Text style={[styles.smallBody, { flex: 1 }]}>Encrypt this backup</Text>
            <ToggleSwitch value={s.backupEncrypt} onToggle={s.toggleBackupEncrypt} />
          </Card>
          {s.backupEncrypt && (
            <>
              <Pressable onPress={s.toggleUseRecoveryKey} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={[styles.checkbox, { borderColor: s.useRecoveryKey ? colors.accent : colors.divider, backgroundColor: s.useRecoveryKey ? colors.accent : 'transparent' }]} />
                <Text style={{ fontSize: 12, color: colors.text }}>Use my Recovery Key as the password</Text>
              </Pressable>
              {s.useRecoveryKey ? (
                <TextField label="Recovery Key" value={s.backupPassword} onChangeText={s.setBackupPassword} placeholder="XXXX-XXXX-XXXX-XXXX" />
              ) : (
                <>
                  <TextField label="Password" value={s.backupPassword} onChangeText={s.setBackupPassword} secureTextEntry />
                  <TextField label="Confirm password" value={s.backupPasswordConfirm} onChangeText={s.setBackupPasswordConfirm} secureTextEntry />
                </>
              )}
            </>
          )}
          <PrimaryButton label={s.backupBusy ? 'Working…' : 'Export backup'} onPress={s.runBackup} style={{ marginBottom: 10 }} />
          <SecondaryButton label="Restore from a backup file" onPress={s.runRestore} style={{ marginBottom: 20 }} />
        </>
      )}

      <Text style={styles.mutedLabel}>Data exports (unencrypted, not restorable)</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 }}>
        <SecondaryButton label="CSV" onPress={s.exportCsv} style={{ flex: 1, height: 40 }} />
        <SecondaryButton label="JSON" onPress={s.exportJson} style={{ flex: 1, height: 40 }} />
        <SecondaryButton label="PDF" onPress={s.exportPdf} style={{ flex: 1, height: 40 }} />
      </View>
      {!!s.backupToastText && <Text style={{ textAlign: 'center', fontSize: 12, color: colors.accent300, marginBottom: 8 }}>{s.backupToastText}</Text>}

      <Text style={[styles.mutedLabel, { marginTop: 16 }]}>Automatic on-device backup</Text>
      <View style={{ marginTop: 8 }}>
        <SegmentedTabs
          options={[{ label: 'Off', value: 'Off' }, { label: 'Daily', value: 'Daily' }, { label: 'Weekly', value: 'Weekly' }]}
          value={s.autoBackupOption}
          onChange={s.setAutoBackupOption}
        />
      </View>
      {s.autoBackupOption !== 'Off' && (
        <Text style={[styles.mutedTiny, { marginTop: 8 }]}>{lastAutoBackupLabel(s.lastAutoBackupAt)}</Text>
      )}
      <Text style={[styles.mutedTiny, { marginTop: 8 }]}>On-device auto-backup keeps a local copy only — it can’t protect against losing the device. Export off-device regularly.</Text>
    </Screen>
  );
}

export function SettingsScreen() {
  const s = useStore();
  const widgetLabels: [keyof typeof s.widgets, string][] = [
    ['balance', 'Total balance'], ['incomeExpense', 'Income & expense'], ['budget', 'Monthly budget'],
    ['bills', 'Upcoming bills'], ['debts', 'Debts'], ['shopping', 'Shopping lists'], ['goals', 'Savings goals'],
    ['subscriptions', 'Subscriptions'], ['profile', 'Spending by profile'], ['recent', 'Recent activity'],
  ];
  return (
    <Screen>
      <Header title="Settings" onBack={s.backToMore} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <View style={[styles.avatar, { width: 48, height: 48, borderRadius: 24 }]}><Text style={styles.avatarText}>A</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text }}>Alex Rahman</Text>
          <Text style={styles.mutedSmall}>alex.rahman@email.com</Text>
        </View>
      </Card>

      <Text style={styles.mutedLabel}>Preferences</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8, marginBottom: 20 }}>
        <View style={styles.settingsRow}>
          <Text style={[styles.smallBody, { flex: 1 }]}>Currency</Text>
          <SegmentedTabs options={['৳', '$', '€'].map((c) => ({ label: c, value: c }))} value={s.currency} onChange={s.setCurrency} />
        </View>
        <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.smallBody, { flex: 1 }]}>Dark appearance</Text>
          <Text style={styles.mutedTiny}>Always on</Text>
        </View>
      </Card>

      <Text style={styles.mutedLabel}>Security</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8, marginBottom: 8 }}>
        <View style={styles.settingsRow}>
          <Text style={[styles.smallBody, { flex: 1 }]}>App lock (PIN)</Text>
          <ToggleSwitch value={s.pinLockOn} onToggle={s.togglePinLock} />
        </View>
        <View style={styles.settingsRow}>
          <Text style={[styles.smallBody, { flex: 1 }]}>Unlock with fingerprint</Text>
          <ToggleSwitch value={s.biometricOn} onToggle={s.toggleBiometric} />
        </View>
        <Pressable onPress={s.openRecoveryKey} style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.smallBody, { flex: 1 }]}>Regenerate recovery key</Text>
        </Pressable>
      </Card>
      {!!s.securityMessage && <Text style={[styles.mutedTiny, { marginBottom: 12 }]}>{s.securityMessage}</Text>}

      <Text style={styles.mutedLabel}>Notifications</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8, marginBottom: s.notifMessage ? 8 : 20 }}>
        <View style={styles.settingsRow}>
          <Text style={[styles.smallBody, { flex: 1 }]}>Bill, subscription &amp; debt reminders</Text>
          <ToggleSwitch value={s.notifOn} onToggle={s.toggleNotif} />
        </View>
        <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.smallBody, { flex: 1 }]}>Weekly summary notification</Text>
          <ToggleSwitch value={s.weeklyEmailOn} onToggle={s.toggleWeeklyEmail} />
        </View>
      </Card>
      {s.weeklyEmailOn && (
        <Text style={[styles.mutedTiny, { marginTop: -12, marginBottom: 20 }]}>
          Nibash is offline, so this is a local notification, not an email — a quick income/expense digest for the last 7 days.
        </Text>
      )}
      {!!s.notifMessage && <Text style={[styles.mutedTiny, { marginBottom: 20 }]}>{s.notifMessage}</Text>}

      <Text style={styles.mutedLabel}>Customize dashboard</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8, marginBottom: 20 }}>
        {widgetLabels.map(([key, label], i) => (
          <View key={key} style={[styles.settingsRow, i === widgetLabels.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={[styles.smallBody, { flex: 1 }]}>{label}</Text>
            <ToggleSwitch value={s.widgets[key]} onToggle={() => s.toggleWidget(key)} />
          </View>
        ))}
      </Card>

      <Text style={styles.mutedLabel}>Help</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8, marginBottom: 20 }}>
        <Pressable onPress={s.openWelcomeTour} style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.smallBody, { flex: 1 }]}>Replay welcome tour</Text>
        </Pressable>
      </Card>

      <Text style={styles.mutedLabel}>About</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8, marginBottom: 20 }}>
        <View style={styles.settingsRow}><Text style={styles.smallBody}>Privacy policy</Text></View>
        <View style={styles.settingsRow}><Text style={styles.smallBody}>Terms of service</Text></View>
        <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.smallBody, { color: textAlpha(0.55) }]}>Version</Text>
          <Text style={[styles.mutedTiny, { marginLeft: 'auto' }]}>1.0.0</Text>
        </View>
      </Card>
      <SecondaryButton label="Sign out" onPress={() => {}} />
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

function AddBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: colors.divider, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ color: colors.accent, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 116 },
  h1: { fontFamily: fonts.bodyMedium, fontSize: 19, color: colors.text, marginBottom: 16 },
  h2: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  rowText: { fontSize: 14, color: colors.text },
  smallBody: { fontSize: 13, color: colors.text },
  mutedSmall: { fontSize: 12, color: textAlpha(0.55) },
  mutedTiny: { fontSize: 11, color: textAlpha(0.5) },
  mutedLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: textAlpha(0.5) },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  ghostLink: { color: colors.accent, fontSize: 13 },
  balanceText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  bigValue: { fontFamily: fonts.bodyMedium, fontSize: 28, color: colors.text },
  midValue: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  grid2: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  gridValue: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.onAccent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  txAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txAvatarText: { color: colors.bg, fontFamily: fonts.bodyMedium, fontSize: 14 },
  summaryGrid: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 20, gap: 10 },
  summaryValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 4 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 },
  monthLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  smallOutlineBtn: { borderWidth: 1, borderColor: colors.divider, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  smallOutlineBtnLabel: { fontSize: 12, color: colors.text },
});
