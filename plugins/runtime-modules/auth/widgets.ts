import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";
import { PHI_AUTH_LOGOUT_WIDGET_DEFINITION } from "./widgets/logout/config";
import { PHI_AUTH_SECURITY_WIDGET_DEFINITION } from "./widgets/security/config";
import { PHI_AUTH_WORKFLOW_WIDGET_DEFINITION } from "./widgets/auth-workflow/config";
import { PHI_AUTH_METHODS_WIDGET_DEFINITION } from "./widgets/auth-methods/config";
import { definePhiFirstPartyWidget } from "../contracts";

export const PHI_AUTH_RUNTIME_MODULE_WIDGETS = [
  definePhiFirstPartyWidget({
    definition: PHI_AUTH_LOGOUT_WIDGET_DEFINITION,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/logout/plugin")
      .then((module) => module.PHI_AUTH_LOGOUT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/logout/plugin")
      .then((module) => module.PHI_AUTH_LOGOUT_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_AUTH_SECURITY_WIDGET_DEFINITION,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/security/plugin")
      .then((module) => module.PHI_AUTH_SECURITY_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/security/plugin")
      .then((module) => module.PHI_AUTH_SECURITY_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/auth-workflow/plugin")
      .then((module) => module.PHI_AUTH_WORKFLOW_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/auth-workflow/plugin")
      .then((module) => module.PHI_AUTH_WORKFLOW_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_AUTH_METHODS_WIDGET_DEFINITION,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/auth-methods/plugin")
      .then((module) => module.PHI_AUTH_METHODS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/auth-methods/plugin")
      .then((module) => module.PHI_AUTH_METHODS_WIDGET_PLUGIN),
  }),
] as const;
