import type { ComponentType, ReactNode } from "react";
import type { PhiSiteRequestContext } from "../server-helpers/runtime";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiCmsPluginCategory } from "../constants/cms-plugin-categories";
import type {
  PhiControlOption,
  PhiControlOptionsProviderConfig,
} from "../components/controls/phi-control-options";

import type { PhiRenderableBlockAnchor } from "./renderable-block";
import type { PhiSlotSizePolicy } from "./slot-size-policy";
import type { PhiLayoutKind } from "../components/layouts/phi-layout-contract";
import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutRenderNode,
  PhiResolvedCmsAreaPresetTree,
  PhiResolvedCmsRenderableTree,
  PhiResolvedCmsPageTree,
} from "./cms";
import type { PhiCmsRegionConfig } from "./cms-presets";
import type { PhiBlockRuntime } from "./widget-runtime";
import type { PhiSignalAddress, PhiSignalPluginMeta, PhiSignalRuntimeContext } from "./signals";
import type { PhiCmsInstanceId } from "./cms-instance-id";
import type {
  PhiCmsAreaDefinition,
  PhiCmsAreaOverlayPresetDescriptor,
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsRoutePresetDescriptor,
  PhiCmsThemePresetDescriptor,
  PhiRuntimeModuleId,
  PhiCmsNavigationInjectionDescriptor,
} from "./cms-module-descriptors";
import type {
  PhiRuntimeDataProviderAuthoringMode,
  PhiRuntimeDataProviderExecutionMode,
  PhiRuntimeDataProviderKey,
  PhiRuntimeDataProviderKind,
} from "./runtime-data-provider";
import type {
  PhiFormFieldTypeProviderDescriptor,
  PhiFormHandlerProviderDescriptor,
  PhiFormProviderKey,
  PhiFormValidationProviderDescriptor,
  PhiRuntimeModuleFormProviderDescriptors,
} from "./form-descriptor";
import type { PhiRuntimeModuleFormDefinition } from "../components/forms/form-registry";
import type {
  PhiCalendarAdapterClientDefinition,
  PhiCalendarAdapterDescriptor,
  PhiCalendarAdapterKey,
} from "./calendar";
export type { PhiRuntimeModuleFormDefinition } from "../components/forms/form-registry";
import type { PhiBuilderAreaKey } from "../constants/cms-areas";
import type { PhiBuilderNavigationTree } from "../helpers/cms-navigation-catalog";
import type { PhiBuilderActivePageCatalog } from "../helpers/cms-page-catalog";

type PhiBivariantCallback<TArgs extends unknown[], TResult> = {
  bivarianceHack(...args: TArgs): TResult;
}["bivarianceHack"];

export type PhiCmsConfigFieldVisibilityRule = {
  field: string;
  equals?: string | number | boolean | null;
  notEquals?: string | number | boolean | null;
};

type PhiCmsConfigFieldBase = {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
  editorPlacement?: "inspector" | "geometry" | "toolbar";
  visibleWhen?: PhiCmsConfigFieldVisibilityRule;
};

export type PhiCmsConfigFieldChoicePresentation =
  | "select"
  | "segmented"
  | "tabs"
  | "autocomplete"
  | "radio";

export type PhiCmsConfigFieldChoiceMode = "single" | "multiple";

export type PhiCmsConfigFieldChoiceValueType = "string" | "string[]";

export type PhiCmsConfigFieldChoiceCreateBehavior = "none" | "accept-custom" | "create-record";
export type PhiCmsConfigFieldColorMode = "single" | "gradient" | "both";
export type PhiCmsConfigFieldValueStorage = "field" | "self";

export type PhiCmsConfigFieldChoiceFilter = {
  widgetType?: string;
  group?: string;
  tags?: string[];
};

