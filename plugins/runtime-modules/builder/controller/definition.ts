import {
  PHI_SIGNAL_VALUE_SCHEMAS,
} from "../../../../types/signals";
import type {
  PhiRuntimeControllerDefinition,
  PhiRuntimeModuleDefinition,
  PhiRuntimeModuleId,
} from "../../../../types/cms-plugins";
import { PHI_BUILDER_CONTROLLER_KEY,
  PHI_BUILDER_CONTROLLER_PLUGIN_KEY } from "./address";
import type { PhiDeveloperBuilderRegionDraft } from "../developer-workspace-types";
import type { PhiBuilderModulePresetPagesByArea } from "../../../../helpers/cms-page-catalog";
import type { PhiBuilderAreaKey } from "../../../../constants/cms-areas";
import type {
  PhiCmsPresetSource,
  PhiCmsResolvedNavigationSurface,
} from "../../../../types/cms-module-descriptors";
import { PHI_DRAG_SOURCE_CONTROL_SIGNALS } from "../../../../components/widgets/signals/control-signal-capabilities";
import { PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/builder-chrome";

export type PhiBuilderRuntimeControllerConfig = Record<string, never>;

export type PhiBuilderPageMetaPresentationLabels = {
  createTitle: string;
  updateTitle: string;
  createAction: string;
  updateAction: string;
};

export const PHI_BUILDER_PAGE_META_DEFAULT_PRESENTATION_LABELS: PhiBuilderPageMetaPresentationLabels = {
  createTitle: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.newPage,
  updateTitle: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.pageMeta,
  createAction: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.create,
  updateAction: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.toolbar.save,
};

export type PhiBuilderRuntimeControllerPreload = {
  shellPresetDraftsByArea: Record<string, Record<string, PhiDeveloperBuilderRegionDraft>>;
  runtimeModuleDefinitions: PhiRuntimeModuleDefinition[];
  runtimeModuleIdsByArea: Record<string, PhiRuntimeModuleId[]>;
  modulePresetPagesByArea: PhiBuilderModulePresetPagesByArea;
  areaPresetSourcesByArea: Partial<Record<PhiBuilderAreaKey, PhiCmsPresetSource>>;
  navigationSurfacesByArea: Partial<
    Record<PhiBuilderAreaKey, readonly PhiCmsResolvedNavigationSurface[]>
  >;
  pageMetaLabels: PhiBuilderPageMetaPresentationLabels;
};

export function parsePhiBuilderRuntimeControllerConfig(): PhiBuilderRuntimeControllerConfig {
  return {};
}

export const PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_BUILDER_CONTROLLER_PLUGIN_KEY,
  key: PHI_BUILDER_CONTROLLER_KEY,
  title: "Builder Controller",
  description: "Headless controller for Builder workspace state, structure drafts, navigation, Inspector routing, and Builder chrome.",
  category: "builder",
  iconFamily: "builder",
  flags: ["internal"],
  allowedMountScopes: ["area"],
  runtimeSignals: {
    emits: [
      { id: "areaSelection", action: "change", valueType: "string" },
      {
        id: "builderChrome",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderChrome,
      },
      {
        id: "draftStatus",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
      },
      {
        id: "navigation",
        action: "reload",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderNavigation,
      },
      {
        id: "selection",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderNodeSelection,
      },
      {
        id: "page",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderLayout,
      },
      {
        id: "builderMode",
        action: "change",
        valueType: "string",
      },
      {
        id: "inspectorVisibility",
        action: "change",
        valueType: "boolean",
      },
      {
        id: "effectsCommit",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      { id: "effectsCancel", action: "close", valueType: "none" },
      { id: "effectsSubmitting", action: "change", valueType: "boolean" },
      {
        id: "pagesVisibility",
        action: "change",
        valueType: "boolean",
      },
      {
        id: "siderLayout",
        action: "change",
        valueType: "boolean",
      },
      {
        id: "commandEnabled",
        action: "change",
        valueType: "boolean",
      },
      { id: "overlayTitle", action: "change", valueType: "string" },
      { id: "commandLabel", action: "change", valueType: "string" },
      { id: "pageMetaSubmitting", action: "change", valueType: "boolean" },
      ...PHI_DRAG_SOURCE_CONTROL_SIGNALS.emits,
      {
        id: "drop",
        action: "drop",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
      },
    ],
    listens: [
      {
        id: "builderChrome",
        channel: "builderChrome",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderChrome,
      },
      {
        id: "command",
        channel: "command",
        action: "activate",
        valueType: "string",
      },
      {
        id: "builderMode",
        channel: "builderMode",
        action: "change",
        valueType: "string",
      },
      {
        id: "area",
        channel: "area",
        action: "change",
        valueType: "string",
      },
      {
        id: "selection",
        channel: "selection",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderNodeSelection,
      },
      {
        id: "page",
        channel: "page",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderLayout,
      },
      {
        id: "path",
        channel: "path",
        action: "change",
        valueType: "path",
      },
      {
        id: "inspectorVisibility",
        channel: "inspectorVisibility",
        action: "change",
        valueType: "boolean",
      },
      {
        id: "pagesVisibility",
        channel: "pagesVisibility",
        action: "change",
        valueType: "boolean",
      },
      {
        id: "runtimeModules",
        channel: "runtimeModules",
        action: "change",
        valueType: "string[]",
      },
      {
        id: "siderLayout",
        channel: "layout",
        action: "change",
        valueType: "boolean",
      },
      {
        id: "fieldChange",
        channel: "inspector",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderInspector,
      },
      { id: "effectsCommand", channel: "effects", action: "activate", valueType: "string" },
      { id: "effectsOpen", channel: "effects", action: "change", valueType: "none" },
      { id: "effectsCancel", channel: "effects", action: "close", valueType: "none" },
      { id: "effectsVisibility", channel: "effectsVisibility", action: "change", valueType: "boolean" },
      ...(["appearance", "transitions", "viewport"] as const).map((section) => ({
        id: `effectsValues:${section}`,
        channel: `effectsForm:${section}`,
        action: "change" as const,
        valueType: "json" as const,
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      })),
      ...(["appearance", "transitions", "viewport"] as const).map((section) => ({
        id: `effectsValidation:${section}`,
        channel: `effectsFormValidation:${section}`,
        action: "change" as const,
        valueType: "json" as const,
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity,
      })),
      { id: "pageMetaCommand", channel: "pageMeta", action: "activate", valueType: "string" },
      { id: "pageMetaVisibility", channel: "pageMetaVisibility", action: "change", valueType: "boolean" },
      {
        id: "pageMetaValues",
        channel: "pageMetaForm",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
    ],
  },
  defaultConfig: {},
  parseConfig: parsePhiBuilderRuntimeControllerConfig,
} satisfies PhiRuntimeControllerDefinition<PhiBuilderRuntimeControllerConfig, PhiBuilderRuntimeControllerPreload>;
