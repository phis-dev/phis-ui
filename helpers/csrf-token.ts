/**
 * The CSRF token a browser needs before it may change anything, fetched in one place.
 *
 * It was fetched in ten, with four spellings between them: two threw a hard-coded English sentence, one
 * threw a `PhiTableProviderError`, and three gave up silently -- a logout that quietly did nothing, a
 * theme preference that quietly stayed unsaved. The request is identical in all ten; only what to do
 * about a failure differs, and that belongs to the caller.
 *
 * **It throws rather than returning null.** A null invites the `if` that was forgotten three times: the
 * token comes back empty, the request goes out without it, the server refuses it, and nothing says so.
 * A caller that means to stay quiet writes a `catch` and is visibly quiet on purpose.
 */

/**
 * Core's CSRF endpoint for a browser, as `validate-form-gateway-contracts.ts` knows it.
 *
 * The `/api/v1/` spelling beside it in that script is the server-to-server one, which a browser never
 * uses: this path forwards the visitor's session, the versioned one carries an internal token.
 */
export const PHI_CSRF_TOKEN_PATH = "/api/auth/csrf";

export type FetchPhiCsrfTokenOptions = {
  signal?: AbortSignal;
  /** What the failure says, where a caller has a sentence from its own Label Set. */
  unavailableMessage?: string;
};

export async function fetchPhiCsrfToken(options: FetchPhiCsrfTokenOptions = {}): Promise<string> {
  const response = await fetch(PHI_CSRF_TOKEN_PATH, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    ...(options.signal ? { signal: options.signal } : {}),
  });
  const payload = await response.json().catch(() => null) as { token?: unknown } | null;
  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  if (!response.ok || !token) {
    throw new Error(options.unavailableMessage ?? "Could not start a secure request.");
  }
  return token;
}

/** The cookie Core's CSRF endpoint sets, readable by the page so it can repeat it in `x-csrf-token`. */
const PHI_CSRF_COOKIE_NAME = "phis_csrf";

function readPhiCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  for (const part of document.cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== PHI_CSRF_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * The token this browser already holds, or a fresh one where it holds none.
 *
 * For a request that goes out for whoever sends it, such as a Form submit: reading the cookie keeps the
 * pair Core may have rotated -- sign-in replaces it -- instead of minting another beside it, and a
 * fetch only happens once per browser. What the server compares is the header against that same cookie.
 */
export async function readPhiCsrfToken(options: FetchPhiCsrfTokenOptions = {}): Promise<string> {
  return readPhiCsrfCookie() || fetchPhiCsrfToken(options);
}