export type PhiCmsConfigField =
  | (PhiCmsConfigFieldBase & {
      type: "string" | "url" | "icon";
    })
  | (PhiCmsConfigFieldBase & {
      type: "readonly";
    })
  | (PhiCmsConfigFieldBase & {
      type: "data-provider";
      providerKind?: PhiRuntimeDataProviderKind;
    })
  | (PhiCmsConfigFieldBase & {
      type: "calendar-adapter";
    })
  | (PhiCmsConfigFieldBase & {
      type: "dimension";
      widthKey?: string;
      heightKey?: string;
      widthPlaceholder?: string;
      heightPlaceholder?: string;
      patchOnChange?: Record<string, unknown>;
    })
  | (PhiCmsConfigFieldBase & {
      type: "length";
      min?: number;
      max?: number;
      step?: number;
      precision?: number;
    })
  | (PhiCmsConfigFieldBase & {
      type: "radius";
      topLeftKey: string;
      topRightKey: string;
      bottomLeftKey: string;
      bottomRightKey: string;
    })
  | (PhiCmsConfigFieldBase & {
      type: "padding";
      paddingKey?: string;
      gapKey?: string;
      paddingTopKey?: string;
      paddingRightKey?: string;
      paddingBottomKey?: string;
      paddingLeftKey?: string;
      section?: string;
    })
  | (PhiCmsConfigFieldBase & {
      type: "color";
      mode?: PhiCmsConfigFieldColorMode;
      section?: string;
    })
  | (PhiCmsConfigFieldBase & {
      type: "boolean";
    })
  | (PhiCmsConfigFieldBase & {
      type: "number";
      min?: number;
      max?: number;
      step?: number;
      precision?: number;
    })
  | (PhiCmsConfigFieldBase & {
      type: "choice";
      mode?: PhiCmsConfigFieldChoiceMode;
      valueType?: PhiCmsConfigFieldChoiceValueType;
      presentation?: PhiCmsConfigFieldChoicePresentation;
      options?: PhiControlOption[];
      optionsProvider?: PhiControlOptionsProviderConfig;
      allowCustom?: boolean;
      createBehavior?: PhiCmsConfigFieldChoiceCreateBehavior;
      placeholder?: string;
      filter?: PhiCmsConfigFieldChoiceFilter;
      emptyOption?: PhiControlOption;
      emptyValue?: null | undefined;
      patchOnChange?: Record<string, unknown>;
    })
  | (PhiCmsConfigFieldBase & {
      type: "collection";
      itemKeyField: string;
      itemLabelField?: string;
      itemFields: PhiCmsConfigField[];
      defaultItem?: Record<string, unknown>;
      addLabel?: string;
      emptyLabel?: string;
      minItems?: number;
      maxItems?: number;
      reorderable?: boolean;
    })
  | (PhiCmsConfigFieldBase & {
      type: "background";
      section?: string;
      storage?: PhiCmsConfigFieldValueStorage;
    })
  | (PhiCmsConfigFieldBase & {
      type: "border";
      section?: string;
      storage?: PhiCmsConfigFieldValueStorage;
    })
  | (PhiCmsConfigFieldBase & {
      type: "shadow" | "slot-placement";
      section?: string;
    });

export type PhiCmsLayoutSlotDefinition = {
  key: string;
  label: string;
  slotIndex: number;
  sequential?: boolean;
  defaultAnchor?: PhiRenderableBlockAnchor;
};

export type PhiCmsPluginCommercialPlan = "free" | "pro" | "enterprise";

export type PhiCmsPluginCommercialMeta = {
  vendor?: string;
  website?: string;
  plan?: PhiCmsPluginCommercialPlan;
  licenseRequired?: boolean;
};

export type PhiCmsPluginLicenseState = {
  active: boolean;
  plan?: string;
  features?: string[];
  expiresAt?: string | null;
};

export type PhiCmsWidgetContentBinding = {
  storage: "text" | "html" | "markdown" | "asset";
  sourceField: string;
  translatable?: boolean;
  skipWhenConfigField?: string;
  skipWhenConfigFieldValue?: {
    field: string;
    value: string | number | boolean | null;
  };
};

export type PhiCmsWidgetPluginRenderArgs<TConfig> = {
  widget: PhiCmsContentWidgetNode;
  runtime: PhiBlockRuntime;
  tree: PhiResolvedCmsRenderableTree;
  regionConfig?: PhiCmsRegionConfig;
  config: TConfig;
  registry?: PhiCmsRuntimeRenderRegistry;
  license?: PhiCmsPluginLicenseState;
};

