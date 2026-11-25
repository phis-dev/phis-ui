import type { PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { definePhiFirstPartyWidget } from "../contracts";
import { PHI_CDN_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CDN_UPLOAD_WIDGET_DEFINITION } from "./widgets/upload/config";

export const PHI_CDN_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  definePhiFirstPartyWidget({
    definition: PHI_CDN_UPLOAD_WIDGET_DEFINITION,
    ownerModuleId: PHI_CDN_RUNTIME_MODULE_ID,
    // Nothing to show before a file is chosen: the Builder draws the house placeholder.
    renderPolicies: { runtime: "custom", preview: "visualPlaceholder", authoring: "custom" },
    loadRuntime: () => import("./widgets/upload/plugin").then((module) => module.PHI_CDN_UPLOAD_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/upload/plugin").then((module) => module.PHI_CDN_UPLOAD_WIDGET_PLUGIN),
  }),
] as const;
