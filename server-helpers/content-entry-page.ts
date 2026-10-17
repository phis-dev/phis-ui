import "server-only";

import type { PhiContentEntryKind } from "../constants/content-entry-kinds";
import { fetchPhiSiteContentEntryPage, PHI_CONTENT_ENTRY_RELATED_LIMIT } from "../gateway/content-entries";
import type { PhiBlockRuntime } from "../types";
import { phiRuntime } from "./phi-runtime";

/**
 * The entry a detail Page is about, with its relatives -- the one way every part of the Page asks for it
 * (`CONTENT_ENTRIES.md`, The detail route).
 *
 * The tree asks for the Page's title and status, the header, the body and the related list ask while the
 * page is drawn. The request memo behind `fetchPhiSiteContentEntryPage` keys by the options, so they only
 * share one answer if they ask with the same ones -- which is why the options are built here and nowhere
 * else, relatives included whether or not the asking part shows them.
 */
export function loadPhiContentEntryPage(runtime: PhiBlockRuntime, input: { kind: PhiContentEntryKind; slug: string }) {
  const rt = phiRuntime(runtime);
  return fetchPhiSiteContentEntryPage({
    kind: input.kind,
    slug: input.slug,
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
    locale: runtime.locale.current,
    relatedLimit: PHI_CONTENT_ENTRY_RELATED_LIMIT,
  });
}
