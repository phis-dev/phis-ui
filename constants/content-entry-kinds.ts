/**
 * The content types a Site writes as entries rather than places with a Widget (phis-server CONTENT.md).
 *
 * Core declares them in `SITE_CONTENT_ENTRY_KINDS` and serves each under its name; this is the same list
 * as this package reads it. A kind is added in Core first -- its type number and translation contexts --
 * and then here, and the Module that writes it names it (`CONTENT_ENTRIES.md`).
 */
export const PHI_CONTENT_ENTRY_KINDS = ["news", "blog"] as const;

export type PhiContentEntryKind = (typeof PHI_CONTENT_ENTRY_KINDS)[number];

export function isPhiContentEntryKind(value: unknown): value is PhiContentEntryKind {
  return typeof value === "string" && (PHI_CONTENT_ENTRY_KINDS as readonly string[]).includes(value);
}

/**
 * Where the editor writes one kind's entries, behind the content-editing and the publishing guard; who an
 * entry is attributed to and what it is filed under (`curation`), and the kind's categories.
 */
export function resolvePhiContentEntryEditorApiPaths(kind: PhiContentEntryKind) {
  const base = `/api/site/editor/entries/${kind}`;
  return {
    entries: base,
    submit: `${base}/submit`,
    publish: `${base}/publish`,
    curation: `${base}/curation`,
    categories: `${base}/categories`,
  } as const;
}
