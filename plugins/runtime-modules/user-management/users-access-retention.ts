import "server-only";

import { fetchPhiSiteApi } from "../../../gateway/site-api-request";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

/**
 * How many days this Site keeps its `users:v1` access log, read where the Settings page is built so its
 * retention Form opens on the number Core holds.
 *
 * The read is Core's own Admin route (`GET /api/site/admin/users-access`, `{ retentionDays, addons }`),
 * which answers from the viewer's session -- a Site Admin's only -- so the viewer's cookies go along. A
 * refusal is the Page's answer: it is the same route every part of the page stands on.
 */
export async function readPhiUsersAccessRetentionDays({
  siteKey,
  cookieHeader,
}: {
  siteKey: string;
  cookieHeader: string;
}): Promise<number> {
  const { apiBaseUrl, internalToken } = readPhiServerApiCredentials();
  const payload = await fetchPhiSiteApi<{ retentionDays?: unknown }>({
    context: "readPhiUsersAccessRetentionDays",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/site/admin/users-access",
    cookieHeader,
    failure: "Failed to read the access log retention",
  });
  const days = payload?.retentionDays;
  if (typeof days !== "number" || !Number.isSafeInteger(days)) {
    throw new Error("The access log retention is invalid.");
  }
  return days;
}
