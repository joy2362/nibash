import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, textAlpha } from '../theme';
import { catById, dayFmt, fmtAbs, txSign } from '../store/helpers';
import { SegmentedTabs, TextField, resolveColor, EmptyState } from '../components/primitives';
import type { Transaction } from '../store/types';

const FILTERS: { label: string; value: 'all' | 'expense' | 'income' | 'tagged' }[] = [
  { label: 'All', value: 'all' }, { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' }, { label: 'Tagged', value: 'tagged' },
];

export function ActivityScreen() {
  const s = useStore();
  let list = s.transactions.slice();
  if (s.txFilter === 'expense' || s.txFilter === 'income') list = list.filter((t) => t.type === s.txFilter);
  if (s.txFilter === 'tagged') list = list.filter((t) => t.tags.length > 0);
  if (s.tagFilter) list = list.filter((t) => t.tags.includes(s.tagFilter!));
  if (s.txSearch.trim()) {
    const q = s.txSearch.toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q) || catById(s, t.catId).name.toLowerCase().includes(q));
  }
  list.sort((a, b) => b.date.localeCompare(a.date));
  const byDate: Record<string, Transaction[]> = {};
  list.forEach((t) => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const groups = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map((date) => {
    const items = byDate[date];
    const net = items.reduce((sum, t) => sum + txSign(t) * t.amount, 0);
    return { date: dayFmt(date), netLabel: (net >= 0 ? '+' : '−') + s.currency + fmtAbs(net), items };
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Activity</Text>
      <View style={{ marginBottom: 14 }}>
        <SegmentedTabs options={FILTERS} value={s.txFilter} onChange={s.setTxFilter} />
      </View>
      <TextField value={s.txSearch} onChangeText={s.setTxSearch} placeholder="Search transactions" />
      {s.tagFilter && (
        <Pressable onPress={() => s.setTagFilter(null)} style={styles.tagFilterChip}>
          <Text style={styles.tagFilterChipText}>#{s.tagFilter} ×</Text>
        </Pressable>
      )}

      {groups.map((grp) => (
        <View key={grp.date} style={{ marginBottom: 18 }}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupDate}>{grp.date}</Text>
            <Text style={styles.groupNet}>Net {grp.netLabel}</Text>
          </View>
          {grp.items.map((t) => {
            const cat = catById(s, t.catId);
            const editable = t.type === 'income' || t.type === 'expense';
            const sign = txSign(t);
            return (
              <Pressable
                key={t.id}
                disabled={!editable}
                onPress={() => editable && s.openTxModal(t.type as 'income' | 'expense', t.id)}
                style={styles.txRow}
              >
                <View style={[styles.txAvatar, { backgroundColor: resolveColor(cat.color) }]}>
                  <Text style={styles.txAvatarText}>{t.title.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{t.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.mutedTiny}>{cat.name}</Text>
                    {!!t.tags[0] && (
                      <Pressable onPress={() => s.setTagFilter(t.tags[0])} hitSlop={6}>
                        <Text style={[styles.mutedTiny, styles.tagLink]}> · #{t.tags[0]}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: sign > 0 ? colors.income : colors.expense }]}>
                  {(sign > 0 ? '+' : '−') + s.currency + fmtAbs(t.amount)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      {groups.length === 0 && <EmptyState text="No transactions match." />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 116 },
  h1: { fontFamily: fonts.bodyMedium, fontSize: 19, color: colors.text, marginBottom: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  groupDate: { fontSize: 12, fontFamily: fonts.bodyMedium, color: textAlpha(0.6) },
  groupNet: { fontSize: 11, color: textAlpha(0.45) },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  txAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txAvatarText: { color: colors.bg, fontFamily: fonts.bodyMedium, fontSize: 14 },
  rowTitle: { fontSize: 14, color: colors.text },
  mutedTiny: { fontSize: 11, color: textAlpha(0.5) },
  txAmount: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  tagLink: { color: colors.accent },
  tagFilterChip: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.accent, borderRadius: 12,
    paddingVertical: 5, paddingHorizontal: 12, marginTop: 10,
  },
  tagFilterChipText: { fontSize: 12, color: colors.accent },
});
