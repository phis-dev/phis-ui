import { PHI_VIDEO_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_VIDEO_EMBED_WIDGET_DEFINITION } from "./widgets/embed/config";
import { definePhiFirstPartyWidget } from "../contracts";

export const PHI_VIDEO_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  definePhiFirstPartyWidget({
    definition: PHI_VIDEO_EMBED_WIDGET_DEFINITION,
    ownerModuleId: PHI_VIDEO_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/embed/plugin").then((module) => module.PHI_VIDEO_EMBED_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/embed/plugin").then((module) => module.PHI_VIDEO_EMBED_WIDGET_PLUGIN),
  }),
] as const;