/**
 * What the Builder canvas knows while it renders a Widget for authoring.
 *
 * A Widget rendered in the canvas cannot read this from `runtime`: the canvas fills `runtime` with a
 * placeholder whose Area is always "public". It is handed down here instead, so that a Widget -- from
 * this package or from a third party -- never has to reach into the Builder to learn its context.
 */
export type PhiCmsWidgetAuthoringCanvas = {
  /** The Area being edited, which is not `runtime.area`. */
  area: PhiBuilderAreaKey;
  /** False until the Builder's catalogs are loaded; render nothing before that. */
  catalogHydrated: boolean;
  /**
   * The navigation the canvas should show for this key, or null if the edited Area declares none.
   *
   * Whether that is an unsaved draft or the Area's declaration is the Builder's business, not the
   * Widget's.
   */
  resolveNavigation: (navKey: string) => PhiBuilderNavigationTree | null;
  /** The page catalog of the edited Area, with local and persisted pages already merged in. */
  pageCatalog: PhiBuilderActivePageCatalog;
};

export type PhiCmsWidgetAuthoringContext<TConfig> = {
  /** Set only where the Widget may actually be edited; absent in a read-only canvas. */
  updateConfig?: (patch: Partial<TConfig>) => void;
  canvas: PhiCmsWidgetAuthoringCanvas;
};

export type PhiCmsBuilderWidgetRenderArgs<TConfig> = PhiCmsWidgetPluginRenderArgs<TConfig> & {
  authoring: PhiCmsWidgetAuthoringContext<TConfig> | null;
};

export type PhiCmsWidgetSignalSubcontrolCollection = {
  configKey: string;
  keyField: string;
  labelFields?: readonly string[];
};

export type PhiRuntimeControllerRequirement = {
  type: `${string}/${string}`;
  instanceKey: string;
  enabled?: boolean;
  config?: Record<string, unknown> | null;
};

export type PhiCmsWidgetRuntimeControllerRequirementArgs<TConfig> = {
  widget: PhiCmsContentWidgetNode;
  tree: PhiResolvedCmsRenderableTree;
  config: TConfig;
};

export type PhiCmsWidgetRuntimeControllerRequirementResolver<TConfig> =
  PhiBivariantCallback<
    [PhiCmsWidgetRuntimeControllerRequirementArgs<TConfig>],
    readonly PhiRuntimeControllerRequirement[]
  >;

export type PhiCmsLayoutPluginRenderArgs<TConfig> = {
  node: PhiCmsLayoutRenderNode;
  layoutKind: PhiLayoutKind;
  runtime: PhiBlockRuntime;
  tree: PhiResolvedCmsRenderableTree;
  regionConfig?: PhiCmsRegionConfig;
  config: TConfig;
  license?: PhiCmsPluginLicenseState;
  renderChildren: (node: PhiCmsLayoutRenderNode) => ReactNode[];
  renderSequentialSlotChildren: (node: PhiCmsLayoutRenderNode) => ReactNode[];
  renderResolvedSequentialSlotChildren?: (node: PhiCmsLayoutRenderNode) => Promise<ReactNode[]>;
};

export type PhiCmsWidgetPlugin<TConfig> = {
  kind: "widget";
  pluginKey: string;
  typeKey: string;
  title: string;
  description?: string;
  category: PhiCmsPluginCategory;
  tags?: string[];
  icon?: string;
  iconName?: string;
  iconFamily?: string;
  commercial?: PhiCmsPluginCommercialMeta;
  runtimeSignals?: PhiSignalPluginMeta | null;
  signalSubcontrols?: readonly PhiCmsWidgetSignalSubcontrolCollection[];
  requiredRuntimeControllers?: PhiCmsWidgetRuntimeControllerRequirementResolver<TConfig>;
  requiredDataProviders?: readonly PhiRuntimeDataProviderKey[];
  contentBinding?: PhiCmsWidgetContentBinding | null;
  slotSizePolicy?: PhiSlotSizePolicy;
  defaultConfig?: Partial<TConfig>;
  fields: PhiCmsConfigField[];
  parseConfig: (raw: Record<string, unknown>) => TConfig;
  render: PhiBivariantCallback<[PhiCmsWidgetPluginRenderArgs<TConfig>], ReactNode>;
  renderPreview: PhiBivariantCallback<[PhiCmsWidgetPluginRenderArgs<TConfig>], ReactNode>;
};

