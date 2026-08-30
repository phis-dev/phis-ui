import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import { PHI_AVATAR_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION } from "./widgets/account-avatar/config";
import { PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION } from "./widgets/account-avatar-picker/config";

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_AVATAR_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  defineFirstPartyWidget({
    definition: PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION,
    ownerModuleId: PHI_AVATAR_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/account-avatar/plugin").then((module) => module.PHI_ACCOUNT_AVATAR_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/account-avatar/plugin").then((module) => module.PHI_ACCOUNT_AVATAR_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION,
    ownerModuleId: PHI_AVATAR_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/account-avatar-picker/plugin").then((module) => module.PHI_ACCOUNT_AVATAR_PICKER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/account-avatar-picker/plugin").then((module) => module.PHI_ACCOUNT_AVATAR_PICKER_WIDGET_PLUGIN),
  }),
] as const;
