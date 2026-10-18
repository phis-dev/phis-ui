/**
 * Where the page that places the curation Form names the two empty choices -- "Nobody", "None" -- in its
 * language.
 *
 * The options come from a Client Provider, which has no Label Set; the placement does, and the Provider
 * reads its config (`site-locales-config.ts` hands the languages over the same way). One constant for both
 * sides, because a key spelled twice is a choice that is silently unlabelled on one of them.
 */
export const PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS = {
  author: "authorNoneLabel",
  category: "categoryNoneLabel",
} as const;
