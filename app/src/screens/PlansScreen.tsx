import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, textAlpha } from '../theme';
import { monthLabel, monthInfo, monthTx, catById, fmtAbs } from '../store/helpers';
import { todayStr } from '../store/now';
import {
  SegmentedTabs, Card, ChevronLeft, ChevronRight, ProgressBar, DashedButton, EmptyState, ChipGroup,
} from '../components/primitives';

const REPEAT_OPTIONS = ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly', 'Custom'].map((r) => ({ label: r, value: r }));

const TABS: { label: string; value: AppPlansTab }[] = [
  { label: 'Lists', value: 'lists' }, { label: 'Budgets', value: 'budgets' },
  { label: 'Goals', value: 'goals' }, { label: 'Calendar', value: 'calendar' },
];
type AppPlansTab = 'lists' | 'budgets' | 'goals' | 'calendar';

export function PlansScreen() {
  const s = useStore();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ marginBottom: 18 }}>
        <SegmentedTabs options={TABS} value={s.plansTab} onChange={s.setPlansTab} />
      </View>
      {s.plansTab === 'lists' && <ListsTab />}
      {s.plansTab === 'budgets' && <BudgetsTab />}
      {s.plansTab === 'goals' && <GoalsTab />}
      {s.plansTab === 'calendar' && <CalendarTab />}
    </ScrollView>
  );
}

function ListsTab() {
  const s = useStore();
  return (
    <>
      <View style={styles.rowBetween}>
        <Text style={styles.h2}>Shopping lists</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={s.openTemplatePicker} style={styles.smallOutlineBtn}><Text style={styles.smallOutlineBtnLabel}>From template</Text></Pressable>
          <Pressable onPress={s.addShoppingList} style={styles.smallOutlineBtn}><Text style={[styles.smallOutlineBtnLabel, { color: colors.accent }]}>+ New list</Text></Pressable>
        </View>
      </View>
      <View style={{ gap: 10 }}>
        {s.shoppingLists.map((lst) => {
          const checked = lst.items.filter((i) => i.checked).length;
          return (
            <Card key={lst.id} onPress={() => s.openShoppingDetail(lst.id)}>
              <View style={styles.rowBetween}>
                <Text style={styles.rowText}>{lst.name}</Text>
                <Text style={styles.mutedSmall}>{checked}/{lst.items.length}</Text>
              </View>
              <ProgressBar pct={lst.items.length ? (checked / lst.items.length) * 100 : 0} />
              {!!lst.repeat && lst.repeat !== 'One-time' && <Text style={[styles.mutedTiny, { marginTop: 6 }]}>Repeats: {lst.repeat}</Text>}
            </Card>
          );
        })}
      </View>
    </>
  );
}

function BudgetsTab() {
  const s = useStore();
  const off = s.monthOffset;
  const budgetsView = s.budgets.map((b) => {
    const cat = catById(s, b.catId);
    const overrideAmt = s.budgetOverrides[`${b.id}:${off}`];
    const amount = overrideAmt != null ? overrideAmt : b.amount;
    const spent = monthTx(s, off).filter((t) => t.type === 'expense' && t.catId === b.catId).reduce((sum, t) => sum + t.amount, 0);
    const pct = Math.min(100, Math.round((spent / amount) * 100));
    return { id: b.id, category: cat.name, spent, amount, pct, warn: pct >= 90, barColor: pct >= 100 ? colors.expense : pct >= 90 ? colors.warning : colors.income };
  });
  return (
    <>
      <View style={styles.monthRow}>
        <Pressable onPress={s.monthPrev} hitSlop={8}><ChevronLeft size={16} color={textAlpha(0.55)} /></Pressable>
        <Text style={styles.monthLabel}>{monthLabel(off)}</Text>
        <Pressable onPress={s.monthNext} hitSlop={8}><ChevronRight size={16} color={textAlpha(0.55)} /></Pressable>
      </View>
      <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
        <Pressable onPress={s.openAddBudget} style={styles.smallOutlineBtn}><Text style={[styles.smallOutlineBtnLabel, { color: colors.accent }]}>+ Add budget</Text></Pressable>
      </View>
      <View style={{ gap: 10 }}>
        {budgetsView.map((b) => (
          <Card key={b.id} onPress={() => s.editBudget(b.id)}>
            <View style={styles.rowBetween}>
              <Text style={styles.rowText}>{b.category}</Text>
              <Text style={styles.mutedSmall}>{s.currency}{fmtAbs(b.spent)} / {s.currency}{fmtAbs(b.amount)}</Text>
            </View>
            <ProgressBar pct={b.pct} color={b.barColor} />
            {b.warn && <Text style={[styles.warnText, { marginTop: 6 }]}>Used {b.pct}% of this budget.</Text>}
          </Card>
        ))}
        {budgetsView.length === 0 && <EmptyState text="No budgets yet." />}
      </View>
    </>
  );
}

