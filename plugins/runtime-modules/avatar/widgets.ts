import { PHI_AVATAR_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION } from "./widgets/account-avatar/config";
import { PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION } from "./widgets/account-avatar-picker/config";
import { definePhiFirstPartyWidget } from "../contracts";

export const PHI_AVATAR_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  definePhiFirstPartyWidget({
    definition: PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION,
    ownerModuleId: PHI_AVATAR_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/account-avatar/plugin").then((module) => module.PHI_ACCOUNT_AVATAR_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/account-avatar/plugin").then((module) => module.PHI_ACCOUNT_AVATAR_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION,
    ownerModuleId: PHI_AVATAR_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/account-avatar-picker/plugin").then((module) => module.PHI_ACCOUNT_AVATAR_PICKER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/account-avatar-picker/plugin").then((module) => module.PHI_ACCOUNT_AVATAR_PICKER_WIDGET_PLUGIN),
  }),
] as const;
