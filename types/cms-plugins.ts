import type { ComponentType, ReactNode } from "react";
import type { PhiSiteRequestContext } from "./site-request-context";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiCmsPluginCategory } from "../constants/cms-plugin-categories";
import type { PhiRuntimeModuleCategory } from "../constants/runtime-module-categories";
import type {
  PhiControlOption,
  PhiControlOptionsProviderConfig,
} from "../components/controls/phi-control-options";

import type { PhiRenderableBlockAnchor, PhiRenderableBlockBase } from "./renderable-block";
import type { PhiCmsRegionOwnership } from "../helpers/cms-region-keys";
import type { PhiSlotSizePolicy } from "./slot-size-policy";
import type { PhiSurfacePolicy } from "./surface";
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
  PhiCmsThemeBlockDescriptor,
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
import type { PhiThemeBlockCatalog } from "../theme/phi-theme-composition";
import type { PhiThemeTokenKey } from "../theme/phi-theme-tokens";

type PhiBivariantCallback<TArgs extends unknown[], TResult> = {
  bivarianceHack(...args: TArgs): TResult;
}["bivarianceHack"];

export type PhiCmsConfigFieldVisibilityRule = {
  field: string;
  equals?: string | number | boolean | null;
  notEquals?: string | number | boolean | null;
};

/**
 * What each option of a choice stands for in the Widget's other fields.
 *
 * A choice that is a whole answer rather than one setting among others -- the Button's Action, which is
 * a label, a tooltip, an icon, a variant and a colour at once. While an option is chosen the fields in
 * `locks` are its to answer: the Inspector shows the option's values in them and lets nobody change
 * them, and nothing of theirs is stored, because the option is read again wherever it is drawn. Choosing
 * none hands them back, filled with what the option showed, so the author edits from there instead of
 * from blank.
 *
 * `prefills` are written once when an option is chosen and stay the author's: a starting point, not a
 * lock -- the Button's signal value, which says what it triggers rather than how it looks.
 *
 * Data, not a callback, because a Widget's fields travel from the server to the Inspector.
 */
export type PhiCmsConfigFieldOptionPresets = {
  locks: readonly string[];
  prefills?: readonly string[];
  values: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
};

type PhiCmsConfigFieldBase = {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
  editorPlacement?: "inspector" | "geometry" | "toolbar";
  /** When the field is shown; a list holds when every rule in it does. */
  visibleWhen?: PhiCmsConfigFieldVisibilityRule | readonly PhiCmsConfigFieldVisibilityRule[];
  /**
   * A divider with this title drawn above the field: where a group of the fields that follow begins,
   * as the Command Toolbar's "Toolbar" stands over what holds for every button.
   */
  heading?: string;
};

export type PhiCmsConfigFieldChoicePresentation =
  | "select"
  | "segmented"
  | "tabs"
  | "autocomplete"
  | "radio";

/**
 * Where a collection is edited.
 *
 * `inline` stacks the entries down the Inspector column, which is right for as long as an entry is two
 * or three short fields.
 *
 * `overlay` leaves only what is in the collection at the field's place and opens an Overlay to edit it.
 * That is not a matter of taste: the Inspector column is narrow, and an entry carrying half a dozen
 * fields -- a table column with a key, a provider field, a title, a renderer, a width, an alignment --
 * becomes a column of truncated Controls in it. Which of the two a collection needs is known by the
 * collection and by nothing else, which is why it is declared here rather than decided by the Inspector
 * from the Widget type.
 *
 * `select` shows one entry at a time: a select names the entry, and its fields stand under it. It adds
 * and removes nothing -- it is for a collection whose length is decided elsewhere, as a Command
 * Toolbar's buttons are counted on its scaffold -- and it keeps a column of identical cards from
 * growing with every entry when each one has the same handful of settings.
 */
