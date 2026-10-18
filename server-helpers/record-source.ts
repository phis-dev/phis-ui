import "server-only";

import { logRuntimeEvent } from "../net/log";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsRuntimeRenderRegistry } from "../types/cms-plugins";
import type { PhiRuntimeDataProviderBinding } from "../types/runtime-data-provider";
import { phiRuntime } from "./phi-runtime";
import { definePhiRequestMemoWith } from "./request-memo";

/**
 * What a record binding answered (`types/record-provider.ts`).
 *
 * Three outcomes a Widget draws differently: the record, no record by that name -- an empty state, or a
 * 404 on a Page that is about it -- and a Provider that could not be asked, which is said as such rather
 * than passed off as "nothing here".
 */
export type PhiRecordSourceResult =
  | { status: "ok"; record: unknown }
  | { status: "missing" }
  | { status: "unavailable"; reason: string };

const resolveRecord = definePhiRequestMemoWith(async (
  key: { providerKey: string; params: Record<string, unknown>; siteKey: string; locale: string },
  using: {
    registry: Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey">;
    runtime: PhiBlockRuntime;
    apiBaseUrl: string;
    internalToken: string;
  },
): Promise<PhiRecordSourceResult> => {
  const load = using.registry.recordProviderLoadersByKey.get(key.providerKey as `${string}/${string}`);
  if (!load) {
    return { status: "unavailable", reason: `No active Module serves the record provider "${key.providerKey}".` };
  }
  try {
    const resolve = await load();
    const record = await resolve(key.params, {
      apiBaseUrl: using.apiBaseUrl,
      internalToken: using.internalToken,
      siteKey: key.siteKey,
      locale: key.locale,
      runtime: using.runtime,
    });
    return record == null ? { status: "missing" } : { status: "ok", record };
  } catch (error) {
    logRuntimeEvent("error", "cms.record.resolve_failed", {
      message: `Failed to read record provider "${key.providerKey}" for this render.`,
      siteKey: key.siteKey,
      area: using.runtime.area,
      error,
      meta: { providerKey: key.providerKey },
    });
    return { status: "unavailable", reason: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * The record a Widget's binding names, read on the server while the page is drawn.
 *
 * Once per request for the same Provider and parameters, however many parts of the page ask -- a header,
 * a body and a related list bound to one entry cost its Provider one answer between them.
 */
export function resolvePhiRecordSource({
  registry,
  runtime,
  binding,
}: {
  registry: Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey">;
  runtime: PhiBlockRuntime;
  binding: PhiRuntimeDataProviderBinding | null;
}): Promise<PhiRecordSourceResult> {
  if (!binding) {
    return Promise.resolve({ status: "missing" });
  }
  const rt = phiRuntime(runtime);
  return resolveRecord(
    { providerKey: binding.providerKey, params: binding.params ?? {}, siteKey: rt.siteKey, locale: runtime.locale.current },
    { registry, runtime, apiBaseUrl: rt.apiBaseUrl, internalToken: rt.internalToken },
  );
}