export type PhiCmsWidgetPluginDefinition<TConfig> = Pick<
  PhiCmsWidgetPlugin<TConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "iconName"
  | "iconFamily"
  | "commercial"
  | "runtimeSignals"
  | "signalSubcontrols"
  | "requiredRuntimeControllers"
  | "requiredDataProviders"
  | "contentBinding"
  | "slotSizePolicy"
  | "defaultConfig"
  | "fields"
  | "parseConfig"
>;

export type PhiCmsBuilderWidgetEditorInteraction = "inert" | "authoring";

export type PhiCmsBuilderWidgetPlugin<TConfig> = Pick<
  PhiCmsWidgetPlugin<TConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "iconName"
  | "iconFamily"
  | "commercial"
  | "runtimeSignals"
  | "signalSubcontrols"
  | "requiredRuntimeControllers"
  | "requiredDataProviders"
  | "slotSizePolicy"
  | "defaultConfig"
  | "fields"
  | "parseConfig"
> & {
  editorInteraction?: PhiCmsBuilderWidgetEditorInteraction;
  renderEditor: PhiBivariantCallback<[PhiCmsBuilderWidgetRenderArgs<TConfig>], ReactNode>;
  renderEditorTools?: PhiBivariantCallback<[PhiCmsBuilderWidgetRenderArgs<TConfig>], ReactNode>;
};

export type PhiCmsServerWidgetPlugin<TConfig> = Pick<
  PhiCmsWidgetPlugin<TConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "iconName"
  | "iconFamily"
  | "commercial"
  | "runtimeSignals"
  | "signalSubcontrols"
  | "requiredRuntimeControllers"
  | "slotSizePolicy"
  | "defaultConfig"
  | "fields"
  | "parseConfig"
  | "render"
  | "renderPreview"
>;

export type PhiCmsRuntimeWidgetPlugin<TConfig> = PhiCmsWidgetPluginDefinition<TConfig> & Pick<
  PhiCmsWidgetPlugin<TConfig>,
  "render"
>;

export type PhiCmsPreviewWidgetPlugin<TConfig> = PhiCmsWidgetPluginDefinition<TConfig> & Pick<
  PhiCmsWidgetPlugin<TConfig>,
  "renderPreview"
>;

export type PhiCmsRuntimeRenderRegistry = {
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  serverCapabilities: import("./server-capabilities").PhiServerCapabilitySnapshot | null;
  runtimeWidgetPluginsByType: ReadonlyMap<string, PhiCmsRuntimeWidgetPlugin<unknown>>;
  previewWidgetPluginsByType: ReadonlyMap<string, PhiCmsPreviewWidgetPlugin<unknown>>;
  layoutPluginsByType: ReadonlyMap<string, PhiCmsLayoutPlugin<unknown>>;
  widgetRenderPoliciesByType: ReadonlyMap<string, PhiRuntimeModuleRenderPolicies>;
  layoutRenderPoliciesByType: ReadonlyMap<string, PhiRuntimeModuleRenderPolicies>;
  widgetAccessPoliciesByType: ReadonlyMap<string, import("./access").PhiViewerAccessPolicy>;
  layoutAccessPoliciesByType: ReadonlyMap<string, import("./access").PhiViewerAccessPolicy>;
  roleProviderIdByWidgetType: ReadonlyMap<string, import("./access").PhiRoleProviderId>;
  roleProviderIdByLayoutType: ReadonlyMap<string, import("./access").PhiRoleProviderId>;
  renderIssuesByWidgetType: ReadonlyMap<string, PhiCmsRenderIssue>;
  runtimeWidgetRenderIssuesByType: ReadonlyMap<string, PhiCmsRenderIssue>;
  previewWidgetRenderIssuesByType: ReadonlyMap<string, PhiCmsRenderIssue>;
  renderIssuesByLayoutType: ReadonlyMap<string, PhiCmsRenderIssue>;
  ownerModuleIdByWidgetType: ReadonlyMap<string, PhiRuntimeModuleId>;
  widgetSlotSizePoliciesByType: ReadonlyMap<string, PhiSlotSizePolicy | undefined>;
  ownerModuleIdByLayoutType: ReadonlyMap<string, PhiRuntimeModuleId>;
  uiProvidersByModuleId: ReadonlyMap<PhiRuntimeModuleId, PhiRuntimeModuleUiProvider>;
  dataProviderDescriptorsByKey: ReadonlyMap<
    PhiRuntimeDataProviderKey,
    PhiRuntimeModuleDataProviderDescriptor
  >;
  formDefinitionsById: ReadonlyMap<string, PhiRuntimeModuleFormDefinition>;
};

