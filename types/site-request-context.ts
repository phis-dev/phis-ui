import type { PhiCapabilitySnapshot } from "./server-capabilities";
import type { PhiBlockRuntime, PhiResolvedBlockRuntimeSite } from "./widget-runtime";

/*
 * What the server knows about the request a Page renders for, in types only -- kept apart from the
 * loader in `server-helpers/runtime.ts` for the reason `types/site-config.ts` gives.
 */

export type PhiSiteRequestContext = {
  serverCapabilities: PhiCapabilitySnapshot;
  site: PhiResolvedBlockRuntimeSite;
  locale: {
    current: string;
  };
  viewer: PhiBlockRuntime["viewer"];
};
