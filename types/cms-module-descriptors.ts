import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiCmsRegionTypeValue } from "../constants/phi-cms";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "./cms";
import type { PhiBlockRuntime } from "./widget-runtime";
import type { PhiThemePresetPlugin } from "../theme/phi-theme-presets";
import type {
  PhiThemeFontsBlock,
  PhiThemeGroundBlock,
  PhiThemeSetBlock,
  PhiThemeStyleBlock,
} from "../theme/phi-theme-blocks";
import type { PhiViewerAccessPolicy } from "./access";
import type { PhiSignalRoute } from "./signals";
import type { PhiCmsInstanceId } from "./cms-instance-id";

export type PhiRuntimeModuleId = `${string}/${string}`;

export type PhiCmsRouteMountKey = string;

/**
 * A published name a Module can hang a navigation entry under.
 *
 * A mount says nothing about paths -- every route outside Public is under its own package already, so
 * the address is unique without it. What it still does is let one package put its entry inside a
 * container another package owns, without hardcoding that container's item key.
 */
export type PhiCmsAreaRouteMountDescriptor = {
  mountKey: PhiCmsRouteMountKey;
  navKey: `${PhiCmsAreaKey}:${string}`;
  parentItemKey: string;
};

export type PhiCmsRouteMountReference = {
  mountKey: PhiCmsRouteMountKey;
};

export type PhiCmsPresetIdentity = {
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
};

export type PhiCmsPresetSource = PhiCmsPresetIdentity & {
  sourcePresetVersion: number;
};

export type PhiCmsAreaDefinition = {
  area: PhiCmsAreaKey;
  baseModuleId: PhiRuntimeModuleId;
  shellPresetKey: string;
  accessPolicy: PhiViewerAccessPolicy;
  navigationSurfaces?: readonly PhiCmsNavigationSurfaceDescriptor[];
  routeMounts?: readonly PhiCmsAreaRouteMountDescriptor[];
};

export type PhiCmsAreaShellCompositionSource = PhiCmsPresetIdentity & {
  omitRegionTypes?: readonly PhiCmsRegionTypeValue[];
  omitNodeKeys?: readonly string[];
};

export type PhiCmsDescriptorBuildContext = {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  catalog: PhiCmsCompiledDescriptorCatalog;
};

export type PhiCmsAreaShellPresetDescriptor = PhiCmsPresetIdentity & {
  shellPresetVersion: number;
  area: PhiCmsAreaKey;
  exportedNodeKeys?: readonly string[];
  composition?: readonly PhiCmsAreaShellCompositionSource[];
  loadTree: (
    context: PhiCmsDescriptorBuildContext,
  ) => PhiResolvedCmsPageTree | Promise<PhiResolvedCmsPageTree>;
};

export type PhiCmsAreaOverlayPresetDescriptor = PhiCmsPresetIdentity & {
  presetVersion: number;
  area: PhiCmsAreaKey;
  loadTree: (
    context: PhiCmsDescriptorBuildContext,
  ) => PhiResolvedCmsPageTree | Promise<PhiResolvedCmsPageTree>;
};

export type PhiCmsRoutePresetDescriptor = PhiCmsPresetIdentity & {
  presetVersion: number;
  area: PhiCmsAreaKey;
  /**
   * The Area-local path, before the package namespace outside Public is put in front of it. `/` is an
   * application for the Area root slot and keeps the address it asks for.
   */
  path: string;
  /**
   * That a Page at `/` means to be the Area's landing, and is not the root's forwarding machinery.
   *
   * The two are indistinguishable from outside -- both are a preset at `/` -- and they are opposites:
   * one is content a visitor lingers on, the other exists to send them somewhere else. A Module says
   * this to apply for the slot; the Site picks one applicant per Area, and the ones it does not pick
   * are simply not routed. Nothing else about the Module changes, because a landing is an offer and
   * not an address it needs to do its work.
   */
  landingPage?: true;
  mount?: PhiCmsRouteMountReference;
  title: string;
  /**
   * The `PhiCmsFlags` a Page of this route starts out with.
   *
   * A default, not a decision. It is written onto the Page when the route is instantiated and copied
   * into the draft when the Builder installs it; from then on the record answers and this is not
   * consulted again. A sign-in Page ships `NoIndex` because that is what almost every Site wants, and
   * the one that wants its `/register` found can say so without the Module having to agree.
   */
  defaultPageFlags?: number;
  loadTree: (
    context: PhiCmsDescriptorBuildContext & {
      activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
      params: Readonly<Record<string, string>>;
    },
  ) => PhiResolvedCmsPageTree | Promise<PhiResolvedCmsPageTree>;
  navigation?: readonly PhiCmsNavigationInjectionDescriptor[];
};

