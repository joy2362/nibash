import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Line, Rect, Circle } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { colors, fonts, blackAlpha, shadow } from '../theme';
import type { DashKey } from '../store/types';

function navColor(active: boolean) {
  return active ? colors.accent : 'rgba(240,237,232,0.55)';
}

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11.5L12 4l8 7.5V20a1 1 0 01-1 1h-4.5v-6h-5v6H5a1 1 0 01-1-1v-8.5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}
function ActivityIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={4} y1={12} x2={20} y2={12} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={4} y1={17} x2={14} y2={17} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}
function PlansIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.6} />
      <Rect x={13} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.6} />
      <Rect x={4} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.6} />
      <Rect x={13} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}
function MoreIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={5} cy={12} r={1.6} fill={color} />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
      <Circle cx={19} cy={12} r={1.6} fill={color} />
    </Svg>
  );
}

export function BottomNav() {
  const { dash, goHome, goActivity, goPlans, goMore, toggleFab, fabOpen } = useStore();
  const isMoreGroup = dash.indexOf('more') === 0 || dash === 'more';
  const isPlansGroup = dash === 'plans' || dash === 'plansShoppingDetail';

  return (
    <View style={styles.navBar}>
      <Pressable onPress={goHome} style={styles.navBtn}>
        <HomeIcon color={navColor(dash === 'home')} />
        <Text style={[styles.navLabel, { color: navColor(dash === 'home') }]}>Home</Text>
      </Pressable>
      <Pressable onPress={goActivity} style={styles.navBtn}>
        <ActivityIcon color={navColor(dash === 'activity')} />
        <Text style={[styles.navLabel, { color: navColor(dash === 'activity') }]}>Activity</Text>
      </Pressable>
      <View style={styles.fabSlot}>
        <Pressable onPress={toggleFab} style={[styles.fab, fabOpen && { transform: [{ rotate: '45deg' }] }]}>
          <Text style={styles.fabPlus}>+</Text>
        </Pressable>
      </View>
      <Pressable onPress={goPlans} style={styles.navBtn}>
        <PlansIcon color={navColor(isPlansGroup)} />
        <Text style={[styles.navLabel, { color: navColor(isPlansGroup) }]}>Plans</Text>
      </Pressable>
      <Pressable onPress={goMore} style={styles.navBtn}>
        <MoreIcon color={navColor(isMoreGroup)} />
        <Text style={[styles.navLabel, { color: navColor(isMoreGroup) }]}>More</Text>
      </Pressable>
    </View>
  );
}

export function FabMenu() {
  const {
    fabOpen, closeFab, openExpenseModal, openIncomeModal, openTransferModal, openDebtModal,
    openShoppingItemModalFromFab,
  } = useStore();
  if (!fabOpen) return null;
  const items: [string, () => void][] = [
    ['Add expense', openExpenseModal],
    ['Add income', openIncomeModal],
    ['Add debt', openDebtModal],
    ['Transfer money', openTransferModal],
    ['Add shopping item', openShoppingItemModalFromFab],
  ];
  return (
    <>
      <Pressable style={styles.fabBackdrop} onPress={closeFab} />
      <View style={styles.fabMenu}>
        {items.map(([label, onPress]) => (
          <Pressable key={label} onPress={onPress} style={styles.fabMenuItem}>
            <Text style={styles.fabMenuLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 62,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider,
    flexDirection: 'row', alignItems: 'center', zIndex: 4,
  },
  navBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  navLabel: { fontSize: 10, fontFamily: fonts.body },
  fabSlot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bg,
    borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    transform: [{ translateY: -14 }], ...shadow.md,
  },
  fabPlus: { color: colors.accent, fontSize: 24, lineHeight: 26 },
  fabBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: blackAlpha(0.35), zIndex: 5 },
  fabMenu: { position: 'absolute', bottom: 78, left: 0, right: 0, zIndex: 6, alignItems: 'center', gap: 10 },
  fabMenuItem: {
    width: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.divider, borderRadius: 100, paddingVertical: 11, ...shadow.md,
  },
  fabMenuLabel: { color: colors.text, fontSize: 13, fontFamily: fonts.body },
});
