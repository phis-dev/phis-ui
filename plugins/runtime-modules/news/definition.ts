import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "./forms";
import { PHI_NEWS_RUNTIME_MODULE_IDENTITY } from "./ids";

/**
 * The face of Core's `news` content kind, and nothing more (`CONTENT_ENTRIES.md`).
 *
 * News entries live in Core's `site_content`, and every question about them -- who may write one, what a
 * version is, when one disappears -- is Core's ([phis-server CONTENT.md](../../../../phis-server/CONTENT.md)).
 * What this Module contributes is its three Pages and its two Forms; the list and detail Widgets and the
 * Provider behind the editor's Table are the Core Module's, shared with every other kind.
 */
export const PHI_NEWS_RUNTIME_MODULE_DEFINITION = {
  ...PHI_NEWS_RUNTIME_MODULE_IDENTITY,
  kind: "module",
  eligibleAreas: ["public", "editor"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "News",
  description: "The Site's news: read on a Public address, written in the Editor.",
  category: "content",
  icon: "antd:read",
  formProviders: { handlers: PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS },
} satisfies PhiRuntimeModuleDefinition;
