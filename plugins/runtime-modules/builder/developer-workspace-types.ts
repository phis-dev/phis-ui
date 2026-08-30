import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiCmsBorderWidgetConfig, PhiCmsPaddingWidgetConfig } from "../../../types/cms-config";
import type {
  PhiRenderableBlockEffects,
} from "../../../types";
import type { PhiBuilderAreaKey } from "../../../constants/cms-areas";
import type { PhiCmsBackgroundWidgetConfig } from "../../../components/widgets/config/background";
import type { PhiCmsGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import type { PhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";
import type { PhiShadow, PhiLayoutEffectId } from "../../../types/layout-style";
import type { PhiBuilderRootNodeKind } from "./preview-transport";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiWorkspaceCatalogState } from "../../../components/workspace/catalog-state";
import type { PhiCmsPresetSource } from "../../../types/cms-module-descriptors";

export type PhiDeveloperBuilderArea = PhiBuilderAreaKey;
export type PhiDeveloperBuilderMode = "editor" | "preview";
export type PhiDeveloperBuilderPanel = "toolbar" | "breadcrumbs" | "pages" | "canvas" | "inspector";
export type PhiDeveloperBuilderNodeKind = "page" | "region" | "layout" | "widget" | "slot";
export type PhiDeveloperBuilderCommandWorkspace = "structure" | "pages" | "navigation" | "theme" | null;

export type PhiBuilderChromeControls = {
  editorPreviewDisabled: boolean;
  actionsDisabled: boolean;
  debugDisabled: boolean;
};

export type PhiDeveloperBuilderRegionDraft = PhiCmsGeometryWidgetConfig & {
  background: PhiCmsBackgroundWidgetConfig;
  border?: PhiCmsBorderWidgetConfig | null;
  effect?: PhiLayoutEffectId | null;
  shadow?: PhiShadow | null;
  regionConfig?: Record<string, unknown> | null;
  rootNodeId?: PhiCmsInstanceId | null;
  rootNodeTypeKey?: string | null;
  rootNodeKind?: PhiBuilderRootNodeKind;
  rootNodeTitle?: string | null;
  rootNodePackageName?: string | null;
  rootNodeConfig?: Record<string, unknown> | null;
  rootNodeGeometry?: PhiCmsGeometryWidgetConfig | null;
  rootNodeAnchor?: PhiAnchorWidgetPlacement | null;
  rootNodePadding?: PhiCmsPaddingWidgetConfig | null;
  rootNodeBackground?: PhiCmsBackgroundWidgetConfig | null;
  rootNodeBorder?: PhiCmsBorderWidgetConfig | null;
  rootNodeShadow?: PhiShadow | null;
  rootNodeChildLayouts?: PhiCmsLayoutRenderNode[];
  rootNodeChildWidgets?: PhiCmsContentWidgetNode[];
};

export type PhiDeveloperBuilderPageMetaDraft = {
  title?: string | null;
  description?: string | null;
};

export type PhiDeveloperBuilderDraftAllocation = {
  revisionId: number;
  version: number;
  nextNodeSequence: number;
  sourcePreset: PhiCmsPresetSource | null;
};

export type PhiDeveloperBuilderEffectsRequest = {
  correlationId: string;
  effects: PhiRenderableBlockEffects;
};

export type PhiDeveloperBuilderState = {
  nodeKey: string;
  nodeId: PhiCmsInstanceId | null;
  nodeKind: PhiDeveloperBuilderNodeKind;
  selectedRegionType: number | null;
  selectedRegionKey: string | null;
  selectedRootRegionKey: string | null;
  selectedLayoutAnchor: PhiAnchorWidgetPlacement;
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>;
  pagePresetDrafts: Record<string, PhiDeveloperBuilderRegionDraft>;
  pageMetaDrafts: Record<string, PhiDeveloperBuilderPageMetaDraft>;
  deletedPageDrafts: Record<string, boolean>;
  draftAllocations: Record<string, PhiDeveloperBuilderDraftAllocation>;
  sidebarKey: string;
  pagesOpen: boolean;
  inspectorOpen: boolean;
  /**
   * The Signal wiring session behind the wiring overlay.
   *
   * The four selects cascade -- capabilities depend on the endpoint chosen before them, and a receiver
   * capability has to match the sender output -- but a Form field's options provider only sees its own
   * static config, never its siblings' current values. The Builder controller mirrors the Form here as
   * the author edits, and the options providers read it back. That is the same route every other piece
   * of dependent Builder state takes.
   */
  signalWiringRequest: { correlationId: string } | null;
  signalWiring: {
    senderAddress: string | null;
    senderCapabilityId: string | null;
    receiverAddress: string | null;
    receiverCapabilityId: string | null;
  };
  effectsEditorRequest: PhiDeveloperBuilderEffectsRequest | null;
  builderMode: PhiDeveloperBuilderMode;
  search: string;
  darkMode: boolean;
  debugScaffold: boolean;
  commandWorkspace: PhiDeveloperBuilderCommandWorkspace;
  builderChromeControls: PhiBuilderChromeControls;
  pickerWidgetCategoryFilters: string[];
};

/**
 * What the Builder reads: its own tool state plus the workspace catalog it feeds.
 *
 * The two are stored apart -- the catalog in the Foundation, where the Editor can feed it too, and
 * where a Module like revisions can read it without importing the Builder. The Builder is the one
 * place that needs both at once, so it reads them merged.
 */
export type PhiDeveloperBuilderWorkspaceState = PhiDeveloperBuilderState & PhiWorkspaceCatalogState;
