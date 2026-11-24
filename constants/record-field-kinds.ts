/**
 * The kinds a field of a record can be. Closed: a Widget says which of them it draws, and the Builder offers
 * only those. Here rather than beside the record types, so that reading the list at runtime does not load them.
 */
export const PHI_RECORD_FIELD_KINDS = [
  "text", "markdown", "picture", "pictures", "list", "tag", "date", "number", "money", "link",
] as const;

export type PhiRecordFieldKind = (typeof PHI_RECORD_FIELD_KINDS)[number];

/**
 * The kinds a line of text can show: a text as it is, a number, a date and an amount of money in the
 * page's language (`formatPhiRecordFieldText`, `helpers/record-fields.ts`).
 */
export const PHI_RECORD_TEXT_FIELD_KINDS = ["text", "number", "date", "money"] as const satisfies readonly PhiRecordFieldKind[];

/**
 * Bits of a `markdown` field's `flags` (`PhiRecordMarkdown`). `Translated`: the text already is in the
 * page's language, a person's translation, and is drawn as written; without it the text is source text in
 * its `sourceLocale`, and the Markdown Widget translates it (TRANSLATIONS.md, "The Markdown unit format").
 */
export const PhiRecordMarkdownFlag = { Translated: 1 << 0 } as const;

/** Every bit `PhiRecordMarkdownFlag` names; `flags` with any other bit make no markdown field. */
export const PHI_RECORD_MARKDOWN_KNOWN_FLAGS = PhiRecordMarkdownFlag.Translated;