export type PhiCmsThemePresetDescriptor = PhiCmsPresetIdentity & {
  presetVersion: number;
  themeKey: string;
  title: string;
  description?: string;
  loadPreset: () => PhiThemePresetPlugin | Promise<PhiThemePresetPlugin>;
};

/**
 * A style, a ground, a fonts block or a Set a Module contributes (theme/phi-theme-blocks.ts).
 *
 * The palette has its own descriptor above, kept as it is because Modules already ship palettes
 * through it. The others arrive here, one descriptor shape for all of them: they differ in what they
 * carry, not in how they are announced, and a single shape keeps the catalog and its duplicate check
 * from growing near-identical copies.
 *
 * `loadBlock` is called only for an active Module, which is what lets a ground carry an image the
 * bundler resolves: nothing is loaded on a Site that does not use it.
 */
export type PhiCmsThemeBlockKind = "style" | "ground" | "fonts" | "set";

export type PhiCmsThemeBlockDescriptor = PhiCmsPresetIdentity & {
  presetVersion: number;
  blockKind: PhiCmsThemeBlockKind;
  blockKey: string;
  title: string;
  description?: string;
  loadBlock: () =>
    | PhiThemeStyleBlock
    | PhiThemeGroundBlock
    | PhiThemeFontsBlock
    | PhiThemeSetBlock
    | Promise<PhiThemeStyleBlock | PhiThemeGroundBlock | PhiThemeFontsBlock | PhiThemeSetBlock>;
};

export type PhiCmsNavigationLabel = {
  defaultMessage: string;
  messageId?: string;
};

/**
 * Where an Area's own entry stands among the ones Modules contribute.
 *
 * An Area states its entries and every Module adds to them, so the Area's come first -- which is right
 * for what a person works with and wrong for the one entry they visit to change something. "last" puts
 * it after everything contributed, wherever the Area happens to declare it.
 *
 * Only an Area's own entry may say it. A contribution orders itself with `before` and `after` against
 * an exported anchor, and an entry standing last is no anchor: everything is before it by definition,
 * so naming it would say nothing that its own standing does not already say.
 */
export type PhiCmsNavigationItemStanding = "last";

export type PhiCmsNavigationBaseItemDescriptor = {
  itemKey: string;
  label: PhiCmsNavigationLabel;
  icon?: string;
  standing?: PhiCmsNavigationItemStanding;
  routePresetKey?: string;
  /**
   * An Area-owned Overlay of the same Module, named by its preset and the node key inside it.
   * Mutually exclusive with `routePresetKey`; both keys are required together.
   */
  overlayPresetKey?: string;
  overlayNodeKey?: string;
  accessPolicy?: PhiViewerAccessPolicy;
  /**
   * What this entry sends when it is chosen, instead of going somewhere.
   *
   * A navigation entry is already addressable -- every resolved item has an instance id, and a signal
   * address is `cms:<instanceId>` -- so an entry that emits is not a new kind of thing, it is a sender
   * like a Button Widget. Signing out is the first: there is no Page to go to, the act belongs to the
   * runtime, and what it means lives in the route rather than in a word on the entry. That is the
   * difference from an `action` field, which would make navigation a list of commands.
   *
   * Mutually exclusive with a target in practice: an entry that emits has nowhere to go.
   */
  signalRoutes?: { emits?: readonly PhiSignalRoute[] };
  children?: readonly PhiCmsNavigationBaseItemDescriptor[];
};

export type PhiCmsNavigationSurfaceDescriptor = {
  navKey: `${PhiCmsAreaKey}:${string}`;
  label: PhiCmsNavigationLabel;
  items: readonly PhiCmsNavigationBaseItemDescriptor[];
  exportedItemKeys?: readonly string[];
};

