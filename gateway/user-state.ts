import { isPhiRecord } from "../helpers/is-record";
import { cache } from "react";
import "server-only";

import { isPhisUserStateKey } from "../constants/user-state";
import type { PhisUserStateStoredValue } from "../types/user-state";
import { fetchPhiSiteApi } from "./site-api-request";

/**
 * What this Site's Modules kept about the person looking, read while the page is rendered.
 *
 * Read here rather than in the browser because that is the difference between a dismissed card never
 * appearing and one that appears and then vanishes -- the worse result for the more complicated path.
 * It is deliberately not part of the render scope: a page whose Modules keep nothing should not pay for
 * a request, and `cache()` makes a second caller in the same render free, so the Widget that wants it
 * asks for it.
 *
 * Only for a signed-in viewer. Core answers from the session and refuses without one, and a Public page
 * is rendered once for everybody -- there `cookies()` is empty without saying so, which is exactly the
 * silence this reader must not translate into "they dismissed nothing"
 * ([STATIC_RENDERING.md](../STATIC_RENDERING.md)). A caller checks
 * `runtime.viewer.access === "authenticated"` first; this refuses an empty cookie rather than asking
 * anonymously.
 */

export type PhiUserState = Readonly<Record<string, PhisUserStateStoredValue>>;

export type GetPhiUserStateOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  /** The viewer's own cookies. Core answers this route from the session and refuses without one. */
  cookieHeader: string;
};

export const getPhiUserState = cache(async function getPhiUserState({
  apiBaseUrl,
  internalToken,
  siteKey,
  cookieHeader,
}: GetPhiUserStateOptions): Promise<PhiUserState> {
  if (!cookieHeader.trim()) {
    throw new Error("User state needs the viewer's session.");
  }

  const payload = await fetchPhiSiteApi<{ state?: unknown }>({
    context: "getPhiUserState",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/site/user-state",
    cookieHeader,
    failure: "Failed to read user state",
  });
  if (!isPhiRecord(payload?.state)) {
    throw new Error("User state answered without a state object.");
  }

  /*
   * Keys that do not parse are dropped rather than carried.
   *
   * Core filters on the Modules this Site runs, so what arrives is already scoped; this is about the
   * grammar, and a key that fails it cannot have been written through the route. Dropping it keeps a
   * reader from having to wonder, and there is nothing a caller could do with it anyway.
   */
  const state: Record<string, PhisUserStateStoredValue> = {};
  for (const [key, value] of Object.entries(payload?.state as Record<string, unknown>)) {
    if (isPhisUserStateKey(key)) {
      state[key] = value as PhisUserStateStoredValue;
    }
  }
  return state;
});
