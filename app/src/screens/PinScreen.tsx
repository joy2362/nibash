import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, textAlpha } from '../theme';
import { TextField, PrimaryButton, GhostButton } from '../components/primitives';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function Keypad({ onPress }: { onPress: (k: string) => void }) {
  return (
    <View style={styles.keypad}>
      {KEYS.map((k, i) => (
        <Pressable key={i} onPress={() => onPress(k)} disabled={k === ''} style={styles.key}>
          <Text style={styles.keyLabel}>{k}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Dots({ length, filled }: { length: number; filled: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled && { backgroundColor: colors.accent }]} />
      ))}
    </View>
  );
}

function ErrorText({ text }: { text: string }) {
  if (!text) return null;
  return <Text style={styles.errorText}>{text}</Text>;
}

export function PinScreen() {
  const s = useStore();

  if (s.pinRecoveryStep === 'showKey') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>App Lock is now enabled</Text>
        <Text style={styles.subtitle}>
          Save this Recovery Key somewhere safe — it's the only way back in if you forget your PIN
          and biometric isn't available. We don't store it and can't recover it for you.
        </Text>
        <View style={styles.keyBox}>
          <Text style={styles.keyText}>{s.newRecoveryKeyText}</Text>
        </View>
        <PrimaryButton label="I've saved my Recovery Key" onPress={s.acknowledgeRecoveryKey} />
      </View>
    );
  }

  if (s.pinRecoveryStep === 'options') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Forgot PIN?</Text>
        <Text style={styles.subtitle}>Choose how you'd like to get back in.</Text>
        <View style={{ width: '100%', gap: 10, marginBottom: 28 }}>
          {s.biometricAvailable && s.biometricOn && (
            <Pressable onPress={s.selectBiometricOption} style={styles.optionRow}>
              <View style={[styles.radioOuter, { borderColor: colors.accent }]}>
                {s.recoveryOption === 'biometric' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.optionLabel}>Use biometric instead</Text>
            </Pressable>
          )}
          <Pressable onPress={s.selectKeyOption} style={styles.optionRow}>
            <View style={[styles.radioOuter, { borderColor: colors.accent }]}>
              {s.recoveryOption === 'key' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.optionLabel}>Enter Recovery Key</Text>
          </Pressable>
        </View>
        <ErrorText text={s.pinError} />
        <PrimaryButton label="Continue" onPress={s.continueRecovery} style={{ marginBottom: 10 }} />
        <GhostButton label="Cancel" onPress={s.cancelPinRecovery} />
      </View>
    );
  }

  if (s.pinRecoveryStep === 'key') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enter Recovery Key</Text>
        <Text style={styles.subtitle}>The key you saved when App Lock was set up.</Text>
        <View style={{ width: '100%' }}>
          <TextField value={s.recoveryKeyInput} onChangeText={s.setRecoveryKeyInput} placeholder="XXXX-XXXX-XXXX-XXXX" />
        </View>
        <ErrorText text={s.pinError} />
        <PrimaryButton label="Verify" onPress={s.verifyRecoveryKey} style={{ marginBottom: 10 }} />
        <GhostButton label="Cancel" onPress={s.cancelPinRecovery} />
      </View>
    );
  }

  if (s.pinRecoveryStep === 'newpin') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Set a new PIN</Text>
        <Text style={styles.subtitle}>Choose 4 digits to unlock next time.</Text>
        <Dots length={4} filled={s.newPinEntry.length} />
        <Keypad onPress={s.pressNewPinKey} />
      </View>
    );
  }

  if (s.pinRecoveryStep === 'setup') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Set up your PIN</Text>
        <Text style={styles.subtitle}>Choose 4 digits to lock Nibash.</Text>
        <Dots length={4} filled={s.newPinEntry.length} />
        <Keypad onPress={s.pressNewPinKey} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Enter your PIN to unlock</Text>
      <Dots length={4} filled={s.pinEntry.length} />
      <Keypad onPress={s.pressKey} />
      <ErrorText text={s.pinError} />
      <View style={styles.linksRow}>
        {s.biometricAvailable && s.biometricOn && (
          <GhostButton label="Use fingerprint instead" onPress={s.useFingerprint} />
        )}
        <Pressable onPress={s.openForgotPin}>
          <Text style={styles.mutedLink}>Forgot PIN?</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', paddingTop: 90, paddingHorizontal: 32 },
  title: { fontFamily: fonts.bodyMedium, fontSize: 22, color: colors.text, marginBottom: 4, alignSelf: 'center', textAlign: 'center' },
  subtitle: { fontSize: 13, color: textAlpha(0.55), marginBottom: 36, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 44 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: 'transparent' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'space-between', rowGap: 18 },
  key: { width: 76, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32 },
  keyLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 22 },
  linksRow: { flexDirection: 'row', gap: 20, marginTop: 32 },
  mutedLink: { color: textAlpha(0.55), fontSize: 13 },
  errorText: { color: colors.expense, fontSize: 12, marginTop: 16, textAlign: 'center' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: 12, padding: 14,
  },
  optionLabel: { fontSize: 13, color: colors.text },
  radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  keyBox: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 28, width: '100%',
  },
  keyText: { fontFamily: fonts.headingSemibold, fontSize: 18, color: colors.text, letterSpacing: 1 },
});
