/**
 * The kinds a field of a record can be. Closed: a Widget says which of them it draws, and the Builder offers
 * only those. Here rather than beside the record types, so that reading the list at runtime does not load them.
 */
export const PHI_RECORD_FIELD_KINDS = [
  "text", "markdown", "picture", "pictures", "list", "tag", "date", "number", "link",
] as const;

export type PhiRecordFieldKind = (typeof PHI_RECORD_FIELD_KINDS)[number];
