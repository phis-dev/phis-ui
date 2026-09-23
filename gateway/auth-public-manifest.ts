import "server-only";

import { PHIS_SITE_KEY_HEADER } from "../constants/http-headers";
import type { PhiAuthWorkflow, PhiPublicAuthManifest } from "../types/auth-manifest";

export type FetchPhiPublicAuthOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

function buildHeaders(options: FetchPhiPublicAuthOptions, userAgent: string, cookieHeader?: string) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${options.internalToken}`,
    [PHIS_SITE_KEY_HEADER]: options.siteKey,
    "user-agent": userAgent,
  };
  if (cookieHeader?.trim()) {
    headers.cookie = cookieHeader.trim();
  }
  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readManifest(value: unknown): PhiPublicAuthManifest | null {
  return isRecord(value) && value.version === 1 && Array.isArray(value.methods)
    ? (value as PhiPublicAuthManifest)
    : null;
}

/**
 * Which sign-in methods the Site offers, read while the Login page is being rendered.
 *
 * The widget used to ask for this itself, after hydration, and drew a skeleton until the answer came
 * back. The endpoint answers in milliseconds, so almost all of that wait was the page becoming
 * interactive first -- around three seconds in development, and a blank card either way. Nothing here
 * depends on the viewer, so the server already knows it: rendered with the page, the form is in the
 * first paint.
 */
export async function fetchPhiPublicAuthManifest(
  options: FetchPhiPublicAuthOptions,
): Promise<PhiPublicAuthManifest> {
  if (!options.apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for fetchPhiPublicAuthManifest.");
  }
  if (!options.siteKey.trim()) {
    throw new Error("Missing siteKey for fetchPhiPublicAuthManifest.");
  }

  const response = await fetch(`${options.apiBaseUrl}/api/v1/auth/manifest`, {
    method: "GET",
    headers: buildHeaders(options, "phis-ui-auth-manifest/1.0"),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Auth manifest fetch failed (${response.status}).`);
  }

  const manifest = readManifest(await response.json().catch(() => null));
  if (!manifest) {
    throw new Error("Missing auth manifest payload.");
  }
  return manifest;
}

/**
 * Whether this Site lets somebody create an account.
 *
 * The manifest names a mode, and every reader wanting the plain answer would have to know that
 * `disabled` is the one value that means no. Two readers knowing it are two places to correct when a
 * third mode arrives, so the reading lives here: the Login form's link and the account menu's entry
 * cannot come to different conclusions about the same Site.
 */
export function phiPublicAuthManifestOffersRegistration(manifest: PhiPublicAuthManifest): boolean {
  return manifest.registrationMode !== "disabled";
}

/**
 * Where this request's viewer stands in signing in, or null when the request carries no Session.
 *
 * Needs the viewer's cookies, because an unfinished authentication is held in their Session. A visitor
 * without one is the ordinary case and answers 401 -- which the widget used to provoke on every Login
 * page view, two red lines in the console for a question whose answer was "nobody is signed in".
 *
 * **`null` means one thing: no Session on this request.** It used to mean two, because a `complete`
 * workflow was folded into it as well, which made a signed-in viewer and an anonymous one give the same
 * answer -- and Core answers `complete` for everybody who is signed in, not for some edge case
 * (`serializeAuthWorkflow` returns it for any session that is in neither intermediate state). For the
 * one caller this function was written for that was survivable, because it only ever asked whether to
 * interrupt somebody. For a reader that has to say which state the viewer is in it is not: "nobody told
 * me" would pass as "finished", over a security decision, which is exactly what
 * [design/STATE_MACHINES.md](../design/STATE_MACHINES.md) forbids of a projection.
 *
 * For the same reason nothing else folds into `null` either. A missing base URL or Site key is a
 * misconfiguration and throws, as it does for the manifest above; a 200 that carries no readable
 * workflow is a broken answer and throws too. Only the absent Session is silent.
 */
export async function fetchPhiAuthWorkflow(
  options: FetchPhiPublicAuthOptions & { cookieHeader?: string },
): Promise<PhiAuthWorkflow | null> {
  if (!options.apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for fetchPhiAuthWorkflow.");
  }
  if (!options.siteKey.trim()) {
    throw new Error("Missing siteKey for fetchPhiAuthWorkflow.");
  }
  if (!options.cookieHeader?.trim()) {
    return null;
  }

  const response = await fetch(`${options.apiBaseUrl}/api/v1/auth/workflow`, {
    method: "GET",
    headers: buildHeaders(options, "phis-ui-auth-workflow/1.0", options.cookieHeader),
    cache: "no-store",
  });
  // 401 is the answer for a visitor who is not mid-authentication, which is most of them.
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Auth workflow fetch failed (${response.status}).`);
  }

  const payload = await response.json().catch(() => null);
  if (!isRecord(payload) || !isRecord(payload.workflow)) {
    throw new Error("Auth workflow answered without a workflow.");
  }
  return payload.workflow as PhiAuthWorkflow;
}
