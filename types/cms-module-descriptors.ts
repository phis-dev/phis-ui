import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiCmsRegionTypeValue } from "../constants/phi-cms";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "./cms";
import type { PhiBlockRuntime } from "./widget-runtime";
import type { PhiThemePresetPlugin } from "../theme/phi-theme-presets";
import type { PhiViewerAccessPolicy } from "./access";
import type { PhiCmsInstanceId } from "./cms-instance-id";

export type PhiRuntimeModuleId = `${string}/${string}`;

export type PhiCmsRouteMountKey = string;

export type PhiCmsAreaRouteMountDescriptor = {
  mountKey: PhiCmsRouteMountKey;
  basePath: string;
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
  pageKey: string;
  /** Absolute Area-local path, or a mount-relative path when `mount` is declared. */
  path: string;
  mount?: PhiCmsRouteMountReference;
  title: string;
  accessPolicy?: PhiViewerAccessPolicy;
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

export type PhiCmsNavigationLabel = {
  defaultMessage: string;
  messageId?: string;
};

export type PhiCmsNavigationBaseItemDescriptor = {
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

export type PhiCmsNavigationItemOverride = {
  id: PhiCmsInstanceId;
  label?: string;
  icon?: string | null;
  placement?: PhiCmsNavigationItemPlacement;
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
};

export type PhiCmsActiveRouteTable = {
  area: PhiCmsAreaKey;
  byPageKey: ReadonlyMap<string, PhiCmsRoutePresetDescriptor>;
  exactByPath: ReadonlyMap<string, PhiCmsRoutePresetDescriptor>;
  dynamic: readonly PhiCmsCompiledRoutePattern[];
};
