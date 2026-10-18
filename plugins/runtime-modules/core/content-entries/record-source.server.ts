import "server-only";

import { resolvePhiRecordSource } from "../../../../server-helpers/record-source";
import type { PhiBlockRuntime } from "../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../types/cms-plugins";
import { readPhiContentEntryRecord, type PhiContentEntryRecord } from "../../../../types/content-entries";
import type { PhiRuntimeDataProviderBinding } from "../../../../types/runtime-data-provider";

/**
 * The entry an entry Widget is bound to, as the three of them draw it: the record, none by that address,
 * or none to be had. A record of another shape -- a binding to some other Module's Provider -- is no entry,
 * and is said as unavailable rather than drawn as an empty one.
 */
export async function readPhiBoundContentEntry(input: {
  registry: Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey"> | undefined;
  runtime: PhiBlockRuntime;
  binding: PhiRuntimeDataProviderBinding;
}): Promise<{ status: "ok"; record: PhiContentEntryRecord } | { status: "missing" } | { status: "unavailable" }> {
  if (!input.registry) {
    return { status: "unavailable" };
  }
  const result = await resolvePhiRecordSource({ ...input, registry: input.registry });
  if (result.status !== "ok") {
    return result.status === "missing" ? result : { status: "unavailable" };
  }
  const record = readPhiContentEntryRecord(result.record);
  return record ? { status: "ok", record } : { status: "unavailable" };
}
