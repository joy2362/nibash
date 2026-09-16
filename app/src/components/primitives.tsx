import React from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, ViewStyle, TextStyle, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, fonts, radius, textAlpha, shadow } from '../theme';

export function resolveColor(key: string | undefined): string {
  if (!key) return colors.neutral500;
  return (colors as Record<string, string>)[key] || colors.neutral500;
}

// ---------- icons ----------
export function ChevronLeft({ size = 20, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
export function ChevronRight({ size = 16, color = textAlpha(0.4) }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
export function SearchIcon({ size = 16, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={1.7} />
      <Path d="M15.2 15.2L20 20" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}
export function CheckIcon({ size = 12, color = colors.bg }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l5 5L19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
export function EditIcon({ size = 16, color = textAlpha(0.5) }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ---------- layout ----------
export function Screen({ children, contentContainerStyle }: { children: React.ReactNode; contentContainerStyle?: ViewStyle }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={{ marginRight: 10 }}>
          <ChevronLeft />
        </Pressable>
      ) : null}
      <Text style={[styles.h1, { flex: 1 }]}>{title}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const Comp: any = onPress ? Pressable : View;
  return (
    <Comp onPress={onPress} style={[styles.card, style]}>
      {children}
    </Comp>
  );
}

export function SmallLabel({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.smallLabel, style]}>{children}</Text>;
}

export function ListRow({
  title, subtitle, right, onPress, dot, avatar,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  dot?: string;
  avatar?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.listRow} disabled={!onPress}>
      {dot ? <View style={[styles.dot, { backgroundColor: resolveColor(dot) }]} /> : null}
      {avatar ? (
        <View style={styles.avatar}><Text style={styles.avatarText}>{avatar}</Text></View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress && !right ? <ChevronRight /> : null}
    </Pressable>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <Text style={styles.emptyState}>{text}</Text>;
}

// ---------- controls ----------
export function SegmentedTabs<T extends string>({
  options, value, onChange,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segOpt, i > 0 && styles.segOptBorder, selected && { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.segLabel, { color: selected ? colors.onAccent : textAlpha(0.7) }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, selected, onPress, flex }: { label: string; selected: boolean; onPress: () => void; flex?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, flex && { flex: 1, alignItems: 'center' }, { borderColor: selected ? colors.accent : colors.divider }]}>
      <Text style={{ fontSize: 12, color: selected ? colors.accent300 : textAlpha(0.8), fontFamily: fonts.body }}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  options, value, onChange, flexItems,
}: { options: { label: string; value: T }[]; value: T | null; onChange: (v: T) => void; flexItems?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} flex={flexItems} />
      ))}
    </View>
  );
}

export function ProgressBar({ pct, color = colors.accent400 }: { pct: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function ToggleSwitch({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[styles.toggleTrack, { backgroundColor: value ? colors.accent : colors.neutral700, justifyContent: value ? 'flex-end' : 'flex-start' }]}>
      <View style={styles.toggleThumb} />
    </Pressable>
  );
}

export function CheckBox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.checkbox, { borderColor: checked ? colors.accent : colors.divider, backgroundColor: checked ? colors.accent : 'transparent' }]}>
      {checked ? <CheckIcon /> : null}
    </Pressable>
  );
}

export function RadioDot({ selected, onPress, label }: { selected: boolean; onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[styles.radioOuter, { borderColor: selected ? colors.accent : colors.divider }]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      {label ? <Text style={{ fontSize: 12, color: colors.text }}>{label}</Text> : null}
    </Pressable>
  );
}

export function TextField({
  label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, editable = true,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={textAlpha(0.35)}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        editable={editable}
        style={[styles.input, multiline && { minHeight: 70, textAlignVertical: 'top' }, !editable && { opacity: 0.5 }]}
      />
    </View>
  );
}

const DATE_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  const valid = y && m && d && !Number.isNaN(y);
  return valid ? new Date(y, m - 1, d) : new Date();
}

function localDateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Shared date-picker field — one component behind Bills' due date and
 * Subscriptions' next billing date, in the same "build the shared control
 * once" spirit as `ChipGroup`'s Repeat options (PRD §20). Wraps the native
 * `@react-native-community/datetimepicker`: tapping the field opens it — a
 * one-shot native dialog on Android (closes itself), an inline spinner on
 * iOS (which has no built-in dismiss, hence the "Done" button below it).
 * `value`/`onChange` are a real `YYYY-MM-DD` string, matching how the date is
 * actually stored — this component never deals in free text. */
export function DateField({ label, value, onChange }: { label?: string; value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const date = isoToLocalDate(value);
  const display = `${date.getDate()} ${DATE_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Pressable onPress={() => setOpen(true)} style={styles.input}>
        <Text style={{ fontSize: 14, color: colors.text }}>{display}</Text>
      </Pressable>
      {open && (
        <View style={{ marginTop: 8 }}>
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              if (Platform.OS === 'android') setOpen(false);
              if (event.type === 'dismissed') return;
              if (selected) onChange(localDateToIso(selected));
            }}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={() => setOpen(false)} style={{ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 }}>
              <Text style={{ color: colors.accent, fontSize: 13, fontFamily: fonts.bodyMedium }}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export function AmountField({
  value, onChangeText, currency, suffix,
}: { value: string; onChangeText: (v: string) => void; currency: string; suffix?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 22 }}>
      <Text style={{ fontFamily: fonts.headingSemibold, fontSize: 26, color: textAlpha(0.55) }}>{currency}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={textAlpha(0.35)}
        keyboardType="decimal-pad"
        style={{ minWidth: 140, color: colors.text, fontFamily: fonts.headingSemibold, fontSize: 40, textAlign: 'center', padding: 0 }}
      />
      {suffix ? <Text style={{ fontSize: 13, color: textAlpha(0.55) }}>{suffix}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, style }: { label: string; onPress: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.btnPrimary, disabled && { opacity: 0.45 }, style]}>
      <Text style={styles.btnPrimaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style, color }: { label: string; onPress: () => void; style?: ViewStyle; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.btnSecondary, style]}>
      <Text style={[styles.btnSecondaryLabel, color ? { color } : null]}>{label}</Text>
    </Pressable>
  );
}

export function DashedButton({ label, onPress, style }: { label: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={[styles.btnDashed, style]}>
      <Text style={styles.btnDashedLabel}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 20, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  h1: { fontFamily: fonts.headingSemibold, fontSize: 18, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16 },
  smallLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: textAlpha(0.55) },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.onAccent, fontFamily: fonts.heading, fontSize: 13 },
  rowTitle: { fontSize: 14, color: colors.text },
  rowSubtitle: { fontSize: 11, color: textAlpha(0.5), marginTop: 2 },
  emptyState: { textAlign: 'center', paddingVertical: 32, color: textAlpha(0.45), fontSize: 13 },
  seg: {
    flexDirection: 'row', borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md,
    overflow: 'hidden', alignSelf: 'flex-start',
  },
  segOpt: { paddingVertical: 7, paddingHorizontal: 12 },
  segOptBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  segLabel: { fontSize: 13, fontFamily: fonts.body },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 100, borderWidth: 1 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.neutral800, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  toggleTrack: { width: 40, height: 22, borderRadius: 12, padding: 2, flexDirection: 'row' },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.bg },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  radioOuter: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  fieldLabel: { fontSize: 12, color: textAlpha(0.7), marginBottom: 5 },
  input: {
    minHeight: 40, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md,
  },
  btnPrimary: {
    height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  btnPrimaryLabel: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 14 },
  btnSecondary: {
    height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider,
    alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  btnSecondaryLabel: { color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  btnDashed: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.divider, borderRadius: radius.md,
    paddingVertical: 12, alignItems: 'center', width: '100%',
  },
  btnDashedLabel: { color: colors.accent, fontSize: 13 },
  ghostLabel: { color: colors.accent, fontSize: 13 },
});

export { styles as sharedStyles };
