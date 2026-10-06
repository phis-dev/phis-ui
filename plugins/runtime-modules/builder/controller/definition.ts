import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiSignalRouteSet,
  type PhiSignalRouteSet,
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
import type { PhiAreaRootRoute, PhiAreaMeta, PhiPublicRoutePathAssignment } from "../../../../helpers/cms-area-config";
import type { PhiPublicRouteClaim } from "../../../../helpers/public-route-claims";
import type { PhiBuilderAreaKey } from "../../../../constants/cms-areas";
import type {
  PhiCmsPresetSource,
  PhiCmsResolvedNavigationSurface,
} from "../../../../types/cms-module-descriptors";
import { PHI_DRAG_SOURCE_CONTROL_SIGNALS } from "../../../../components/widgets/signals/control-signal-capabilities";
import { PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/builder-chrome";
import type { PhiCmsTreeControllerSettings } from "../../../../types/cms";

/**
 * Whom the Builder Controller answers into, from the trees that hold the receivers.
 *
 * The Inspector Overlay contribution routes its drawers, the Effects editor and the wiring dialog; the
 * Builder Shell its Area selector and debug switch; each Builder Page the dialogs it carries -- Area
 * settings, Page metadata, the Modules page's three. The composed Area tree joins the first two, and
 * the shown Page's routes join them while it is shown (`mergePhiRuntimeControllerConfigOverlay`).
 */
export type PhiBuilderRuntimeControllerConfig = {
  signalRoutes: PhiSignalRouteSet | null;
};

/** The three Effects Forms, each with its own values, submit and reset. */
export const PHI_BUILDER_EFFECTS_CAPABILITY_SECTIONS = ["appearance", "transitions", "viewport"] as const;
export type PhiBuilderEffectsCapabilitySection = (typeof PHI_BUILDER_EFFECTS_CAPABILITY_SECTIONS)[number];

export function resolvePhiBuilderEffectsCapabilityId(
  section: PhiBuilderEffectsCapabilitySection,
  kind: "Values" | "Submit" | "Reset",
) {
  return `effects${section.charAt(0).toUpperCase()}${section.slice(1)}${kind}`;
}

const PHI_BUILDER_EFFECTS_FORM_EMITS = PHI_BUILDER_EFFECTS_CAPABILITY_SECTIONS.flatMap((section) => [
  {
    id: resolvePhiBuilderEffectsCapabilityId(section, "Values"),
    action: "change" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
  },
  { id: resolvePhiBuilderEffectsCapabilityId(section, "Submit"), action: "activate" as const, valueType: "none" as const },
  { id: resolvePhiBuilderEffectsCapabilityId(section, "Reset"), action: "activate" as const, valueType: "none" as const },
]);

/** A dialog the Controller opens and closes, by the capability pair it sends. */
const dialogEmits = (name: string) => [
  { id: `${name}Open`, action: "activate" as const, valueType: "none" as const },
  { id: `${name}Close`, action: "close" as const, valueType: "none" as const },
];

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
  unresolvedModuleIdsByArea: Record<string, PhiRuntimeModuleId[]>;
  publicRouteClaims: readonly PhiPublicRouteClaim[];
  publicRoutePaths: readonly PhiPublicRoutePathAssignment[];
  areaRootRoutesByArea: Record<string, PhiAreaRootRoute | null>;
  areaMetaByArea: Record<string, PhiAreaMeta | null>;
  areaControllerSettingsByArea: Record<string, PhiCmsTreeControllerSettings>;
  modulePresetPagesByArea: PhiBuilderModulePresetPagesByArea;
  areaPresetSourcesByArea: Partial<Record<PhiBuilderAreaKey, PhiCmsPresetSource>>;
  navigationSurfacesByArea: Partial<
    Record<PhiBuilderAreaKey, readonly PhiCmsResolvedNavigationSurface[]>
  >;
  pageMetaLabels: PhiBuilderPageMetaPresentationLabels;
};

export function parsePhiBuilderRuntimeControllerConfig(raw: Record<string, unknown>): PhiBuilderRuntimeControllerConfig {
  return { signalRoutes: readPhiSignalRouteSet(raw.signalRoutes) };
}

export const PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_BUILDER_CONTROLLER_PLUGIN_KEY,
  key: PHI_BUILDER_CONTROLLER_KEY,
  title: "Builder Controller",
  description: "Headless controller for Builder workspace state, structure drafts, navigation, Inspector routing, and Builder chrome.",
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
      // The Inspector Overlay contribution's receivers.
      ...dialogEmits("regionInspector"),
      ...dialogEmits("layoutInspector"),
      ...dialogEmits("widgetInspector"),
      ...dialogEmits("effectsDialog"),
      ...PHI_BUILDER_EFFECTS_FORM_EMITS,
      ...dialogEmits("signalWiring"),
      { id: "signalWiringSubmit", action: "activate", valueType: "none" },
      { id: "signalWiringReset", action: "activate", valueType: "none" },
      { id: "signalWiringRoutesReload", action: "activate", valueType: "none" },
      // The Builder Shell's.
      { id: "areaSelectorEnabled", action: "change", valueType: "boolean" },
      { id: "debugSwitchEnabled", action: "change", valueType: "boolean" },
      // The Builder Pages'.
      ...dialogEmits("areaSettings"),
      {
        id: "areaSettingsValues",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      { id: "areaSettingsSubmit", action: "activate", valueType: "none" },
      { id: "areaSettingsReset", action: "activate", valueType: "none" },
      ...dialogEmits("pageMeta"),
      {
        id: "pageMetaFormValues",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      { id: "pageMetaSubmit", action: "activate", valueType: "none" },
      { id: "pageMetaReset", action: "activate", valueType: "none" },
      { id: "moduleDetailOpen", action: "activate", valueType: "none" },
      {
        id: "moduleDetailParams",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
      },
      ...dialogEmits("moduleUsage"),
      { id: "moduleUsageReload", action: "activate", valueType: "none" },
      ...dialogEmits("publicRoutes"),
      { id: "publicRoutesReload", action: "activate", valueType: "none" },
      { id: "modulesTableReload", action: "activate", valueType: "none" },
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
      // A Draft Status Widget asking, on mount, for the state; answered to it alone.
      {
        id: "draftStatus",
        channel: "draftStatus",
        action: "activate",
        valueType: "none",
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
      // The wiring Form's values while they are edited, so the cascading selects can be answered.
      {
        id: "signalWiringValues",
        channel: "signalWiringValues",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      // A row action of the Modules Table, on a channel of its own so no other Table's action is read as one.
      {
        id: "moduleTableAction",
        channel: "moduleTableAction",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
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
  defaultConfig: { signalRoutes: null },
  parseConfig: parsePhiBuilderRuntimeControllerConfig,
} satisfies PhiRuntimeControllerDefinition<PhiBuilderRuntimeControllerConfig, PhiBuilderRuntimeControllerPreload>;