export type PhiCmsNavigationInjectionItemDescriptor = {
  itemKey: string;
  label: PhiCmsNavigationLabel;
  icon?: string;
  routePresetKey?: string;
  /**
   * An Area-owned Overlay of the same Module, named by its preset and the node key inside it.
   * Mutually exclusive with `routePresetKey`; both keys are required together.
   */
  overlayPresetKey?: string;
  overlayNodeKey?: string;
  accessPolicy?: PhiViewerAccessPolicy;
  /** What this entry sends when it is chosen; see the base item descriptor. */
  signalRoutes?: { emits?: readonly PhiSignalRoute[] };
  children?: readonly PhiCmsNavigationInjectionItemDescriptor[];
};

export type PhiCmsNavigationInjectionDescriptor = {
  navKey: `${PhiCmsAreaKey}:${string}`;
  parentItemKey: string | null;
  before?: string;
  after?: string;
  item: PhiCmsNavigationInjectionItemDescriptor;
};

export type PhiCmsResolvedNavigationTarget =
  | (PhiCmsPresetIdentity & {
      kind: "module";
      path: string;
    })
  /**
   * An Overlay the item opens rather than a place it goes.
   *
   * Carries preset identity and no path, because there is nothing to navigate to: the item is a button
   * and the renderer sends the generic `dialog` open command to the resolved instance. Identity rather
   * than a `PhiCmsInstanceId` for the same reason a route is named by `presetKey` -- an instance id is
   * revision-bound, and an item naming one would break at the next Area revision.
   *
   * Only an Area-owned Overlay is addressable this way. A Page-owned one exists only while its Page is
   * the current tree, so opening it from a navigation surface would mean navigating first.
   */
  | (PhiCmsPresetIdentity & {
      kind: "overlay";
      nodeKey: string;
    })
  | {
      kind: "custom";
      path: string;
      external?: boolean;
      newTab?: boolean;
    };

export type PhiCmsResolvedNavigationItem = {
  id: PhiCmsInstanceId;
  ownerModuleId: PhiRuntimeModuleId | null;
  kind: "link" | "container" | "separator";
  label: PhiCmsNavigationLabel;
  icon?: string;
  target: PhiCmsResolvedNavigationTarget | null;
  accessPolicy?: PhiViewerAccessPolicy;
  /** The routes this entry sends on when it is chosen, carried through from its descriptor. */
  emits?: readonly PhiSignalRoute[];
  children: readonly PhiCmsResolvedNavigationItem[];
};

export type PhiCmsResolvedNavigationSurface = {
  area: PhiCmsAreaKey;
  navKey: `${PhiCmsAreaKey}:${string}`;
  label: PhiCmsNavigationLabel;
  items: readonly PhiCmsResolvedNavigationItem[];
};

export type PhiCmsNavigationItemPlacement = {
  parentId: PhiCmsInstanceId | null;
  index: number;
};

/**
 * What a folder address leads to; mirrors phis-server `SiteNavigationFolderTarget`. A Page by reference, or
 * a sub-folder by address. It names the target, not a child of one Navigation, so the same folder in
 * another Navigation can take it over unchanged.
 */
export type PhiCmsNavigationFolderTarget =
  | { kind: "page"; reference: string }
  | { kind: "folder"; address: string };

/**
 * Where a container leads when its folder address is requested; mirrors phis-server
 * `SiteNavigationFolder`. `address` is the folder the container's direct children share, package
 * namespace included, or null; `target` is what one of those children stands for.
 */
export type PhiCmsNavigationFolder = {
  address: string | null;
  /** Null leads nowhere (404); the address stays, so a target chosen elsewhere can be carried to it. */
  target: PhiCmsNavigationFolderTarget | null;
};

export type PhiCmsNavigationItemOverride = {
  id: PhiCmsInstanceId;
  label?: string;
  icon?: string | null;
  placement?: PhiCmsNavigationItemPlacement;
  /** On a Module container. */
  folder?: PhiCmsNavigationFolder;
};

export type PhiCmsNavigationCustomItem = {
  id: PhiCmsInstanceId;
  kind: "link" | "container" | "separator";
  label: string;
  icon?: string | null;
  target?:
    | { kind: "page"; reference: string; resolvedPath?: string | null; deleted?: boolean }
    | { kind: "external"; href: string };
  newTab?: boolean;
  placement: PhiCmsNavigationItemPlacement;
  /** Containers only. */
  folder?: PhiCmsNavigationFolder;
};

