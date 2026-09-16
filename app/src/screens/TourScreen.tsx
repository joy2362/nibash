import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { colors, fonts, textAlpha } from '../theme';
import { PrimaryButton, GhostButton, SearchIcon } from '../components/primitives';

function PlusIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={colors.accent} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function HomeIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11l8-7 8 7" stroke={colors.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 10v9h12v-9" stroke={colors.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function BarsIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={12} width={4} height={8} rx={1} stroke={colors.accent} strokeWidth={1.6} />
      <Rect x={10} y={7} width={4} height={13} rx={1} stroke={colors.accent} strokeWidth={1.6} />
      <Rect x={16} y={3} width={4} height={17} rx={1} stroke={colors.accent} strokeWidth={1.6} />
    </Svg>
  );
}
function ListIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Circle cx={5} cy={6} r={1.4} stroke={colors.accent} strokeWidth={1.4} />
      <Circle cx={5} cy={12} r={1.4} stroke={colors.accent} strokeWidth={1.4} />
      <Circle cx={5} cy={18} r={1.4} stroke={colors.accent} strokeWidth={1.4} />
      <Path d="M10 6h10M10 12h10M10 18h10" stroke={colors.accent} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
function GridIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={7} height={7} rx={1.5} stroke={colors.accent} strokeWidth={1.6} />
      <Rect x={13} y={4} width={7} height={7} rx={1.5} stroke={colors.accent} strokeWidth={1.6} />
      <Rect x={4} y={13} width={7} height={7} rx={1.5} stroke={colors.accent} strokeWidth={1.6} />
      <Rect x={13} y={13} width={7} height={7} rx={1.5} stroke={colors.accent} strokeWidth={1.6} />
    </Svg>
  );
}
function ShieldIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z"
        stroke={colors.accent} strokeWidth={1.7} strokeLinejoin="round"
      />
      <Path d="M9 12l2 2 4-4" stroke={colors.accent} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const SLIDES: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <HomeIcon />,
    title: 'Welcome to Nibash',
    body: 'Your money, private and simple. Everything you enter — every account, transaction, and note — lives only on this device. No login, no cloud, no one else ever sees it.',
  },
  {
    icon: <PlusIcon />,
    title: 'Add money in seconds',
    body: 'Tap the + button in the bottom bar any time to log an expense, income, or transfer between accounts — the whole app is built around getting that done in under 10 seconds.',
  },
  {
    icon: <HomeIcon />,
    title: 'Home',
    body: 'Your total balance across accounts, this month’s budget, upcoming bills, and recent activity — all at a glance. Tap an account chip to open its full history.',
  },
  {
    icon: <BarsIcon />,
    title: 'Activity',
    body: 'Every transaction you’ve ever logged, in one searchable, filterable list. Tap a tag like #groceries to instantly filter Activity down to everything tagged that way.',
  },
  {
    icon: <ListIcon />,
    title: 'Plans',
    body: 'Shopping Lists, Budgets, Savings Goals, and a Calendar view of your spending, all in one place — switch between them with the tabs at the top of the screen.',
  },
  {
    icon: <GridIcon />,
    title: 'More',
    body: 'Accounts, Categories, Bills & Subscriptions, Debts & People, Notes, Reports, Backup, and Settings all live here. Open it from the grid icon in the bottom navigation bar.',
  },
  {
    icon: <SearchIcon size={26} color={colors.accent} />,
    title: 'Search',
    body: 'Tap the search icon to find anything by name across the whole app — a transaction, a person, a bill, a goal — instantly, without hunting through menus.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Stay backed up and secure',
    body: 'Because everything is local-only, there’s no cloud to recover from if you lose your phone. Turn on Automatic backup (More → Backup) and set an App Lock PIN (Settings) to keep your data safe and private.',
  },
];

function PageDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

export function TourScreen() {
  const s = useStore();
  const step = Math.min(s.tourStep, SLIDES.length - 1);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.skipRow}>
        {!isLast ? (
          <Pressable onPress={s.tourFinish} hitSlop={10}>
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        ) : <View style={{ height: 20 }} />}
      </View>

      <View style={styles.content}>
        <View style={styles.badge}>{slide.icon}</View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      <View style={styles.footer}>
        <PageDots count={SLIDES.length} active={step} />
        <View style={styles.buttonRow}>
          {step > 0 && <GhostButton label="Back" onPress={s.tourBack} />}
          <PrimaryButton
            label={isLast ? 'Get started' : 'Next'}
            onPress={isLast ? s.tourFinish : s.tourNext}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, paddingTop: 12, paddingBottom: 28 },
  skipRow: { alignItems: 'flex-end', height: 32 },
  skipLabel: { color: textAlpha(0.55), fontSize: 13 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  badge: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  title: { fontFamily: fonts.bodyMedium, fontSize: 20, color: colors.text, textAlign: 'center' },
  body: { fontSize: 13.5, lineHeight: 20, color: textAlpha(0.65), textAlign: 'center', paddingHorizontal: 6 },
  footer: { gap: 20 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.divider },
  dotActive: { backgroundColor: colors.accent, width: 16 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
