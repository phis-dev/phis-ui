/**
 * The parts of an entry a Widget may show, as flags (`CONTENT_ENTRIES.md`, Showing an entry).
 *
 * One vocabulary for every entry Widget -- the header, the body, the list -- so "show the author" means the
 * same bit wherever it is set. A Widget states which parts it offers at all; the rest of the mask means
 * nothing to it. Values are part of stored configs and never change meaning.
 */
export const PhiContentEntryPart = {
  Title: 1 << 0,
  Subtitle: 1 << 1,
  Date: 1 << 2,
  Author: 1 << 3,
  Avatar: 1 << 4,
  Category: 1 << 5,
  Tags: 1 << 6,
  Link: 1 << 7,
} as const;

export type PhiContentEntryPartFlag = (typeof PhiContentEntryPart)[keyof typeof PhiContentEntryPart];

/** Every part, in the order an Inspector lists them, with the words it lists them by. */
const PHI_CONTENT_ENTRY_PART_OPTIONS = [
  { value: PhiContentEntryPart.Title, label: "Title" },
  { value: PhiContentEntryPart.Subtitle, label: "Subtitle" },
  { value: PhiContentEntryPart.Date, label: "Date" },
  { value: PhiContentEntryPart.Author, label: "Author" },
  { value: PhiContentEntryPart.Avatar, label: "Author picture" },
  { value: PhiContentEntryPart.Category, label: "Category" },
  { value: PhiContentEntryPart.Tags, label: "Tags" },
  { value: PhiContentEntryPart.Link, label: "Link" },
] as const;

/** The options for a Widget that offers only some parts. */
export function phiContentEntryPartOptions(offered: number) {
  return PHI_CONTENT_ENTRY_PART_OPTIONS.filter((option) => (offered & option.value) !== 0);
}

/**
 * A stored mask, kept to what the Widget offers. Anything that is not a whole number is no statement, and
 * the Widget's default answers -- a Widget nobody configured shows what it shows by default.
 */
export function readPhiContentEntryParts(value: unknown, offered: number, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value & offered : fallback & offered;
}

export function hasPhiContentEntryPart(parts: number, part: PhiContentEntryPartFlag) {
  return (parts & part) !== 0;
}

/**
 * What an entry list nobody configured shows: what it showed before the parts were a choice. Here rather
 * than beside the list Widget, because the Pages a kind's Module draws state it too.
 */
export const PHI_ENTRY_LIST_DEFAULT_PARTS = PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle
  | PhiContentEntryPart.Date | PhiContentEntryPart.Tags | PhiContentEntryPart.Link;