export type PhiCmsNavigationOverlay = {
  navKey: `${PhiCmsAreaKey}:${string}`;
  label?: string;
  itemOverrides: readonly PhiCmsNavigationItemOverride[];
  customItems: readonly PhiCmsNavigationCustomItem[];
  tombstones: readonly PhiCmsInstanceId[];
};

export type PhiCmsNavigationOverlayDiagnostic = {
  code: "unresolved-item" | "unresolved-parent" | "unresolved-anchor" | "invalid-placement";
  id: PhiCmsInstanceId;
  referenceId?: PhiCmsInstanceId;
};

export type PhiCmsNavigationOverlayResolution = {
  surface: PhiCmsResolvedNavigationSurface;
  diagnostics: readonly PhiCmsNavigationOverlayDiagnostic[];
};

export type PhiCmsModulePresetDescriptors = {
  areaShells?: readonly PhiCmsAreaShellPresetDescriptor[];
  areaOverlays?: readonly PhiCmsAreaOverlayPresetDescriptor[];
  routes?: readonly PhiCmsRoutePresetDescriptor[];
  themes?: readonly PhiCmsThemePresetDescriptor[];
  themeBlocks?: readonly PhiCmsThemeBlockDescriptor[];
};

export type PhiCmsAreaShellPresetBinding = {
  descriptor: PhiCmsAreaShellPresetDescriptor;
};

export type PhiCmsRoutePresetBinding = {
  descriptor: PhiCmsRoutePresetDescriptor;
  params: Readonly<Record<string, string>>;
};

export type PhiCmsThemePresetBinding = {
  descriptor: PhiCmsThemePresetDescriptor;
};

export type PhiCmsThemeBlockBinding = {
  descriptor: PhiCmsThemeBlockDescriptor;
};

/** One Module's Theme descriptors, apart from the rest of its catalog entry. */
export type PhiCmsThemeDescriptorContribution = {
  moduleId: PhiRuntimeModuleId;
  themes?: readonly PhiCmsThemePresetDescriptor[];
  themeBlocks?: readonly PhiCmsThemeBlockDescriptor[];
};

export type PhiCmsCompiledThemeDescriptors = Pick<
  PhiCmsCompiledDescriptorCatalog,
  "themeByKey" | "themeBlockByKey"
>;

export type PhiCmsCompiledRoutePattern = {
  descriptor: PhiCmsRoutePresetDescriptor;
  segments: readonly string[];
  parameterName: string | null;
};

export type PhiCmsCompiledDescriptorCatalog = {
  areaDefinitions: ReadonlyMap<PhiCmsAreaKey, PhiCmsAreaDefinition>;
  areaShellByArea: ReadonlyMap<PhiCmsAreaKey, PhiCmsAreaShellPresetBinding>;
  areaShellByIdentity: ReadonlyMap<string, PhiCmsAreaShellPresetBinding>;
  areaOverlaysByArea: ReadonlyMap<PhiCmsAreaKey, readonly PhiCmsAreaOverlayPresetDescriptor[]>;
  /** Navigation contributed by a Module that owns no Page in that Area. */
  moduleNavigationByArea: ReadonlyMap<PhiCmsAreaKey, readonly {
    ownerModuleId: PhiRuntimeModuleId;
    descriptor: PhiCmsNavigationInjectionDescriptor;
  }[]>;
  routeByIdentity: ReadonlyMap<string, PhiCmsRoutePresetDescriptor>;
  routesByArea: ReadonlyMap<PhiCmsAreaKey, readonly PhiCmsCompiledRoutePattern[]>;
  themeByKey: ReadonlyMap<string, PhiCmsThemePresetBinding>;
  /** Keyed by `<kind>:<blockKey>`, so a style and a ground may share a name. */
  themeBlockByKey: ReadonlyMap<string, PhiCmsThemeBlockBinding>;
};

export type PhiCmsActiveRouteTable = {
  area: PhiCmsAreaKey;
  /** By the Page identity the Builder carries: a hash of owner and preset key, so never contested. */
  byPageId: ReadonlyMap<PhiCmsInstanceId, PhiCmsRoutePresetDescriptor>;
  exactByPath: ReadonlyMap<string, PhiCmsRoutePresetDescriptor>;
  dynamic: readonly PhiCmsCompiledRoutePattern[];
};
