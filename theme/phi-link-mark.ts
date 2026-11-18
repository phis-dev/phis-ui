/**
 * The mark behind a link that leaves the Site.
 *
 * A link in running text that goes to another site carries a small arrow after its words, so a reader
 * knows before following it that it leaves this Site. The mark is drawn by CSS
 * (`styles/controls.css`, `a[data-phi-external-mark]::after`) on links whose caller asks for it --
 * `PhiLink` with `markExternal`, said by Markdown, Simple Text and a link cell -- and never on a link
 * that is a button, a logo or a picture, where an arrow after the content would be noise.
 *
 * The Theme decides whether marks are shown at all (`links.externalMark`, on unless stated `false`).
 * It rides as a token of this package's own, so Ant Design writes it as `--phi-link-external-mark` under
 * the Theme's class like every other token, and the Theme workspace previews it the same way.
 */

export type PhiThemeLinks = {
  /** Whether a link to another site wears the mark; absent is on. */
  externalMark?: boolean | null;
};

export const PHI_LINK_EXTERNAL_MARK_ATTRIBUTE = "data-phi-external-mark";

/** Whether the Theme shows the mark: on unless it says `false`. */
export function readPhiThemeExternalLinkMark(links: PhiThemeLinks | null | undefined) {
  return links?.externalMark !== false;
}

/** The token the stylesheet reads: the mark's `display`, `none` where the Theme turned it off. */
export function buildPhiThemeLinkTokens(links: PhiThemeLinks | null | undefined) {
  return { linkExternalMark: readPhiThemeExternalLinkMark(links) ? "inline-block" : "none" };
}

/** Whether an address leaves the Site over the web; a mail or phone link is not marked. */
export function isPhiMarkableExternalHref(href: string) {
  return /^(https?:)?\/\//i.test(href.trim());
}