export type PhiCmsRenderIssueCode =
  | "missing-module"
  | "missing-renderer"
  | "renderer-load-failed"
  | "render-failed"
  | "invalid-render-output";

export type PhiCmsRenderIssue = {
  code: PhiCmsRenderIssueCode;
  kind: "widget" | "layout";
  type: string;
  blockId?: PhiCmsInstanceId | null;
  moduleId?: PhiRuntimeModuleId | null;
  detail?: string | null;
};

export type PhiCmsLayoutPlugin<TConfig> = {
  kind: "layout";
  pluginKey: string;
  typeKey: string;
  layoutKind: PhiLayoutKind;
  title: string;
  description?: string;
  category: PhiCmsPluginCategory;
  tags?: string[];
  icon?: string;
  iconName?: string;
  iconFamily?: string;
  commercial?: PhiCmsPluginCommercialMeta;
  runtimeSignals?: PhiSignalPluginMeta | null;
  slotSizePolicy?: PhiSlotSizePolicy;
  defaultConfig?: Partial<TConfig>;
  defaultAnchor?: PhiRenderableBlockAnchor | null;
  fields: PhiCmsConfigField[];
  slots: PhiCmsLayoutSlotDefinition[];
  parseConfig: (raw: Record<string, unknown>) => TConfig;
  serializeConfig?: (value: Record<string, unknown>) => Record<string, unknown>;
  render: PhiBivariantCallback<[PhiCmsLayoutPluginRenderArgs<TConfig>], ReactNode>;
  renderEditor: PhiBivariantCallback<[PhiCmsLayoutPluginRenderArgs<TConfig>], ReactNode>;
};

export type PhiCmsLayoutPluginDefinition<TConfig> = Pick<
  PhiCmsLayoutPlugin<TConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "layoutKind"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "iconName"
  | "iconFamily"
  | "commercial"
  | "runtimeSignals"
  | "slotSizePolicy"
  | "defaultConfig"
  | "defaultAnchor"
  | "fields"
  | "slots"
>;

export type PhiCmsResolvedRequestLoaderArgs = {
  siteKey: string;
  locale: string;
  path: string;
  cookieHeader: string;
  searchParams?: Record<string, string | undefined>;
  requestContext?: PhiSiteRequestContext;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
};

export type PhiCmsSiteRuntime = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export type PhiResolvedCmsRequest = {
  areaPreset: PhiResolvedCmsAreaPresetTree | null;
  page: PhiResolvedCmsPageTree;
  runtime: PhiBlockRuntime;
  serverCapabilities: import("./server-capabilities").PhiServerCapabilitySnapshot | null;
};

export type PhiRuntimeControllerMountScope = "site" | "area" | "page";

export type PhiRuntimeControllerFlag =
  | "internal"
  | "multiInstance";

export type PhiRuntimeControllerSetting = {
  // Namespaced controller type in the form `<npm-package>/<controller-key>`.
  // Short keys such as `builder` or `asset` are invalid persisted v1 settings.
  type: `${string}/${string}`;
  instanceKey: string;
  mountScope: PhiRuntimeControllerMountScope;
  enabled?: boolean;
  config?: Record<string, unknown> | null;
};

export type PhiRuntimeControllerServerPreloadArgs<TConfig> = {
  key: string;
  instanceKey: string;
  address: PhiSignalAddress;
  mountScope: PhiRuntimeControllerMountScope;
  runtime: PhiBlockRuntime;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  setting: PhiRuntimeControllerSetting;
  config: TConfig;
};

