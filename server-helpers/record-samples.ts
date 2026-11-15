import "server-only";

import { logRuntimeEvent } from "../net/log";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsRuntimeRenderRegistry } from "../types/cms-plugins";
import type { PhiCmsPageRecordDescriptor } from "../types/record-provider";
import type { PhiRuntimeDataProviderBinding } from "../types/runtime-data-provider";
import { phiRuntime } from "./phi-runtime";

type PhiRecordSamplesRegistry = Pick<PhiCmsRuntimeRenderRegistry, "recordSamplesLoadersByKey">;

/**
 * The record the Builder's Preview shows a template with (MODULES.md, "The fields of a record, and the
 * record a Page is about"): the first sample the route's record Provider offers, as the binding a Page
 * about a record carries.
 *
 * A sample's `params` are the Provider's own parameters (`{ slug: "chair" }`), not the route's, so they
 * become the binding as they are. `null` is a Provider that offers no samples or none now, or one whose
 * reader fails: the template then previews with its Widgets' own content, as it does in the Editor.
 */
export async function resolvePhiPageRecordSampleBinding({ registry, runtime, pageRecord }: {
  registry: PhiRecordSamplesRegistry;
  runtime: PhiBlockRuntime;
  pageRecord: PhiCmsPageRecordDescriptor;
}): Promise<PhiRuntimeDataProviderBinding | null> {
  const loadSamples = registry.recordSamplesLoadersByKey.get(pageRecord.providerKey);
  if (!loadSamples) {
    return null;
  }
  const rt = phiRuntime(runtime);
  try {
    const read = await loadSamples();
    const samples = await read({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      locale: runtime.locale.current,
      runtime,
    });
    const sample = samples[0];
    return sample ? { providerKey: pageRecord.providerKey, params: sample.params } : null;
  } catch (error) {
    logRuntimeEvent("warn", "cms.record.samples_failed", {
      message: `Failed to read the samples of record provider "${pageRecord.providerKey}" for the Preview.`,
      siteKey: rt.siteKey,
      area: runtime.area,
      error,
      meta: { providerKey: pageRecord.providerKey },
    });
    return null;
  }
}
