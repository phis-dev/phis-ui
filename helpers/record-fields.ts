import type {
  PhiRecordField,
  PhiRecordFieldKind,
  PhiRecordFieldValueByKind,
  PhiRecordLink,
  PhiRecordPicture,
  PhiRecordTag,
} from "../types/record-provider";

/*
 * A record field's value, checked against its declared kind (`types/record-provider.ts`).
 *
 * A Module hands these over and a Core Widget draws them unseen, so the kind is the whole agreement: a
 * value that is not of its kind answers `undefined` and is not drawn.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** An address a record may name: absolute over http(s), or Site-relative. Never a scheme of its own. */
function readAddress(value: unknown) {
  if (typeof value !== "string") return undefined;
  const address = value.trim();
  return /^https?:\/\//iu.test(address) || (address.startsWith("/") && !address.startsWith("//")) ? address : undefined;
}

function readPicture(value: unknown): PhiRecordPicture | undefined {
  if (!isRecord(value)) return undefined;
  const src = readAddress(value.src);
  if (!src) return undefined;
  return typeof value.alt === "string" && value.alt ? { src, alt: value.alt } : { src };
}

const TAG_TONES: readonly string[] = ["default", "success", "warning", "error"];

function readTag(value: unknown): PhiRecordTag | undefined {
  if (!isRecord(value) || typeof value.label !== "string" || !value.label.trim()) return undefined;
  if (value.tone === undefined) return { label: value.label };
  return typeof value.tone === "string" && TAG_TONES.includes(value.tone)
    ? { label: value.label, tone: value.tone as PhiRecordTag["tone"] }
    : undefined;
}

function readLink(value: unknown): PhiRecordLink | undefined {
  if (!isRecord(value)) return undefined;
  const href = readAddress(value.href);
  if (!href) return undefined;
  return typeof value.label === "string" && value.label ? { href, label: value.label } : { href };
}

function readAll<T>(value: unknown, read: (entry: unknown) => T | undefined): readonly T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value.map(read);
  return entries.every((entry) => entry !== undefined) ? entries as T[] : undefined;
}

/** `value` as a field of `kind`, or `undefined` where it is not one. */
export function readPhiRecordFieldValue<K extends PhiRecordFieldKind>(
  kind: K,
  value: unknown,
): PhiRecordFieldValueByKind[K] | undefined;
export function readPhiRecordFieldValue(kind: PhiRecordFieldKind, value: unknown): unknown {
  switch (kind) {
    case "text":
    case "markdown":
      return typeof value === "string" ? value : undefined;
    case "picture":
      return readPicture(value);
    case "pictures":
      return readAll(value, readPicture);
    case "list":
      return readAll(value, (entry) => (typeof entry === "string" ? entry : undefined));
    case "tag":
      return readTag(value);
    case "date":
      return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : undefined;
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? value : undefined;
    case "link":
      return readLink(value);
  }
}

/** The kinds a line of text can show: a text as it is, a number and a date in the page's language. */
export const PHI_RECORD_TEXT_FIELD_KINDS = ["text", "number", "date"] as const satisfies readonly PhiRecordFieldKind[];

/** A text, number or date field as the words a page shows, written for `locale`. */
export function formatPhiRecordFieldText(
  field: Extract<PhiRecordField, { kind: (typeof PHI_RECORD_TEXT_FIELD_KINDS)[number] }>,
  locale: string,
) {
  if (field.kind === "text") return field.value;
  try {
    return field.kind === "number"
      ? new Intl.NumberFormat(locale).format(field.value)
      : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(field.value));
  } catch {
    return String(field.value);
  }
}
