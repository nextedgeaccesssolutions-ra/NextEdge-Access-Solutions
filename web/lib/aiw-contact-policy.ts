export type AiwContactPreference = {
  email?: unknown;
  contact_status?: unknown;
};

/** Block a recipient if any matching NEAS contact record has opted out. */
export function isOptedOutRecipient(
  recipient: string,
  contacts: readonly AiwContactPreference[],
): boolean {
  const normalizedRecipient = recipient.trim().toLowerCase();
  if (!normalizedRecipient) return false;

  return contacts.some((contact) =>
    contact.contact_status === "opted_out" &&
    String(contact.email ?? "").trim().toLowerCase() === normalizedRecipient
  );
}
