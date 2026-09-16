import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

/** Prompts Face ID / Touch ID (or Android biometric/fingerprint) only — device
 * passcode fallback is disabled so this stays a dedicated app-lock check
 * rather than silently accepting the phone's own unlock code. */
export async function authenticateWithBiometric(promptMessage = 'Unlock Nibash'): Promise<boolean> {
  const available = await isBiometricAvailable();
  if (!available) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
    cancelLabel: 'Cancel',
  });
  return result.success;
}
