/*
 * A dialog named by the record it shows ("Gallery: Private Cloud", "Terms: @acme/books:pro"): a sentence
 * with `%1` once, and the value of one field of the record standing there. The record Form and the record
 * Widget both announce it on `recordTitle` after every read (FORMS.md, TABLES.md); they differ only in
 * where the sentence comes from -- a Form text, or the record Widget's own placement -- so the two rules
 * they share are here.
 */

/** The sentence's rule: `%1` exactly once and no other placeholder, or the reason it is refused. */
export function checkPhiRecordTitleTemplate(source: string): string | null {
  const placeholders = source.match(/%\d+/gu) ?? [];
  return placeholders.length === 1 && placeholders[0] === "%1"
    ? null
    : `must hold %1 exactly once and no other placeholder: ${JSON.stringify(source)}.`;
}

/**
 * The sentence with the record's value in it, or "" where the record has no text or number there: an
 * empty title is the Overlay's own. The value goes in as it is -- never translated, `$` and `%1` included.
 */
export function fillPhiRecordTitle(template: string, value: unknown): string {
  const text = typeof value === "string"
    ? value.trim()
    : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  // A replacer, so a `$` in the value stays the value.
  return text ? template.replace("%1", () => text) : "";
}
