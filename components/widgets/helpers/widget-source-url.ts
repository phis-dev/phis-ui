/**
 * The address a Widget fetches its source from, for a source an author wrote as a path on this Site.
 *
 * A path is resolved against the Site's public URL, the address its visitors use, rather than against
 * the host the current request came in on. The result used to be the same behind the proxy, but reading
 * the request tied every page with such a Widget to that request, and a page that is the same for
 * everybody could not be rendered once for all of them. Anything that is not a path is returned as
 * written.
 */
export function resolvePhiWidgetSourceUrl(sourceUrl: string, publicUrl: string | null | undefined) {
  const trimmed = sourceUrl.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return trimmed;
  }
  const base = publicUrl?.trim() ?? "";
  if (!base) {
    throw new Error(`Cannot resolve the relative source ${trimmed} without the Site's public URL.`);
  }
  return new URL(trimmed, base.endsWith("/") ? base : `${base}/`).toString();
}
