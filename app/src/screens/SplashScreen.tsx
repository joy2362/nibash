import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, textAlpha } from '../theme';

export function SplashScreen() {
  const finishSplash = useStore((s) => s.finishSplash);
  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const t = setTimeout(finishSplash, 1400);
    return () => { loop.stop(); clearTimeout(t); };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/nibash-icon.png')}
        style={[styles.icon, { opacity: pulse }]}
      />
      <Text style={styles.title}>Nibash</Text>
      <Text style={styles.subtitle}>Your money, private and simple.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  icon: { width: 88, height: 88 },
  title: { fontFamily: fonts.bodyMedium, fontSize: 20, color: colors.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 13, color: textAlpha(0.55) },
});
