/**
 * An e-mail address kept out of the page's source, for crawlers that harvest them.
 *
 * A crawler reads the HTML and the React payload beside it and runs no script; a reader's browser runs
 * one. So the server writes an address as `phi-mail:` and a scrambled hex string, and the client turns it
 * back into the address after the page has mounted (`components/navigation/use-phi-protected-mail.ts`).
 * It is obfuscation, not secrecy: anybody who runs the page sees the address, which is the point.
 *
 * **Only where a page is delivered.** A stored config keeps `mailto:` as the operator wrote it -- the
 * Builder shows the field it edits -- and the server renderer protects it on the way out. A value that
 * only ever reaches the client as data, a table's rows, is beyond this: the rows are in the payload.
 *
 * The key is derived from the address, not drawn at random, so the server and a client render of the same
 * value write the same string and hydration agrees.
 */
const PHI_PROTECTED_MAIL_PREFIX = "phi-mail:";

const PHI_MAIL_ADDRESS_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/gu;

function derivePhiMailKey(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193) >>> 0;
  }
  return (hash % 255) + 1;
}

function toHex(byte: number) {
  return byte.toString(16).padStart(2, "0");
}

/** Scrambles `value` -- a whole `mailto:` href or a bare address -- into a `phi-mail:` string. */
export function encodePhiProtectedMail(value: string) {
  const key = derivePhiMailKey(value);
  const bytes = new TextEncoder().encode(value);
  let hex = toHex(key);
  bytes.forEach((byte, index) => {
    hex += toHex(byte ^ ((key + index * 31) & 0xff));
  });
  return `${PHI_PROTECTED_MAIL_PREFIX}${hex}`;
}

export function isPhiProtectedMail(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(PHI_PROTECTED_MAIL_PREFIX);
}

/** The value `encodePhiProtectedMail` was given, or `null` for anything it did not write. */
export function decodePhiProtectedMail(value: string): string | null {
  if (!isPhiProtectedMail(value)) return null;
  const hex = value.slice(PHI_PROTECTED_MAIL_PREFIX.length);
  if (hex.length < 2 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/u.test(hex)) return null;
  const key = Number.parseInt(hex.slice(0, 2), 16);
  const bytes = new Uint8Array((hex.length - 2) / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = Number.parseInt(hex.slice(2 + index * 2, 4 + index * 2), 16);
    bytes[index] = byte ^ ((key + index * 31) & 0xff);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** A `mailto:` href protected; every other href as it is. */
export function protectPhiMailHref<T extends string | null | undefined>(href: T): T | string {
  if (typeof href !== "string") return href;
  return /^mailto:/iu.test(href.trim()) ? encodePhiProtectedMail(href.trim()) : href;
}

export type PhiMailTextSegment = { kind: "text"; text: string } | { kind: "mail"; token: string };

/** A text cut where it names an address, each address protected; one text segment when it names none. */
export function splitPhiMailAddresses(text: string): PhiMailTextSegment[] {
  const segments: PhiMailTextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(PHI_MAIL_ADDRESS_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ kind: "text", text: text.slice(cursor, start) });
    segments.push({ kind: "mail", token: encodePhiProtectedMail(match[0]) });
    cursor = start + match[0].length;
  }
  if (cursor < text.length || segments.length === 0) segments.push({ kind: "text", text: text.slice(cursor) });
  return segments;
}
