/**
 * The file types a Site serves as files, as opposed to pages whose last segment happens to hold a dot.
 *
 * Any suffix used to count: `/en/team/jane.doe` and `/en/docs/v1.2` went through as assets, without the
 * locale the proxy sets and without the request path the page reads, and rendered the Area root. A page
 * path may carry a dot; a file this proxy has to let past is one of these.
 */
const PHI_STATIC_FILE_EXTENSIONS = new Set([
  "avif", "bmp", "css", "eot", "gif", "ico", "jpeg", "jpg", "js", "json", "map", "mjs", "mp3", "mp4",
  "otf", "pdf", "png", "svg", "ttf", "txt", "wasm", "webm", "webmanifest", "webp", "woff", "woff2", "xml",
]);

export function isPhiAssetOrBackendPath(pathname: string) {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return true;
  }
  const extension = /\.([a-z0-9]+)$/i.exec(pathname)?.[1]?.toLowerCase();
  return extension != null && PHI_STATIC_FILE_EXTENSIONS.has(extension);
}
