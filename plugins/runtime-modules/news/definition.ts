import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

/**
 * The face of a Core content type, and nothing more.
 *
 * News entries live in Core's `site_content` and every question about them -- who may write one, what a
 * version is, when one disappears -- is Core's
 * ([phis-server design/NEWS.md](../../../../phis-server/design/NEWS.md)). What this Module contributes is
 * an address, an entry in the Public header, and a Widget that reads. It owns no data, which is why it has
 * no Controller, no Forms and no Data Providers: there is nothing here to coordinate and nothing to write.
 *
 * Public only. A Site's news is what it says to everybody; a signed-in Area showing the same list would
 * be the same page behind a login, and an Area that wants it can place the Widget itself once there is a
 * reason to.
 */
export const PHI_NEWS_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_NEWS_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["public"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "News",
  description: "The Site's published news, on one Public address.",
  category: "content",
  icon: "antd:notification",
} satisfies PhiRuntimeModuleDefinition;
