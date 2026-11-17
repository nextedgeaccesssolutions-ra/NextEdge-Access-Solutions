const LOCAL_SPECIALS = new Set("!#$%&'*+-/=?^_`{|}~");

function isAsciiAlphaNumeric(character: string): boolean {
  const code = character.charCodeAt(0);
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

/**
 * Bounded, deterministic validation for one ASCII dot-atom email address.
 * Rejects oversized input before scanning and avoids backtracking regular expressions.
 */
export function isValidEmailAddress(value: string): boolean {
  if (typeof value !== "string" || value.length < 3 || value.length > 254) return false;

  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@") || at > 64) return false;

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!domain || domain.length > 253) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;

  for (let index = 0; index < local.length; index += 1) {
    const character = local[index];
    if (character === ".") continue;
    if (!isAsciiAlphaNumeric(character) && !LOCAL_SPECIALS.has(character)) return false;
  }

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (!label || label.length > 63 || label.startsWith("-") || label.endsWith("-")) return false;
    for (let index = 0; index < label.length; index += 1) {
      const character = label[index];
      if (character !== "-" && !isAsciiAlphaNumeric(character)) return false;
    }
  }
  return labels[labels.length - 1].length >= 2;
}
