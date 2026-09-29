import { fetchPhiCsrfToken } from "./csrf-token";

/**
 * Ending a session, as the two places that perform it both do it.
 *
 * The request is the same in both -- the sign-out Page, and the Core Runtime adapter answering a
 * `session/clear` signal, which is what the account menu, the sidebar's sign-out entry and the
 * password-change dialog send. What follows it is not, and deliberately so: the Page replaces itself
 * so Back does not return to a sign-out that already happened, and the adapter loads the Page it stands
 * on again as a fresh document, because whether whoever is now nobody may still stand there is the
 * Area's answer, and nothing rendered or stored for the old session may outlive it. Two endings, two
 * reasons, one request.
 *
 * Some callers used to set `x-phis-site-key`, which never arrives: `next/proxy-runtime.ts` strips
 * every `x-phis-` header on the way through and sets the Site's own, so that a request from the open
 * internet cannot claim to come from inside. None sets it now, so none can look as if it forgot to.
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