export type PhiRuntimeControllerRenderArgs<TConfig, TPreload = unknown> = {
  key: string;
  instanceKey: string;
  address: PhiSignalAddress;
  mountScope: PhiRuntimeControllerMountScope;
  runtime: PhiBlockRuntime;
  config: TConfig;
  preloadData: TPreload | null;
};

export type PhiRuntimeControllerPreloadMap = Partial<Record<PhiSignalAddress, unknown>>;

export type PhiRuntimeControllerDefinition<TConfig, TPreload = unknown> = {
  kind: "controller";
  pluginKey: string;
  key: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  iconName?: string;
  iconFamily?: string;
  commercial?: PhiCmsPluginCommercialMeta;
  flags?: readonly PhiRuntimeControllerFlag[];
  allowedMountScopes: readonly PhiRuntimeControllerMountScope[];
  runtimeSignals: PhiSignalPluginMeta;
  settingsFields?: readonly PhiCmsConfigField[];
  defaultConfig?: Partial<TConfig>;
  parseConfig: (raw: Record<string, unknown>) => TConfig;
  serverPreload?: PhiBivariantCallback<
    [PhiRuntimeControllerServerPreloadArgs<TConfig>],
    TPreload | Promise<TPreload>
  >;
};

export type PhiRuntimeControllerPlugin<TConfig, TPreload = unknown> = PhiRuntimeControllerDefinition<TConfig, TPreload> & {
  renderController: PhiBivariantCallback<[PhiRuntimeControllerRenderArgs<TConfig, TPreload>], ReactNode>;
};

export type PhiRuntimeModuleControllerClientProps = {
  setting: PhiRuntimeControllerSetting;
  runtime: PhiBlockRuntime;
  context?: PhiSignalRuntimeContext | null;
  preloadDataByAddress?: PhiRuntimeControllerPreloadMap | null;
};

export type PhiRuntimeModuleAuthoringClientProps = {
  children: ReactNode;
};

export type PhiRuntimeRenderPolicy = "custom";
export type PhiPreviewRenderPolicy =
  | "custom"
  | "runtimeReadOnly"
  | "visualSkeleton"
  | "visualPlaceholder";
export type PhiAuthoringRenderPolicy = "custom" | "usePreview";

export type PhiRuntimeModuleRenderPolicies = {
  runtime: PhiRuntimeRenderPolicy;
  preview: PhiPreviewRenderPolicy;
  authoring: PhiAuthoringRenderPolicy;
};

export type PhiRuntimeModuleClientWidgetDefinition = {
  type: string;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  signalSubcontrols?: readonly PhiCmsWidgetSignalSubcontrolCollection[];
  slotSizePolicy?: PhiSlotSizePolicy;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
};

export type { PhiRuntimeModuleId } from "./cms-module-descriptors";
export type PhiRuntimeModuleControllerMountPolicy = "site" | "area" | "demand";

export type PhiRuntimeModuleControllerDescriptor = Pick<
  PhiRuntimeControllerDefinition<unknown, unknown>,
  | "pluginKey"
  | "key"
  | "title"
  | "description"
  | "icon"
  | "iconFamily"
  | "flags"
  | "allowedMountScopes"
  | "runtimeSignals"
>;

type PhiRuntimeModuleIconMetadata =
  | { icon: string; iconFamily?: string }
  | { icon?: never; iconFamily: string };

