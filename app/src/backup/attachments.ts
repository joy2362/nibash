import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';

// Receipt images live in a dedicated folder in the app's *document* directory
// (survives restarts, unlike cache). Files are named by a random id; the
// authoritative reference is always `Transaction.receiptUri`.
const DIR = new Directory(Paths.document, 'attachments');

function ensureDir() {
  if (!DIR.exists) DIR.create({ intermediates: true });
}

function rid() {
  return `rcpt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Opens the photo library and copies the chosen image into the attachments
 * folder. Returns its `file://` URI, or null if cancelled / permission denied. */
export async function pickReceiptImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  ensureDir();
  const dest = new File(DIR, `${rid()}.jpg`);
  await new File(res.assets[0].uri).copy(dest);
  return dest.uri;
}

export function deleteReceiptFile(uri: string | undefined | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch { /* ignore */ }
}

/** base64 of a receipt for inclusion in a backup, or null. */
export async function readReceiptBase64(uri: string): Promise<string | null> {
  try {
    const f = new File(uri);
    if (!f.exists) return null;
    return await f.base64();
  } catch {
    return null;
  }
}

/** Writes a receipt back out during a restore; returns its new URI. */
export function writeReceiptBase64(txId: string, base64: string): string {
  ensureDir();
  const dest = new File(DIR, `restored-${txId}.jpg`);
  if (dest.exists) dest.delete();
  dest.write(base64, { encoding: 'base64' });
  return dest.uri;
}

/** Removes any receipt file not referenced by a current `receiptUri`. */
export function pruneReceipts(keepUris: Set<string>) {
  try {
    if (!DIR.exists) return;
    for (const entry of DIR.list()) {
      if (!keepUris.has(entry.uri)) entry.delete();
    }
  } catch { /* ignore */ }
}