function GoalsTab() {
  const s = useStore();
  return (
    <>
      <View style={styles.rowBetween}>
        <Text style={styles.h2}>Savings goals</Text>
        <Pressable onPress={s.openAddGoal} style={styles.smallOutlineBtn}><Text style={[styles.smallOutlineBtnLabel, { color: colors.accent }]}>+ Add goal</Text></Pressable>
      </View>
      <View style={{ gap: 10 }}>
        {s.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          return (
            <Card key={g.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.rowText}>{g.name}</Text>
                <Text style={styles.mutedSmall}>{s.currency}{fmtAbs(g.saved)} / {s.currency}{fmtAbs(g.target)}</Text>
              </View>
              <ProgressBar pct={pct} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable onPress={() => s.contributeGoal(g.id)} style={[styles.smallOutlineBtn, { flex: 1, alignItems: 'center' }]}><Text style={[styles.smallOutlineBtnLabel, { color: colors.accent }]}>Add money</Text></Pressable>
                {g.saved > 0 && <Pressable onPress={() => s.withdrawGoal(g.id)} style={[styles.smallOutlineBtn, { flex: 1, alignItems: 'center' }]}><Text style={styles.smallOutlineBtnLabel}>Withdraw</Text></Pressable>}
                <Pressable onPress={() => s.editGoal(g.id)} style={[styles.smallOutlineBtn, { flex: 1, alignItems: 'center' }]}><Text style={styles.smallOutlineBtnLabel}>Edit</Text></Pressable>
              </View>
            </Card>
          );
        })}
      </View>
    </>
  );
}

function CalendarTab() {
  const s = useStore();
  const off = s.monthOffset;
  const { year, month } = monthInfo(off);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDateStr = todayStr();
  const selDate = s.calSelectedDate || (off === 0 ? todayDateStr : `${year}-${String(month + 1).padStart(2, '0')}-01`);
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const hasDot = s.transactions.some((t) => t.date === ds);
    const isToday = ds === todayDateStr;
    const isSel = ds === selDate;
    return { num: i + 1, ds, hasDot, isToday, isSel };
  });
  const selTx = s.transactions.filter((t) => t.date === selDate);
  const selIncome = selTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const selExpense = selTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return (
    <>
      <View style={styles.monthRow}>
        <Pressable onPress={s.monthPrev} hitSlop={8}><ChevronLeft size={16} color={textAlpha(0.55)} /></Pressable>
        <Text style={styles.monthLabel}>{monthLabel(off)}</Text>
        <Pressable onPress={s.monthNext} hitSlop={8}><ChevronRight size={16} color={textAlpha(0.55)} /></Pressable>
      </View>
      <View style={styles.calGrid}>
        {days.map((d) => (
          <Pressable
            key={d.ds}
            onPress={() => s.setCalSelectedDate(d.ds)}
            style={[
              styles.calDay,
              { borderColor: d.isSel ? colors.accent : colors.divider, backgroundColor: d.isToday ? 'rgba(217,164,65,0.12)' : 'transparent' },
            ]}
          >
            <Text style={styles.calDayLabel}>{d.num}</Text>
            {d.hasDot && <View style={styles.calDot} />}
          </Pressable>
        ))}
      </View>
      <Card>
        <Text style={[styles.rowText, { marginBottom: 8 }]}>{selDate === todayDateStr ? 'Today' : selDate}</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.smallBody}>Income</Text>
          <Text style={[styles.smallBody, { color: colors.accent300 }]}>+{s.currency}{fmtAbs(selIncome)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.smallBody}>Expenses</Text>
          <Text style={styles.smallBody}>−{s.currency}{fmtAbs(selExpense)}</Text>
        </View>
      </Card>
    </>
  );
}

