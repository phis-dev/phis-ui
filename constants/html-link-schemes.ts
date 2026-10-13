/**
 * The link schemes an HTML Widget keeps. One list for the sanitizer that stores a link and the toolbar
 * that offers one: the toolbar used to accept `sms:` as well, and the sanitizer then dropped the link
 * on blur without a word.
 */
export const PHI_HTML_LINK_SCHEMES = ["http", "https", "mailto", "tel"] as const;
