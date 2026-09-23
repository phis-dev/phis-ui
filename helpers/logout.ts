import { fetchPhiCsrfToken } from "./csrf-token";

/**
 * Ending a session, as the three places that offer it all do it.
 *
 * The request is the same in all three -- the account menu in the sidebar, the sign-out Page, and the
 * Core Runtime adapter answering a `session/clear` signal. What follows it is not, and deliberately so:
 * the menu loads a fresh document because the page behind it was rendered for a session that is gone,
 * the Page replaces itself so Back does not return to a sign-out that already happened, and the adapter
 * asks the Area for the Page again because whether whoever is now nobody may still stand there is the
 * Area's answer and not the adapter's. Three endings, three reasons, one request.
 *
 * Two of them also set `x-phis-site-key`, which never arrives: `next/proxy-runtime.ts` strips every
 * `x-phis-` header on the way through and sets the Site's own, so that a request from the open internet
 * cannot claim to come from inside. Read side by side, the third looked like it had forgotten
 * something. It had not, and now there is nothing to forget.
 */
export const PHI_LOGOUT_PATH = "/api/auth/logout";

export type RequestPhiLogoutOptions = {
  signal?: AbortSignal;
  /** What the failure says, where a caller has a surface to say it on. */
  failedMessage?: string;
};

/**
 * Throws unless the session was ended, on the same grounds `fetchPhiCsrfToken` does: a caller that
 * means to stay quiet writes a `catch` and is visibly quiet, rather than forgetting an `if`.
 */
export async function requestPhiLogout(options: RequestPhiLogoutOptions = {}): Promise<void> {
  const token = await fetchPhiCsrfToken({
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.failedMessage ? { unavailableMessage: options.failedMessage } : {}),
  });
  const response = await fetch(PHI_LOGOUT_PATH, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "x-csrf-token": token },
    ...(options.signal ? { signal: options.signal } : {}),
  });
  if (!response.ok) {
    throw new Error(options.failedMessage ?? "Could not sign out.");
  }
}