export type PhiCmsConfigFieldCollectionPresentation = "inline" | "overlay" | "select";

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
      /**
       * What a cleared box is written as. Left out, clearing removes the key and the Widget's own
       * fallback answers again; `""` keeps the emptiness, for a text the author may want gone -- a
       * Button that is only its icon.
       */
      emptyValue?: "";
    })
  | (PhiCmsConfigFieldBase & {
      /**
       * One link, chosen rather than typed.
       *
       * Its own type rather than a `url`, because the two answers it accepts are not the same kind of
       * thing: an internal Page is picked from the Area's Page tree and stored as identity, an external
       * address is a literal URL. A text box can only take the second, which is why every Widget that
       * offered a `url` field offered no way at all to reach a Page -- and the paths authors typed
       * instead went stale the moment the Page moved.
       *
       * What is stored is a `PhiLinkTarget`, under a key the reference collector recognises. See
       * `isPhiLinkTargetConfigKey` in `types/references.ts` for the naming rule and `REFERENCES.md` for
       * why the name is what the server has to go on.
       */
      type: "link-target";
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
      /**
       * Which place a video comes from, chosen from the providers the edited Area actually activates.
       *
       * Its own type rather than a `choice` with an options provider, because the list is a Module
       * contribution that is already resolved and already travels -- see `videoProviders` -- and because
       * what gets stored is a provider key the render path looks up in the same registry.
       */
      type: "video-provider";
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
      /**
       * The Theme token the thing coloured falls back to, shown while the field is empty -- a Badge is
       * `colorError` until somebody picks otherwise, and an empty field showing the picker's own blue
       * would say the Badge is blue.
       */
      defaultToken?: PhiThemeTokenKey;
      section?: string;
    })
  | (PhiCmsConfigFieldBase & {
      type: "boolean";
    })
  | (PhiCmsConfigFieldBase & {
      /**
       * A picture: an Asset from the media library in a chosen rendition, or an address, with its alt
       * text. Writes the image source keys (`sourceKind`, `assetId`, `variantKey`, `variantVersion`,
       * `sourceUrl`) and `alt`, not a key of its own; `key` only names the field.
       */
      type: "image";
    })
  | (PhiCmsConfigFieldBase & {
      /** A list of whole numbers, such as the page sizes a table offers; each at least `min`. */
      type: "number-list";
      min?: number;
    })
  | (PhiCmsConfigFieldBase & {
      type: "number";
      min?: number;
      max?: number;
      step?: number;
      precision?: number;
      /**
       * The unit, standing in front of the number rather than in the label.
       *
       * A label that ends in "(ms)" reads as part of the field's name and is gone the moment the
       * field is narrow; the unit belongs to the value, so it stands where the value is.
       */
      prefix?: string;
      /**
       * A slider instead of a box, for a value that is felt rather than typed -- an opacity. It needs
       * `min` and `max`; `suffix` stands after the value in the slider's tooltip.
       */
      presentation?: "slider";
      suffix?: string;
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
      optionPresets?: PhiCmsConfigFieldOptionPresets;
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
      presentation?: PhiCmsConfigFieldCollectionPresentation;
      /** What the button that opens the Overlay says. */
      editLabel?: string;
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
      type: "shadow" | "grid-placement" | "column-count";
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
  /**
   * What the active Modules published about this Site, resolved once for this render.
   *
   * Present only where the page asked for it, which is what keeps a Site whose pages ask nothing from
   * paying for the reads. A Widget that needs a fact unconditionally should read it itself.
   */
  features?: import("./runtime-condition").PhiRuntimeFeatureState | null;
  /**
   * Where this render's Page targets lead, resolved once before anything drew.
   *
   * Handed down rather than fetched, because the batching is the contract: a Widget that could resolve
   * its own target would resolve one target per Widget. Absent means the page carries no internal link
   * at all; a reference missing from it did not resolve, and `resolvePhiLinkHref` answers `null` for it.
   */
  links?: import("./references").PhiResolvedLinkTargets | null;
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
  /**
   * The same, for an Area that is not the one being edited.
   *
   * A Navigation link may point into another Area, and its Page lives only in that Area's catalog. A
   * Widget that resolves link targets asks through this rather than assuming the edited Area, which is
   * the assumption that made such a link read as unresolvable.
   */
  pageCatalogForArea: (area: PhiBuilderAreaKey) => PhiBuilderActivePageCatalog;
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
  /**
   * What a label field's stored value reads as, where it is a key rather than words -- a toolbar
   * button's `action` is `livePreview`, and the Signals panel should say "Live preview".
   */
  labelFieldValues?: Readonly<Record<string, Readonly<Record<string, string>>>>;
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
  /**
   * The Widget translates the text written into its own config.
   *
   * Turning that off is the node's `NoTranslate` flag, not a config field: the answer is the same for
   * every Widget that writes text, so it lives where every node keeps its yes-or-no answers. A Widget
   * that says so here gets the Inspector's switch for it.
   */
  translatesOwnText?: true;
  slotSizePolicy: PhiSlotSizePolicy;
  /**
   * Who draws the node's Surface (`config.surface`).
   *
   * `frame` has the slot frame draw it around whatever the Widget renders: ground, edge and depth on the
   * box the Widget sits in. `own` hands it to the Widget, which reads `config.surface` itself -- a card
   * whose picture zooms under the pointer needs the ground inside its own box. `none`, the answer when a
   * Widget says nothing, says the Widget has no Surface at all, and the Inspector offers none: a Widget
   * gets a Surface only by asking for one.
   */
  surface?: PhiSurfacePolicy;
  /**
   * The kind of Region this Widget needs, where standing in the other kind would break it.
   *
   * Declared by the few Widgets it matters to and left out by the rest, which stand anywhere. "shell"
   * says the Widget needs a Region that survives a move between Pages -- Area navigation is the case
   * it exists for, because a Page-owned Region is built again for every Page and the navigation would
   * visibly rebuild itself under the hand that used it.
   *
   * Read while authoring and by the checks that run before a build, never while rendering: a
   * placement can only be made in the Builder or written into a preset, so a live Page paying for the
   * question on every request would pay for a decision that was already taken.
   */
  requiredRegionOwnership?: PhiCmsRegionOwnership;
  defaultConfig?: Partial<TConfig>;
  /**
   * What a placement of this Widget is created with, where that is more than its `defaultConfig`.
   *
   * The same split the Layouts make: a default is put back under every placement that leaves the key
   * out, so it can only hold what an author may not take away. A starting text the author may clear
   * belongs here -- written into the new placement once, and gone for good when they clear it.
   */
  creationConfig?: Partial<TConfig>;
  fields: PhiCmsConfigField[];
  parseConfig: (raw: Record<string, unknown>) => TConfig;
  render: PhiBivariantCallback<[PhiCmsWidgetPluginRenderArgs<TConfig>], ReactNode>;
  renderPreview: PhiBivariantCallback<[PhiCmsWidgetPluginRenderArgs<TConfig>], ReactNode>;
};

/**
 * Everything a Widget declares about itself, and nothing it renders.
 *
 * The one declarative shape. The Builder reads only this -- its metadata, Inspector fields and config
 * parser -- and the Server, the Builder and the Runtime plugins below are this shape plus the function
 * each of them renders with. There used to be six hand-kept `Pick` lists, and three of them had lost
 * fields the others had: a Server plugin could not declare `requiredDataProviders`, the Builder meta read
 * `contentBinding` through an `"x" in plugin` branch, and a Module's `translatesOwnText` travelled on a
 * plugin whose type did not know it.
 */
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
  | "translatesOwnText"
  | "slotSizePolicy"
  | "surface"
  | "requiredRegionOwnership"
  | "defaultConfig"
  | "creationConfig"
  | "fields"
  | "parseConfig"
>;

export type PhiCmsBuilderWidgetEditorInteraction = "inert" | "authoring";

export type PhiCmsBuilderWidgetPlugin<TConfig> = PhiCmsWidgetPluginDefinition<TConfig> & {
  editorInteraction?: PhiCmsBuilderWidgetEditorInteraction;
  renderEditor: PhiBivariantCallback<[PhiCmsBuilderWidgetRenderArgs<TConfig>], ReactNode>;
  renderEditorTools?: PhiBivariantCallback<[PhiCmsBuilderWidgetRenderArgs<TConfig>], ReactNode>;
};

export type PhiCmsServerWidgetPlugin<TConfig> = PhiCmsWidgetPluginDefinition<TConfig> & Pick<
  PhiCmsWidgetPlugin<TConfig>,
  "render" | "renderPreview"
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
  serverCapabilities: import("./server-capabilities").PhiCapabilitySnapshot | null;
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
  /** Each Widget's answer to who draws its Surface; only types that do not leave it to the frame. */
  widgetSurfacePoliciesByType: ReadonlyMap<string, PhiSurfacePolicy>;
  /**
   * The block base a Widget declares in its `defaultConfig`, for the nodes that declare none.
   *
   * Merged under a node's own config before anything renders, so the slot frame and the Widget read one
   * config rather than two. Shallow, per key: a node that states `maxSize` owns `maxSize` whole, and a
   * height without a width does not inherit the declared width. Only types that declare something are
   * in here.
   */
  widgetBlockDefaultsByType: ReadonlyMap<string, Partial<PhiRenderableBlockBase>>;
  ownerModuleIdByLayoutType: ReadonlyMap<string, PhiRuntimeModuleId>;
  /** The used Modules whose catalog entry says they bring a UI provider through their Client half. */
  uiProviderModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  /**
   * How to ask each active Module for the facts it publishes, by the namespace it publishes them under.
   *
   * Loaders rather than values: a page that asks nothing never loads one, and one that asks about a
   * single namespace does not make every other Module answer as well.
   */
  featureResolverLoadersByNamespace: ReadonlyMap<
    string,
    () => Promise<PhiRuntimeModuleFeatureResolver>
  >;
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
  | "invalid-render-output"
  /** A node whose `visibleWhen` reads a feature namespace whose Module could not be asked this render. */
  | "feature-unavailable"
  /** A Region or Overlay zone names a root layout node the tree does not contain. */
  | "missing-node";

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
  title: string;
  description?: string;
  category: PhiCmsPluginCategory;
  tags?: string[];
  icon?: string;
  iconName?: string;
  iconFamily?: string;
  commercial?: PhiCmsPluginCommercialMeta;
  runtimeSignals?: PhiSignalPluginMeta | null;
  slotSizePolicy: PhiSlotSizePolicy;
  defaultConfig?: Partial<TConfig>;
  /**
   * What a node of this Layout is created with, where that is more than its `defaultConfig`.
   *
   * A default is put back under every node that leaves the key out, so it can only hold what an author
   * may not take away. A look the author may remove -- a Surface, say -- belongs here: written into the
   * new node once, gone for good when the author clears it.
   */
  creationConfig?: Partial<TConfig>;
  defaultAnchor?: PhiRenderableBlockAnchor | null;
  fields: PhiCmsConfigField[];
  slots: PhiCmsLayoutSlotDefinition[];
  /**
   * What an emptied position does, for a Layout whose slots are all sequential.
   *
   * `compact`, the default, closes the gap: the Builder renumbers the children after a move or a
   * removal, the way a row or a carousel reads. `fixed` keeps every position where it is, because each
   * one means something on its own -- the Collapsible's panel three is panel three whether or not panel
   * two holds anything.
   */
  slotPositions?: "compact" | "fixed";
  parseConfig: (raw: Record<string, unknown>) => TConfig;
  render: PhiBivariantCallback<[PhiCmsLayoutPluginRenderArgs<TConfig>], ReactNode>;
  renderEditor: PhiBivariantCallback<[PhiCmsLayoutPluginRenderArgs<TConfig>], ReactNode>;
};

