import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { colors, fonts, radius, blackAlpha, shadow } from '../theme';

export function BottomSheet({
  visible, title, onClose, children, footer,
}: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
  /** Rendered below the scrollable form area, outside the ScrollView, so the
   * primary action (Save/Add, and Delete/Cancel) is always on screen and
   * reachable without scrolling — a long form (e.g. Edit subscription: name,
   * amount, billing cycle, date, category, account, cancel) would otherwise
   * push it below the visible area of the `maxHeight`-capped sheet. */
  footer?: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: blackAlpha(0.45), justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%', backgroundColor: colors.surface, borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 28, ...shadow.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontFamily: fonts.headingSemibold, fontSize: 18, color: colors.text },
  close: { color: 'rgba(240,237,232,0.55)', fontSize: 22, lineHeight: 22 },
});