export type PhiRuntimeModuleDefinition = {
  moduleId: PhiRuntimeModuleId;
  kind: "platform" | "module";
  eligibleAreas: readonly PhiCmsAreaKey[];
  serverBinding: import("./server-capabilities").PhiRuntimeModuleServerBinding;
  accessPolicy?: import("./access").PhiViewerAccessPolicy;
  controllerType?: `${string}/${string}`;
  controller?: PhiRuntimeModuleControllerDescriptor;
  sourceLocale?: string;
  title: string;
  description: string;
  category: string;
  controllerMountPolicy?: PhiRuntimeModuleControllerMountPolicy;
  dataProviders?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  /**
   * The Media Spaces this Module needs, and what it needs to put in them.
   *
   * A declaration is a need, never a switch: the Site's availability is the union of the declarations
   * across its active Modules, and a Module never writes availability itself. Two Modules declaring the
   * same kind do not collide, and removing one leaves the kind available while another still declares it.
   *
   * `kinds` states the content a Space is expected to hold, because only a Module knows what it is for.
   * It is a union with every other Module declaring that Space kind, so it is a ceiling on what may be
   * uploaded and never a statement about a particular file -- an avatar being an image is decided when
   * the Asset is bound, not when it arrives. The Site Space is deliberately absent from this map: its
   * authority is `PHI_ACCESS_SITE_MEDIA`, a role rather than a list, and what a Site publishes includes
   * binaries offered for download.
   */
  mediaSpaces?: {
    readonly [Kind in import("./media").PhiDeclarableMediaSpaceKind]?: {
      readonly kinds: readonly import("./media").PhiMediaKindValue[];
    };
  };
  calendarAdapters?: readonly PhiCalendarAdapterDescriptor[];
  formProviders?: PhiRuntimeModuleFormProviderDescriptors;
  authUiProvider?: {
    providerKey: `${string}/${string}`;
    controllerType: `${string}/${string}`;
    capabilitiesByArea: Partial<Record<PhiCmsAreaKey, readonly (
      | "primary-login"
      | "factor-challenge"
      | "factor-enrollment"
      | "recovery"
      | "account-security"
      | "site-settings"
    )[]>>;
    accountSecurityPath?: `/${string}`;
  };
} & PhiRuntimeModuleIconMetadata;

export type PhiRuntimeModuleUiProvider = ComponentType<{ children: ReactNode }>;

export type PhiRuntimeModuleWidgetDefinition = {
  ownerModuleId: PhiRuntimeModuleId;
  accessPolicy?: import("./access").PhiViewerAccessPolicy;
  definition: PhiCmsWidgetPluginDefinition<unknown>;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<unknown>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<unknown>>;
};

export type PhiRuntimeModuleLayoutDefinition = {
  ownerModuleId: PhiRuntimeModuleId;
  accessPolicy?: import("./access").PhiViewerAccessPolicy;
  definition: PhiCmsLayoutPluginDefinition<unknown>;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsLayoutPlugin<unknown>>;
};

type PhiRuntimeModuleDataProviderDescriptorBase = {
  key: PhiRuntimeDataProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  executionMode: PhiRuntimeDataProviderExecutionMode;
  authoringMode: PhiRuntimeDataProviderAuthoringMode;
  title: string;
  description?: string;
  settingsFields?: readonly PhiCmsConfigField[];
  /**
   * Whether the Builder's own chrome may read this provider — the Asset picker in a Widget toolbar,
   * the Background picker in the Inspector.
   *
   * It is declared here, by the Module that owns the provider, rather than listed in the Builder:
   * a list inside the Builder can only ever name first-party providers, because an installed package
   * cannot write itself into it. Availability is independent of the edited Area activating the owning
   * Module — the Builder's pickers are its own surfaces, not the Area's.
   */
  availableToAuthoringChrome?: boolean;
};

export type PhiRuntimeModuleDataProviderDescriptor = PhiRuntimeModuleDataProviderDescriptorBase & (
  | {
      kind: "table";
      resources: readonly import("./table-widget").PhiTableProviderResourceDescriptor[];
    }
  | {
      kind: "tree";
      resources: readonly import("./tree-widget").PhiTreeProviderResourceDescriptor[];
    }
  | {
      kind: "collection";
      resources: readonly import("./collection-provider").PhiCollectionProviderResourceDescriptor[];
    }
  | {
      kind: Exclude<PhiRuntimeDataProviderKind, "table" | "tree" | "collection">;
      resources?: never;
    }
);

export type PhiRuntimeModuleDataProviderClientProps = {
  children: ReactNode;
};

export type PhiRuntimeModuleDataProviderClientDefinition = {
  key: PhiRuntimeDataProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  loadLive: () => Promise<ComponentType<PhiRuntimeModuleDataProviderClientProps>>;
  loadAuthoring?: () => Promise<ComponentType<PhiRuntimeModuleDataProviderClientProps>>;
};

export type PhiRuntimeModuleCalendarAdapterClientDefinition = PhiCalendarAdapterClientDefinition;