export type PhiCmsLayoutPluginDefinition<TConfig> = Pick<
  PhiCmsLayoutPlugin<TConfig>,
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
  | "slotSizePolicy"
  | "defaultConfig"
  | "creationConfig"
  | "defaultAnchor"
  | "fields"
  | "slots"
  | "slotPositions"
>;

export type PhiCmsResolvedRequestLoaderArgs = {
  siteKey: string;
  locale: string;
  /**
   * The Area the route branch answers for.
   *
   * It is stated rather than derived because only the branch knows it: under a locale root every
   * segment is a page name, so a page stored at `/admin/x` must not be mistaken for the Admin Area.
   */
  area: PhiCmsAreaKey;
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
  serverCapabilities: import("./server-capabilities").PhiCapabilitySnapshot | null;
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
  /** What phis-server provides on this Site, as the render that mounts the Controller read it. */
  serverCapabilities: import("./server-capabilities").PhiCapabilitySnapshot | null;
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
  slotSizePolicy: PhiSlotSizePolicy;
  surface?: PhiSurfacePolicy;
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
  controllerType?: `${string}/${string}`;
  controller?: PhiRuntimeModuleControllerDescriptor;
  sourceLocale?: string;
  title: string;
  description: string;
  category: PhiRuntimeModuleCategory;
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
  /**
   * The kinds of conversation this Module needs a Site to offer.
   *
   * A declaration, on the same terms as `mediaSpaces`: the Site's availability is the union across its
   * active Modules, two Modules declaring the same kind do not collide, and a kind that stops being
   * declared hides its threads rather than deleting them. No administrator switches one on -- a Site
   * gains Support conversations by running a Support Module, not by being configured to.
   *
   * It says which kinds exist on the Site, never who may open one. That stays with the people and the
   * groups: a group carries its own thread flags, and Staff is what Core's roles make somebody.
   */
  threadKinds?: readonly import("./threads").PhisDeclarableThreadKind[];
  /**
   * What this Module keeps about the person looking at it, per Site.
   *
   * Not a declaration in the sense of the two above, despite the placement. Those tell a Site what to
   * make available and are materialized on publish; this one travels nowhere. phi-server admits a write
   * on the key's prefix -- an active Module's id -- and checks the value against the shape the write
   * itself names, so it needs no list from here and is not given one.
   *
   * It earns its place all the same. It lets this side refuse a malformed write before spending a round
   * trip on it, and it puts what a Module stores where somebody reading that Module will find it, rather
   * than leaving it to be discovered from rows in production. A key that is not declared still works,
   * and that is the honest description of what this is: the Module's own account of itself.
   *
   * A dismissed card is a `flag`, a read position a `marker`, a place in a guided sequence a `value`.
   * What is not here is anything the Module needs in order to work -- an order, a booking, a submission
   * belongs in its own storage, because losing one of these should be an annoyance and not a support
   * case.
   */
  userState?: readonly import("./user-state").PhisDeclarableUserStateKey[];
  /**
   * The rows this Module needs a Site to have before any of it works.
   *
   * Not a third declaration of the two above, whatever the placement suggests. Those declare
   * availability: the Site's is the union across its Modules, it is recomputed from that union on every
   * publish, and withdrawing one hides what it offered without losing anything. These are rows other
   * rows point at -- a ticket names its queue and its type -- so they are found by the key the Module
   * gives them, created when absent, never rewritten afterwards, and never deleted. Two Modules asking
   * for "an entry queue" do not merge into one, and a second publish finds the first one's.
   *
   * What it is for is the Site that has just switched a Module on and can do nothing with it: Support
   * needs one queue marked `Entry` and one ticket type to exist before anybody can open a ticket, and
   * nobody should have to know that. The name each row is given is a starting value; once the row is
   * there it is the Site's, and administration renames it without the next publish undoing that.
   *
   * Keys are resolved within one Module's own declaration -- a queue names its group by key, because the
   * group has no id until the same publish gives it one.
   */
  seed?: {
    readonly groups?: readonly import("./seed").PhisDeclaredSiteGroup[];
    readonly supportQueues?: readonly import("./seed").PhisDeclaredSupportQueue[];
    readonly supportTicketTypes?: readonly import("./seed").PhisDeclaredSupportTicketType[];
  };
  /**
   * Renderers this Module offers for Collection items.
   *
   * Separate from `dataProviders` because it is the one contribution that is deliberately about another
   * Module's data: a Module may declare a renderer for items whose provider it does not own, and a Site
   * chooses it in the Collection View's `itemRendererKey`. The Module owning the items is not consulted
   * and does not have to be -- it published a contract when it named its resource's renderer.
   */
  collectionItemRenderers?: readonly import("./collection-provider").PhiCollectionItemRendererDescriptor[];
  calendarAdapters?: readonly PhiCalendarAdapterDescriptor[];
  /**
   * Places a video may be fetched from, once somebody has asked for it.
   *
   * A contribution rather than a Core table, for the same reason Calendar adapters are: the Video Module
   * ships the two everybody wants, and an add-on brings the one its customer uses without Core learning
   * its name. A provider is plain data, so unlike an adapter it needs no Client loader -- the descriptors
   * reach the browser as props and the placeholder reads them there.
   */
  videoProviders?: readonly import("./video").PhiVideoProviderDescriptor[];
  formProviders?: PhiRuntimeModuleFormProviderDescriptors;
  authUiProvider?: {
    providerKey: `${string}/${string}`;
    controllerType: `${string}/${string}`;
    capabilitiesByArea: Partial<Record<PhiCmsAreaKey, readonly (
      | "primary-login"
      | "factor-challenge"
      | "factor-enrollment"
      | "recovery"
      | "site-settings"
    )[]>>;
    /**
     * The Area Overlay this provider signs a visitor in through, per Area.
     *
     * The Account Widget opens it directly; the provider's Controller arrives with the Overlay's zones
     * and hears the open it was sent while it was not there yet. An Area without one is signed into on
     * the Public `/login` page. Only an Area whose capabilities include `primary-login` may name one.
     */
    loginOverlayByArea?: Partial<Record<PhiCmsAreaKey, PhiCmsInstanceId>>;
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
  themeBlocks?: readonly PhiCmsThemeBlockDescriptor[];
  /**
   * That the Module brings a UI provider, which its Client contributions hold.
   *
   * Only the statement: the provider is Client code, and loaded from here it was a client reference of
   * every route that reached the catalog. The Area's Client boundary holds the loader
   * (`components/runtime/runtime-module-ui-provider-client-manifest.tsx`).
   */
  uiProvider?: true;
  /**
   * Named facts about this Module's own configuration, for conditions to be written against.
   *
   * The namespace is declared statically and the resolver is loaded only when a page actually asks --
   * a Site whose pages carry no `feature` condition never pays for one. What a resolver returns is a
   * published contract like a signal capability: `auth.password` stays `auth.password` however the
   * Module rearranges itself inside.
   */
  features?: {
    namespace: string;
    load: () => Promise<PhiRuntimeModuleFeatureResolver>;
  };
  /**
   * The cards this Module offers a Dashboard, loaded only when one asks.
   *
   * Declared like `features` and for the same reason: the answer is assembled on the server, from label
   * sets and endpoints that must not reach the browser, and a Site whose Dashboard nobody opens never
   * pays for it. The Module offers; which cards a Site shows is the Site's decision.
   *
   * There is no namespace to declare. A card carries its own id, and that id says whose it is.
   */
  dashboardCards?: {
    load: () => Promise<import("./dashboard-cards").PhiDashboardCardProvider>;
  };
  load: PhiRuntimeModuleLoader;
};

export type PhiRuntimeModuleFeatureContext = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  locale: string;
};

