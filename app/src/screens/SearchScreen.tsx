import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, textAlpha } from '../theme';
import { dayFmt, fmtAbs, accountBalances } from '../store/helpers';
import { ChevronLeft, EmptyState } from '../components/primitives';

export function SearchScreen() {
  const s = useStore();
  const q = s.searchQuery.trim().toLowerCase();
  const groups: { label: string; items: { title: string; sub: string; onOpen: () => void }[] }[] = [];
  if (q) {
    const txMatches = s.transactions.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 5)
      .map((t) => ({
        title: t.title,
        sub: dayFmt(t.date),
        onOpen: () => (t.type === 'income' || t.type === 'expense') && s.openTxModal(t.type, t.id),
      }));
    if (txMatches.length) groups.push({ label: 'Transactions', items: txMatches });
    const peopleMatches = s.people.filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({ title: p.name, sub: p.phone, onOpen: () => { s.openPersonDetail(p.id); s.setSearchQuery(''); } }));
    if (peopleMatches.length) groups.push({ label: 'People', items: peopleMatches });
    const billMatches = s.bills.filter((b) => b.name.toLowerCase().includes(q))
      .map((b) => ({ title: b.name, sub: s.currency + fmtAbs(b.amount), onOpen: () => { s.setDash('moreBills'); s.setSearchQuery(''); } }));
    if (billMatches.length) groups.push({ label: 'Bills', items: billMatches });
    const balances = accountBalances(s);
    const accountMatches = s.accounts.filter((a) => a.name.toLowerCase().includes(q))
      .map((a) => ({ title: a.name, sub: s.currency + fmtAbs(balances[a.id] ?? 0), onOpen: () => { s.openAccountDetail(a.id); s.setSearchQuery(''); } }));
    if (accountMatches.length) groups.push({ label: 'Accounts', items: accountMatches });
    const listMatches = s.shoppingLists.filter((l) => l.name.toLowerCase().includes(q))
      .map((l) => ({ title: l.name, sub: `${l.items.length} item(s)`, onOpen: () => { s.openShoppingDetail(l.id); s.setSearchQuery(''); } }));
    if (listMatches.length) groups.push({ label: 'Shopping Lists', items: listMatches });
    const subMatches = s.subscriptions.filter((sub) => sub.name.toLowerCase().includes(q))
      .map((sub) => ({ title: sub.name, sub: s.currency + fmtAbs(sub.amount), onOpen: () => { s.setDash('moreSubscriptions'); s.setSearchQuery(''); } }));
    if (subMatches.length) groups.push({ label: 'Subscriptions', items: subMatches });
    const goalMatches = s.goals.filter((g) => g.name.toLowerCase().includes(q))
      .map((g) => ({ title: g.name, sub: `${s.currency}${fmtAbs(g.saved)} / ${s.currency}${fmtAbs(g.target)}`, onOpen: () => { s.goPlans(); s.setPlansTab('goals'); s.setSearchQuery(''); } }));
    if (goalMatches.length) groups.push({ label: 'Savings Goals', items: goalMatches });
    const noteMatches = s.notesList.filter((n) => n.text.toLowerCase().includes(q))
      .map((n) => ({ title: n.text.slice(0, 60), sub: '', onOpen: () => { s.setDash('moreNotes'); s.setSearchQuery(''); } }));
    if (noteMatches.length) groups.push({ label: 'Notes', items: noteMatches });
    const tagMatches = Array.from(new Set(s.transactions.flatMap((t) => t.tags))).filter((tag) => tag.includes(q))
      .map((tag) => ({ title: `#${tag}`, sub: '', onOpen: () => { s.setTagFilter(tag); s.goActivity(); s.setSearchQuery(''); } }));
    if (tagMatches.length) groups.push({ label: 'Tags', items: tagMatches });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.searchRow}>
        <Pressable onPress={s.closeSearch} hitSlop={10}><ChevronLeft /></Pressable>
        <TextInput
          value={s.searchQuery}
          onChangeText={s.setSearchQuery}
          placeholder="Search everything..."
          placeholderTextColor={textAlpha(0.35)}
          style={styles.input}
          autoFocus
        />
      </View>
      {groups.map((g) => (
        <View key={g.label} style={{ marginBottom: 18 }}>
          <Text style={styles.groupLabel}>{g.label}</Text>
          {g.items.map((it, i) => (
            <Pressable key={i} onPress={it.onOpen} style={styles.row}>
              <Text style={styles.rowTitle}>{it.title}</Text>
              <Text style={styles.rowSub}>{it.sub}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      {!q && <EmptyState text="Type to search everything." />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 116 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  input: {
    flex: 1, height: 40, paddingHorizontal: 12, fontSize: 14, color: colors.text,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, borderRadius: 12,
  },
  groupLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: textAlpha(0.5), marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 4 },
  rowTitle: { fontSize: 14, color: colors.text },
  rowSub: { fontSize: 12, color: textAlpha(0.55) },
});
