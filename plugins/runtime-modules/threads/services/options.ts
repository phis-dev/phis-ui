"use client";

import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";

/**
 * The people this viewer may open a conversation with.
 *
 * Asked of the Site rather than assembled from a directory: who is reachable is a question about shared
 * group membership and about what the Site lets Staff see, and both answers are the control plane's.
 * The route takes no parameters and pages nothing, so neither does this -- a person sees who they may
 * write to, which is a short list by construction and searchable in the control itself.
 *
 * The company, not the address: it is what tells two people of the same name apart, and it is also all
 * the route discloses.
 */
const CANDIDATES_PATH = "/api/site/threads/candidates";

export const PhiThreadCandidatesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.candidates,
  load: async () => {
    const response = await fetch(CANDIDATES_PATH, {
      cache: "no-store",
      credentials: "include",
      headers: { accept: "application/json" },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error("Failed to load who you can write to.");
    return payload;
  },
  resolveLoadKey: () => "thread-candidates",
  resolve: (context: PhiControlOptionsProviderContext) => {
    const users = (context.asyncData as { users?: unknown } | null)?.users;
    return {
      options: (Array.isArray(users) ? users : []).flatMap((entry) => {
        const row = entry as Record<string, unknown>;
        const userId = row.userId;
        if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) return [];
        const name = typeof row.displayName === "string" && row.displayName.trim()
          ? row.displayName.trim()
          : `#${userId}`;
        const company = typeof row.companyName === "string" && row.companyName.trim()
          ? row.companyName.trim()
          : null;
        return [{ value: String(userId), label: company ? `${name} (${company})` : name }];
      }),
    };
  },
});