export type PhiRuntimeModuleFeatureResolver = (
  context: PhiRuntimeModuleFeatureContext,
) => Promise<Record<string, unknown>> | Record<string, unknown>;
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
  videoProviderDescriptorsByKey: ReadonlyMap<
    import("./video").PhiVideoProviderKey,
    import("./video").PhiVideoProviderDescriptor
  >;
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
  /**
   * The Theme blocks this Site can follow, for an Area whose Widgets choose among them.
   *
   * Only the Builder's bridge offers it. The Area boundary hands it to the browser, so an Area without
   * it ships no catalogue -- every page renders the one Theme the root resolved on the server.
   */
  loadThemeBlockCatalog?: () => Promise<PhiThemeBlockCatalog>;
  runtime?: PhiCmsSiteRuntime;
  loadResolvedRequest?: (
    args: PhiCmsResolvedRequestLoaderArgs,
  ) => Promise<PhiResolvedCmsRequest | null>;
  /**
   * Where a render learns about the request it answers.
   *
   * `request`, the default, reads it: the path and query the proxy forwarded, and the visitor's cookies.
   * `static` reads nothing. It renders a page once for every anonymous visitor -- the path comes from the
   * route's own segments, there is no query and no cookie -- so the result can be cached and served to
   * all of them. Only the static route tree hands such a Bridge in (`toPhiStaticCmsSiteBridge`).
   */
  renderSource?: "request" | "static";
};
