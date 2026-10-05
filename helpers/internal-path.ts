/**
 * An address on this Site, and only one.
 *
 * The rule is phis-server's `normalizeAuthNextPath`, kept the same on both sides: one leading slash,
 * no second slash or backslash after it, no control characters, and parsed against a fixed origin it
 * must not leave. The backslash is the one that matters -- a browser reads `/\evil.com` as `//evil.com`,
 * so a reader that refused only `//` sent a visitor who finished signing in onto somebody else's host.
 *
 * Returns the trimmed path with its query and fragment, or `null`. Where a caller wants only the
 * pathname it resolves the accepted value itself; the check is what this shares.
 */
export function readPhiInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(normalized)
  ) {
    return null;
  }
  try {
    return new URL(normalized, "https://phi.invalid").origin === "https://phi.invalid" ? normalized : null;
  } catch {
    return null;
  }
}