export type PhiRuntimeModule = PhiRuntimeModuleDefinition & {
  controllerDefinition?: PhiRuntimeControllerDefinition<unknown, unknown>;
};

export type PhiRuntimeModuleLoader = () => Promise<PhiRuntimeModule>;
export type PhiRuntimeModuleCatalogEntry = {
  definition: PhiRuntimeModuleDefinition;
  widgets: readonly PhiRuntimeModuleWidgetDefinition[];
  layouts: readonly PhiRuntimeModuleLayoutDefinition[];
  forms?: readonly PhiRuntimeModuleFormDefinition[];
  areaShells?: readonly PhiCmsAreaShellPresetDescriptor[];
  areaOverlays?: readonly PhiCmsAreaOverlayPresetDescriptor[];
  routes?: readonly PhiCmsRoutePresetDescriptor[];
  /**
   * Navigation entries the Module contributes without owning a Page.
   *
   * Injections used to hang off a route descriptor, which quietly meant a Module could only place a
   * navigation entry if it also owned a Page. An entry that opens an Overlay owns no Page by
   * definition, so the contribution belongs to the Module. The Area comes from the `navKey` prefix.
   */
  navigation?: readonly PhiCmsNavigationInjectionDescriptor[];
  themes?: readonly PhiCmsThemePresetDescriptor[];
  loadUiProvider?: () => Promise<PhiRuntimeModuleUiProvider>;
  load: PhiRuntimeModuleLoader;
};
export type PhiRuntimeModuleCatalog = ReadonlyMap<
  PhiRuntimeModuleId,
  PhiRuntimeModuleCatalogEntry
> & {
  readonly areaDefinitions: readonly PhiCmsAreaDefinition[];
  readonly platformModuleId: PhiRuntimeModuleId | null;
};

export type PhiResolvedRuntimeModuleSet = {
  moduleDefinitionsById: ReadonlyMap<PhiRuntimeModuleId, PhiRuntimeModuleDefinition>;
  widgetDefinitionsByType: ReadonlyMap<string, PhiRuntimeModuleWidgetDefinition>;
  layoutDefinitionsByType: ReadonlyMap<string, PhiRuntimeModuleLayoutDefinition>;
  dataProviderDescriptorsByKey: ReadonlyMap<PhiRuntimeDataProviderKey, PhiRuntimeModuleDataProviderDescriptor>;
  calendarAdapterDescriptorsByKey: ReadonlyMap<PhiCalendarAdapterKey, PhiCalendarAdapterDescriptor>;
  formFieldTypeProviderDescriptorsByKey: ReadonlyMap<PhiFormProviderKey, PhiFormFieldTypeProviderDescriptor>;
  formValidationProviderDescriptorsByKey: ReadonlyMap<PhiFormProviderKey, PhiFormValidationProviderDescriptor>;
  formHandlerProviderDescriptorsByKey: ReadonlyMap<PhiFormProviderKey, PhiFormHandlerProviderDescriptor>;
  formDefinitionsById: ReadonlyMap<string, PhiRuntimeModuleFormDefinition>;
  controllerDescriptorsByType: ReadonlyMap<string, PhiRuntimeModuleControllerDescriptor>;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  unavailableModuleBindings: ReadonlyMap<
    PhiRuntimeModuleId,
    import("./server-capabilities").PhiRuntimeModuleServerBindingResolution
  >;
  platformModuleId: PhiRuntimeModuleId;
  installedOwnerModuleIdByWidgetType: ReadonlyMap<string, PhiRuntimeModuleId>;
  installedOwnerModuleIdByLayoutType: ReadonlyMap<string, PhiRuntimeModuleId>;
  ownerModuleIdByControllerType: ReadonlyMap<string, PhiRuntimeModuleId>;
  areaControllerSettings: readonly PhiRuntimeControllerSetting[];
};

export type PhiResolvedRuntimeRenderRegistry = PhiCmsRuntimeRenderRegistry;

export type PhiCmsSiteBridge = {
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  runtime?: PhiCmsSiteRuntime;
  loadResolvedRequest?: (
    args: PhiCmsResolvedRequestLoaderArgs,
  ) => Promise<PhiResolvedCmsRequest | null>;
};
