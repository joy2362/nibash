import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, textAlpha } from '../theme';
import {
  monthLabel, monthShort, monthKey, monthTotals, fmtAbs, fmtSigned, dayFmt, computePie, catById, txSign, accountBalances,
} from '../store/helpers';
import { today, toDateStr } from '../store/now';
import { Card, ChevronLeft, ChevronRight, ProgressBar, resolveColor, SearchIcon } from '../components/primitives';
import { Sparkline, Donut } from '../components/charts';
import type { Transaction } from '../store/types';

function txView(state: ReturnType<typeof useStore.getState>, t: Transaction) {
  const cat = catById(state, t.catId);
  return {
    id: t.id,
    type: t.type,
    title: t.title,
    category: cat.name,
    color: cat.color,
    initial: t.title.charAt(0).toUpperCase(),
    date: dayFmt(t.date),
    amountColor: txSign(t) > 0 ? colors.income : colors.expense,
    amountLabel: (txSign(t) > 0 ? '+' : '−') + state.currency + fmtAbs(t.amount),
  };
}

export function HomeScreen() {
  const s = useStore();
  const off = s.monthOffset;
  const totals = monthTotals(s, off);
  const prevTotals = monthTotals(s, off - 1);
  const netThis = totals.income - totals.expense;
  const netPrev = prevTotals.income - prevTotals.expense;
  const pct = netPrev !== 0 ? Math.round(((netThis - netPrev) / Math.abs(netPrev)) * 100) : 0;
  const balances = accountBalances(s);
  const totalBalance = s.accounts.filter((a) => a.includeInTotal).reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);

  const budgetRows = s.budgets.map((b) => {
    const spent = s.transactions.filter((t) => t.type === 'expense' && t.catId === b.catId && t.date.slice(0, 7) === monthKey(off)).reduce((sum, t) => sum + t.amount, 0);
    return { spent, amount: b.amount };
  });
  const budgetSpent = budgetRows.reduce((sum, b) => sum + b.spent, 0);
  const budgetTotal = budgetRows.reduce((sum, b) => sum + b.amount, 0);

  const upcomingBills = s.bills.filter((b) => !b.paid);
  const iOweTotal = s.debts.filter((d) => d.direction === 'owe').reduce((sum, d) => sum + (d.original - d.payments.reduce((a, p) => a + p.amount, 0)), 0);
  const owedToMeTotal = s.debts.filter((d) => d.direction === 'owed').reduce((sum, d) => sum + (d.original - d.payments.reduce((a, p) => a + p.amount, 0)), 0);
  const topList = s.shoppingLists[0];
  const topChecked = topList.items.filter((i) => i.checked).length;
  const topGoal = s.goals[0];
  const subsMonthly = s.subscriptions.reduce((sum, sub) => sum + (sub.cycle === 'Yearly' ? sub.amount / 12 : sub.amount), 0);
  const profileRows = ['me', 'partner'].map((pid) => ({
    name: s.profiles.find((p) => p.id === pid)?.name || pid,
    amountFormatted: fmtAbs(s.transactions.filter((t) => t.type === 'expense' && t.profileId === pid && t.date.slice(0, 7) === monthKey(off)).reduce((sum, t) => sum + t.amount, 0)),
  }));

  const now = today();
  const last7 = [-6, -5, -4, -3, -2, -1, 0].map((offsetDays) => {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
    return toDateStr(dt);
  });
  const dayTotals = last7.map((ds) => s.transactions.filter((t) => t.date === ds && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
  const trendLabels = last7.map((ds) => String(parseInt(ds.slice(8, 10), 10)));

  const pieLegend = computePie(s, off);
  const recentTx = s.transactions
    .filter((t) => t.date.slice(0, 7) === monthKey(off))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .map((t) => txView(s, t));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.monthRow}>
        <Pressable onPress={s.monthPrev} hitSlop={8}><ChevronLeft size={16} color={textAlpha(0.55)} /></Pressable>
        <Pressable onPress={s.openMonthPicker}><Text style={styles.monthLabel}>{monthLabel(off)}</Text></Pressable>
        <Pressable onPress={s.monthNext} hitSlop={8}><ChevronRight size={16} color={textAlpha(0.55)} /></Pressable>
      </View>
      {off !== 0 && (
        <Pressable onPress={s.monthToday} style={styles.todayPill}>
          <Text style={styles.todayPillLabel}>Today</Text>
        </Pressable>
      )}

      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>Good to see you,</Text>
          <Text style={styles.meName}>{s.profiles.find((p) => p.id === 'me')?.name || s.profiles[0].name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={s.openSearch} style={styles.iconBtn}>
            <SearchIcon />
          </Pressable>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(s.profiles.find((p) => p.id === 'me')?.name || s.profiles[0].name).charAt(0).toUpperCase()}</Text></View>
        </View>
      </View>

      {s.widgets.balance && (
        <Card style={{ marginBottom: 14 }}>
          <Text style={styles.smallLabel}>Total balance</Text>
          <Text style={styles.balanceValue}>{s.currency}{fmtSigned(totalBalance)}</Text>
          <Text style={styles.balanceDelta}>{(pct >= 0 ? '+' : '') + pct}% vs. {monthShort(off - 1)}</Text>
        </Card>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 10 }}>
        {s.accounts.map((a) => {
          const bal = balances[a.id] ?? 0;
          return (
            <Pressable key={a.id} onPress={() => s.openAccountDetail(a.id)} style={styles.accountChip}>
              <Text style={styles.accountChipName} numberOfLines={1}>{a.name}</Text>
              <Text style={styles.accountChipBalance}>{(bal < 0 ? '−' : '') + s.currency + fmtAbs(bal)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {s.widgets.incomeExpense && (
        <View style={styles.grid2}>
          <Card style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Income</Text>
            <Text style={[styles.gridValue, { color: colors.income }]}>+{s.currency}{fmtAbs(totals.income)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Expense</Text>
            <Text style={[styles.gridValue, { color: colors.expense }]}>−{s.currency}{fmtAbs(totals.expense)}</Text>
          </Card>
        </View>
      )}

      {s.widgets.budget && (
        <Card onPress={s.goBudgets} style={{ marginBottom: 14 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Monthly budget</Text>
            <Text style={styles.mutedSmall}>{s.currency}{fmtAbs(budgetSpent)} / {s.currency}{fmtAbs(budgetTotal)}</Text>
          </View>
          <ProgressBar pct={budgetTotal ? (budgetSpent / budgetTotal) * 100 : 0} />
          <Text style={styles.mutedTiny}>{s.currency}{fmtAbs(Math.max(0, budgetTotal - budgetSpent))} remaining across {s.budgets.length} budgets</Text>
        </Card>
      )}

      {s.widgets.bills && (
        <Card onPress={s.goBills} style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Upcoming bills</Text>
          {upcomingBills.slice(0, 2).map((b) => (
            <View key={b.id} style={styles.rowBetween}>
              <Text style={styles.rowSmall}>{b.name} · {dayFmt(b.dueDate)}</Text>
              <Text style={styles.rowSmallHeading}>{s.currency}{fmtAbs(b.amount)}</Text>
            </View>
          ))}
          {upcomingBills.length === 0 && <Text style={styles.mutedTiny}>Nothing due soon.</Text>}
        </Card>
      )}

      {s.widgets.debts && (
        <Card onPress={s.goDebts} style={{ marginBottom: 14, flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>I owe</Text>
            <Text style={[styles.gridValue, { color: colors.expense }]}>{s.currency}{fmtAbs(iOweTotal)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Owed to me</Text>
            <Text style={[styles.gridValue, { color: colors.income }]}>{s.currency}{fmtAbs(owedToMeTotal)}</Text>
          </View>
        </Card>
      )}

      {s.widgets.shopping && (
        <Card onPress={s.goShopping} style={{ marginBottom: 14 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{topList.name}</Text>
            <Text style={styles.mutedSmall}>{topChecked}/{topList.items.length}</Text>
          </View>
          <ProgressBar pct={topList.items.length ? (topChecked / topList.items.length) * 100 : 0} />
        </Card>
      )}

      {s.widgets.goals && (
        <Card onPress={s.goGoals} style={{ marginBottom: 14 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{topGoal.name}</Text>
            <Text style={styles.mutedSmall}>{Math.min(100, Math.round((topGoal.saved / topGoal.target) * 100))}%</Text>
          </View>
          <ProgressBar pct={(topGoal.saved / topGoal.target) * 100} />
        </Card>
      )}

      {s.widgets.subscriptions && (
        <Card onPress={s.goSubscriptions} style={{ marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={styles.cardTitle}>Subscriptions</Text>
          <Text style={styles.mutedSmall}>{s.currency}{fmtAbs(subsMonthly)}/mo</Text>
        </Card>
      )}

      {s.widgets.profile && (
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Spending by profile</Text>
          {profileRows.map((row) => (
            <View key={row.name} style={styles.rowBetween}>
              <Text style={styles.rowSmall}>{row.name}</Text>
              <Text style={styles.rowSmallHeading}>{s.currency}{row.amountFormatted}</Text>
            </View>
          ))}
        </Card>
      )}

      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Spending, last 7 days</Text>
        <Text style={styles.mutedSmall}>{s.currency}{fmtAbs(dayTotals.reduce((sum, v) => sum + v, 0))} total</Text>
      </View>
      <Card style={{ marginTop: 10, marginBottom: 20, paddingBottom: 10 }}>
        <Sparkline values={dayTotals} />
        <View style={styles.rowBetween}>
          {trendLabels.map((lbl, i) => <Text key={i} style={styles.trendLabel}>{lbl}</Text>)}
        </View>
      </Card>

      <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Where it went</Text>
      <Card style={{ marginBottom: 20, flexDirection: 'row', gap: 18, alignItems: 'center' }}>
        <Donut legend={pieLegend} />
        <View style={{ flex: 1, gap: 7 }}>
          {pieLegend.map((row) => (
            <View key={row.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: resolveColor(row.color) }} />
              <Text style={styles.legendName} numberOfLines={1}>{row.name}</Text>
              <Text style={styles.mutedSmall}>{row.pct}%</Text>
            </View>
          ))}
          {pieLegend.length === 0 && <Text style={styles.mutedTiny}>No expenses this month.</Text>}
        </View>
      </Card>

      {s.widgets.recent && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Recent activity</Text>
            <Pressable onPress={s.viewAllActivity}><Text style={styles.ghostLink}>View all</Text></Pressable>
          </View>
          <View style={{ marginTop: 10 }}>
            {recentTx.map((tx) => {
              const editable = tx.type === 'income' || tx.type === 'expense';
              return (
              <Pressable key={tx.id} disabled={!editable} onPress={() => editable && s.openTxModal(tx.type as 'income' | 'expense', tx.id)} style={styles.txRow}>
                <View style={[styles.txAvatar, { backgroundColor: resolveColor(tx.color) }]}>
                  <Text style={styles.txAvatarText}>{tx.initial}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{tx.title}</Text>
                  <Text style={styles.mutedTiny}>{tx.category} · {tx.date}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.amountColor }]}>{tx.amountLabel}</Text>
              </Pressable>
              );
            })}
            {recentTx.length === 0 && <Text style={styles.mutedTiny}>No transactions this month.</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 116 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 6 },
  monthLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  todayPill: {
    alignSelf: 'center', borderWidth: 1, borderColor: colors.divider, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  todayPillLabel: { color: colors.accent, fontSize: 11 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  greeting: { fontSize: 13, color: textAlpha(0.6) },
  meName: { fontFamily: fonts.bodyMedium, fontSize: 19, color: colors.text },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.onAccent, fontFamily: fonts.bodyMedium, fontSize: 15 },
  smallLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: textAlpha(0.55), marginBottom: 6 },
  balanceValue: { fontFamily: fonts.bodyMedium, fontSize: 32, color: colors.text, letterSpacing: -0.3 },
  balanceDelta: { fontSize: 12, color: colors.income, marginTop: 4 },
  accountChip: { minWidth: 118, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  accountChipName: { fontSize: 11, color: textAlpha(0.55), marginBottom: 4 },
  accountChipBalance: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  grid2: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  gridValue: { fontFamily: fonts.bodyMedium, fontSize: 17 },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  mutedSmall: { fontSize: 12, color: textAlpha(0.55) },
  mutedTiny: { fontSize: 11, color: textAlpha(0.5) },
  rowSmall: { fontSize: 13, color: colors.text },
  rowSmallHeading: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  trendLabel: { fontSize: 10, color: textAlpha(0.45), flex: 1, textAlign: 'center' },
  legendName: { flex: 1, color: textAlpha(0.8), fontSize: 12 },
  ghostLink: { color: colors.accent, fontSize: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  txAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txAvatarText: { color: colors.bg, fontFamily: fonts.bodyMedium, fontSize: 14 },
  rowTitle: { fontSize: 14, color: colors.text },
  txAmount: { fontFamily: fonts.bodyMedium, fontSize: 14 },
});
