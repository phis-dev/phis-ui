import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleWidgetDefinition } from "../contracts";
import {
  PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
} from "./widgets/brand-controls/config";
import { definePhiFirstPartyWidget } from "../contracts";

export const PHI_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  definePhiFirstPartyWidget({
    definition: PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_DEFINITION,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_DEFINITION,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_PLUGIN),
  }),
] as const;
