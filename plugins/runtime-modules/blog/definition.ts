import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_BLOG_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "./forms";
import { PHI_BLOG_RUNTIME_MODULE_IDENTITY } from "./ids";

/**
 * The face of Core's `blog` content kind, and nothing more (`CONTENT_ENTRIES.md`).
 *
 * Blog posts live in Core's `site_content`, and every question about them -- who may write one, what a
 * version is, when one disappears -- is Core's ([phis-server CONTENT.md](../../../../phis-server/CONTENT.md)).
 * What this Module contributes is its three Pages and its two Forms; the list and detail Widgets and the
 * Provider behind the editor's Table are the Core Module's, shared with every other kind.
 */
export const PHI_BLOG_RUNTIME_MODULE_DEFINITION = {
  ...PHI_BLOG_RUNTIME_MODULE_IDENTITY,
  kind: "module",
  eligibleAreas: ["public", "editor"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "Blog",
  description: "The Site's blog: read on a Public address, written in the Editor.",
  category: "content",
  icon: "antd:file-text",
  formProviders: { handlers: PHI_BLOG_FORM_HANDLER_PROVIDER_DESCRIPTORS },
} satisfies PhiRuntimeModuleDefinition;
