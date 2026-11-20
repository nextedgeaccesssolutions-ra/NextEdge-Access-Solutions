/**
 * Convert untrusted RSS/Atom markup to plain text.
 * Deliberately do not decode HTML entities: encoded angle brackets must remain
 * text and must never become markup after sanitization.
 */
export function stripFeedMarkup(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}