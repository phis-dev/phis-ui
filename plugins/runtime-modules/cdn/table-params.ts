/**
 * The words the CDN table Provider says itself, handed over by the placement as `source.params` in the
 * reader's language: the Provider has no Label Set, and the Page that binds it does.
 */
export const PHI_CDN_TABLE_PARAM_KEYS = {
  /** Where the rows would be when the Site has no CDN; it names `phis cdn attach`. */
  noCdnText: "noCdnText",
  copiedText: "copiedText",
  copyFailedText: "copyFailedText",
} as const;
