import "server-only";

import { isPhiContentEntryKind } from "../../../../constants/content-entry-kinds";
import { loadPhiContentEntryPage } from "../../../../server-helpers/content-entry-page";
import type { PhiContentEntryRecord } from "../../../../types/content-entries";
import type { PhiRuntimeRecordProviderResolver } from "../../../../types/record-provider";

/**
 * The content entry record Provider (`PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry`): the entry the
 * binding names by kind and slug, with its relatives, or `null` where it names none.
 *
 * Through the detail Page's own question (`loadPhiContentEntryPage`), which the route's tree asks too for
 * the Page's title and status -- so the tree and every Widget bound here cost Core one read between them.
 */
export const resolvePhiContentEntryRecord: PhiRuntimeRecordProviderResolver = async (params, context) => {
  const slug = typeof params.slug === "string" ? params.slug.trim() : "";
  if (!isPhiContentEntryKind(params.kind) || !slug) {
    return null;
  }
  const page = await loadPhiContentEntryPage(context.runtime, { kind: params.kind, slug });
  return page ? ({ kind: params.kind, ...page } satisfies PhiContentEntryRecord) : null;
};
