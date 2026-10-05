/**
 * The cookie that carries a Site session, as phis-server names it (`SESSION_COOKIE_NAME`).
 *
 * Read on this side to decide whether there is anybody to ask about: the proxy keeps a request without
 * it on the static path, and the runtime does not ask Core who is signed in when nobody is.
 */
export const PHI_SITE_SESSION_COOKIE = "phis_session";

/** Whether a Cookie header names a Site session at all. The value is not read; Core verifies it. */
export function hasPhiSiteSessionCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((pair) => pair.trim().startsWith(`${PHI_SITE_SESSION_COOKIE}=`));
}
