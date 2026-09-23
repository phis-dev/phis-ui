import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";

/**
 * How much of a person's inbox is waiting for them.
 *
 * Conversations, not messages, and the name says so. Core marks a thread unread by comparing its last
 * message against what this reader has read (`last_message_id > last_read_message_id`), so "three new
 * messages in one conversation" and "one new message in three" are the same number to it. Counting
 * messages would need a count Core does not keep, and a card that said "messages" while showing
 * threads would be wrong in the one direction nobody checks -- downward, quietly, whenever a
 * conversation ran on.
 *
 * Asked with `pageSize=1` because only the total is wanted: `total` comes from a window function over
 * the whole filtered set, so the page size costs rows and not correctness.
 */

export type PhiThreadInboxStats = {
  unreadThreadCount: number;
};

export type GetPhiThreadInboxStatsOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  /** The viewer's own cookies. Core answers this route from the session and refuses without one. */
  cookieHeader: string;
};

export const getPhiThreadInboxStats = cache(async function getPhiThreadInboxStats({
  apiBaseUrl,
  internalToken,
  siteKey,
  cookieHeader,
}: GetPhiThreadInboxStatsOptions): Promise<PhiThreadInboxStats> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getPhiThreadInboxStats.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getPhiThreadInboxStats.");
  }
  if (!cookieHeader.trim()) {
    throw new Error("An inbox count needs the viewer's session.");
  }

  const response = await fetch(
    buildApiUrl(apiBaseUrl, "/api/site/threads?unreadOnly=1&pageSize=1"),
    {
      headers: buildApiHeaders({
        token: internalToken,
        siteKey,
        includeToken: true,
        includeSiteKey: true,
        extra: {
          Accept: "application/json",
          Cookie: cookieHeader,
          "User-Agent": "phis-ui/1.0",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to read the conversation inbox (${response.status}).`);
  }

  const payload = (await response.json()) as { total?: unknown };
  if (typeof payload.total !== "number" || !Number.isFinite(payload.total)) {
    throw new Error("The conversation inbox answered without a total.");
  }

  return { unreadThreadCount: Math.max(0, Math.trunc(payload.total)) };
});
