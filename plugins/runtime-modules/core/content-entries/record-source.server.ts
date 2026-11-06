import "server-only";

import { resolvePhiRecordSource } from "../../../../server-helpers/record-source";
import type { PhiBlockRuntime } from "../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../types/cms-plugins";
import { readPhiContentEntryRecord, type PhiContentEntryRecord } from "../../../../types/content-entries";
import type { PhiRuntimeDataProviderBinding } from "../../../../types/runtime-data-provider";

/**
 * The entry an entry Widget is bound to, as the three of them draw it: the record, none by that address,
 * or none to be had. A record of another shape -- a binding to some other Module's Provider -- is no entry,
 * and is said as unavailable rather than drawn as an empty one. An unavailable one says why, which is
 * what the author reads in the Builder and the operator in the log.
 */
export async function readPhiBoundContentEntry(input: {
  registry: Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey"> | undefined;
  runtime: PhiBlockRuntime;
  binding: PhiRuntimeDataProviderBinding;
}): Promise<
  | { status: "ok"; record: PhiContentEntryRecord }
  | { status: "missing" }
  | { status: "unavailable"; reason: string }
> {
  if (!input.registry) {
    return { status: "unavailable", reason: "No record providers are available outside a page render." };
  }
  const result = await resolvePhiRecordSource({ ...input, registry: input.registry });
  if (result.status !== "ok") {
    return result;
  }
  const record = readPhiContentEntryRecord(result.record);
  return record
    ? { status: "ok", record }
    : { status: "unavailable", reason: `The record bound from "${input.binding.providerKey}" is not a content entry.` };
}
