import { Contact } from 'expo-contacts';

// PRD §14a — "+ New Person" can pull from the device's contacts instead of
// typing a name/phone by hand. `Contact.presentPicker()` is SDK 57's native
// system contact-picker UI (like iOS's own contact picker) — it hands back
// only the one contact the user explicitly selects, so it needs no
// `requestPermissionsAsync()`/broad Contacts permission grant, unlike
// reading the whole address book. Store-free, like `security/*` and
// `notifications/index.ts` — the caller decides what to do with the result.

export interface PickedContact {
  name: string;
  phone: string;
}

/** Opens the native contact picker. Returns null if the user cancelled, or
 * if the platform/runtime doesn't support it (caught by the caller). */
export async function pickContact(): Promise<PickedContact | null> {
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const name = (await contact.getFullName()) || '';
  const phones = await contact.getPhones();
  const phone = phones[0]?.number || '';
  return { name, phone };
}