export function ShoppingListDetailScreen() {
  const s = useStore();
  const list = s.shoppingLists.find((l) => l.id === s.activeListId) || s.shoppingLists[0];
  const est = list.items.reduce((sum, i) => sum + i.price, 0);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={s.backToLists} hitSlop={10}><ChevronLeft /></Pressable>
        <Text style={styles.h1}>{list.name}</Text>
      </View>
      <View style={styles.summaryGrid}>
        <View><Text style={styles.mutedTiny}>Budget</Text><Text style={styles.summaryValue}>{s.currency}{fmtAbs(list.budget)}</Text></View>
        <View><Text style={styles.mutedTiny}>Estimated</Text><Text style={styles.summaryValue}>{s.currency}{fmtAbs(est)}</Text></View>
        <View><Text style={styles.mutedTiny}>Remaining</Text><Text style={[styles.summaryValue, { color: colors.accent300 }]}>{s.currency}{fmtAbs(list.budget - est)}</Text></View>
      </View>
      <View style={{ marginBottom: 16 }}>
        <Text style={[styles.mutedTiny, { marginBottom: 8 }]}>Repeat</Text>
        <ChipGroup options={REPEAT_OPTIONS} value={list.repeat ?? 'One-time'} onChange={(v) => s.setShoppingListRepeat(list.id, v)} />
      </View>
      <View style={{ marginBottom: 16 }}>
        {list.items.map((it) => (
          <Pressable key={it.id} onPress={() => s.toggleShoppingItem(list.id, it.id)} style={styles.itemRow}>
            <View style={[styles.checkbox, { borderColor: it.checked ? colors.accent : colors.divider, backgroundColor: it.checked ? colors.accent : 'transparent' }]}>
              {it.checked && <Text style={{ color: colors.bg, fontSize: 11 }}>✓</Text>}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowText, it.checked && { textDecorationLine: 'line-through', color: textAlpha(0.5) }]}>{it.name}</Text>
              {!!it.qty && <Text style={styles.mutedTiny}>{it.qty}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.priceText}>{s.currency}{fmtAbs(it.price)}</Text>
              {it.checked && it.actualPrice != null && (
                <Text style={[styles.mutedTiny, { color: it.actualPrice > it.price ? colors.expense : colors.income }]}>
                  {(it.actualPrice - it.price >= 0 ? '+' : '−') + s.currency + fmtAbs(Math.abs(it.actualPrice - it.price))}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
      <DashedButton label="+ Add item" onPress={s.openShoppingItemModal} style={{ marginBottom: 10 }} />
      <Pressable onPress={s.saveAsTemplate} style={{ alignItems: 'center', paddingVertical: 6 }}>
        <Text style={styles.mutedSmall}>Save as template</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 116 },
  h1: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text },
  h2: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.text },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  rowText: { fontSize: 14, color: colors.text },
  smallBody: { fontSize: 13, color: colors.text },
  mutedSmall: { fontSize: 12, color: textAlpha(0.55) },
  mutedTiny: { fontSize: 11, color: textAlpha(0.5) },
  warnText: { fontSize: 11, color: colors.accent300 },
  smallOutlineBtn: { borderWidth: 1, borderColor: colors.divider, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  smallOutlineBtnLabel: { fontSize: 12, color: colors.text },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 },
  monthLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  calDay: {
    width: '12%', aspectRatio: 1, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  calDayLabel: { fontSize: 12, color: colors.text },
  calDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent400 },
  summaryGrid: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 20, gap: 10 },
  summaryValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  priceText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: textAlpha(0.65) },
});
