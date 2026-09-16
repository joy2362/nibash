import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// PIN and Recovery Key material lives in the OS keychain (SecureStore), never
// in the SQLite database — this is auth material, not app data, and PRD §31
// is explicit that the plaintext recovery key is shown once and never stored.
// Only salted SHA-256 hashes are persisted; a 4-digit PIN's hash is brute-
// forceable in isolation, but it's gated behind SecureStore's OS-level
// encryption and never leaves the device, so this is intentionally simple
// rather than a full password-hashing scheme (bcrypt/scrypt would be
// overkill for a 4-digit code with no network attack surface).

const PIN_HASH_KEY = 'nibash.pinHash';
const PIN_SALT_KEY = 'nibash.pinSalt';
const RECOVERY_HASH_KEY = 'nibash.recoveryKeyHash';
const RECOVERY_SALT_KEY = 'nibash.recoveryKeySalt';

const RECOVERY_KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I

async function randomHex(byteLength: number): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(byteLength);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashWithSalt(value: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${value}`);
}

function normalizeRecoveryKey(key: string): string {
  return key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ---------- PIN ----------

export async function hasPinSet(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_HASH_KEY)) != null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = await randomHex(16);
  const hash = await hashWithSalt(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, storedHash] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT_KEY),
    SecureStore.getItemAsync(PIN_HASH_KEY),
  ]);
  if (!salt || !storedHash) return false;
  return (await hashWithSalt(pin, salt)) === storedHash;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
}

// ---------- Recovery Key ----------

/** Generates a fresh `XXXX-XXXX-XXXX-XXXX` key from cryptographically random
 * bytes. The caller is responsible for showing it to the user exactly once
 * and calling `setRecoveryKeyHash` — nothing here persists the plaintext. */
export async function generateRecoveryKey(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += RECOVERY_KEY_ALPHABET[bytes[i] % RECOVERY_KEY_ALPHABET.length];
  }
  return out.match(/.{1,4}/g)!.join('-');
}

export async function setRecoveryKeyHash(key: string): Promise<void> {
  const salt = await randomHex(16);
  const hash = await hashWithSalt(normalizeRecoveryKey(key), salt);
  await SecureStore.setItemAsync(RECOVERY_SALT_KEY, salt);
  await SecureStore.setItemAsync(RECOVERY_HASH_KEY, hash);
}

export async function verifyRecoveryKeyMatch(key: string): Promise<boolean> {
  const [salt, storedHash] = await Promise.all([
    SecureStore.getItemAsync(RECOVERY_SALT_KEY),
    SecureStore.getItemAsync(RECOVERY_HASH_KEY),
  ]);
  if (!salt || !storedHash) return false;
  return (await hashWithSalt(normalizeRecoveryKey(key), salt)) === storedHash;
}

export async function hasRecoveryKeySet(): Promise<boolean> {
  return (await SecureStore.getItemAsync(RECOVERY_HASH_KEY)) != null;
}
