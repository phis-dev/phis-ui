import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";
import { PHI_AUTH_LOGOUT_WIDGET_DEFINITION } from "./widgets/logout/config";
import { PHI_AUTH_SECURITY_WIDGET_DEFINITION } from "./widgets/security/config";

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_AUTH_RUNTIME_MODULE_WIDGETS = [
  defineFirstPartyWidget({
    definition: PHI_AUTH_LOGOUT_WIDGET_DEFINITION,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/logout/plugin")
      .then((module) => module.PHI_AUTH_LOGOUT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/logout/plugin")
      .then((module) => module.PHI_AUTH_LOGOUT_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_AUTH_SECURITY_WIDGET_DEFINITION,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/security/plugin")
      .then((module) => module.PHI_AUTH_SECURITY_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/security/plugin")
      .then((module) => module.PHI_AUTH_SECURITY_WIDGET_PLUGIN),
  }),
] as const;
