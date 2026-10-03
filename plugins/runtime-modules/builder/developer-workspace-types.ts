import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiCmsPaddingWidgetConfig } from "../../../types/cms-config";
import type {
  PhiRenderableBlockEffects,
  PhiRuntimeModuleId,
} from "../../../types";
import type { PhiBuilderAreaKey } from "../../../constants/cms-areas";
import type { PhiCmsGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import type { PhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";
import type { PhiBuilderRootNodeKind } from "./preview-transport";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiWorkspaceCatalogState } from "../../../components/workspace/catalog-state";
import type { PhiCmsPresetSource } from "../../../types/cms-module-descriptors";
import type { PhiAreaRootRoute, PhiAreaMeta } from "../../../helpers/cms-area-config";
import type { PhiSurface } from "../../../types/surface";

export type PhiDeveloperBuilderArea = PhiBuilderAreaKey;
export type PhiDeveloperBuilderMode = "editor" | "preview";
export type PhiDeveloperBuilderNodeKind = "page" | "region" | "layout" | "widget" | "slot";
export type PhiDeveloperBuilderCommandWorkspace = "structure" | "pages" | "navigation" | "modules" | "theme" | null;

export type PhiBuilderChromeControls = {
  editorPreviewDisabled: boolean;
  actionsDisabled: boolean;
  debugDisabled: boolean;
};

export type PhiDeveloperBuilderRegionDraft = PhiCmsGeometryWidgetConfig & {
  /** The Region's own look; the root node's is `rootNodeSurface`. */
  surface?: PhiSurface | null;
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
  rootNodeSurface?: PhiSurface | null;
  rootNodeChildLayouts?: PhiCmsLayoutRenderNode[];
  rootNodeChildWidgets?: PhiCmsContentWidgetNode[];
};

/**
 * The Inspector's draft for one node inside a Region, a Layout or the root.
 *
 * Its look is `rootNodeSurface`; the Region's own `surface` belongs to the Region draft and means
 * nothing here, which is why it is left out rather than filled with a stand-in.
 */
export type PhiDeveloperBuilderStructureNodeDraft = Omit<PhiDeveloperBuilderRegionDraft, "surface">;

export type PhiDeveloperBuilderPageMetaDraft = {
  title?: string | null;
  description?: string | null;
  /**
   * Whether the Page may be found, as the Operator last said it in the dialog.
   *
   * Absent is not "no": it is a draft that never touched the question, and the stored Page -- or, for
   * a Page that has none yet, the flags its route ships -- keeps answering. The two travel to
   * phi-server by different roads, the titles as translated messages and this as a Page flag, which is
   * why it is resolved apart from them at save time.
   */
  index?: boolean;
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
  /**
   * Whose effects these are, so the canvas can paint what is being chosen before it is chosen.
   *
   * The node is named rather than looked up from the selection: opening the editor is a press on one
   * node's toolbar, and the selection is free to be something else by the time a value moves. A layout
   * root carries no block id, which is why the kind is named beside it -- `null` means the region's root
   * where the kind is `layout`, and nothing at all anywhere else.
   */
  target: { kind: PhiDeveloperBuilderNodeKind; blockId: PhiCmsInstanceId | null };
  /**
   * What the editor shows at this moment, painted in the canvas and committed to nothing.
   *
   * A transparency is a value one arrives at by looking, so the number has to be on the page while the
   * handle is still under the finger. It stands beside `effects` instead of replacing it because that
   * one is what the editor opened with: cancelling is the request going away, and the node goes back to
   * what it was drawn with without anything having to be written back.
   */
  preview: PhiRenderableBlockEffects | null;
};

/** One contested address, with the answer being typed for it. */
export type PhiBuilderPublicRouteCollisionAnswer = {
  presetKey: string;
  title: string;
  declaredPath: string;
  /** What holds the address today, said the way the dialog shows it. */
  heldBy: string;
  /** The address being proposed instead. Starts at a suggestion, and the Builder may overwrite it. */
  path: string;
};

export type PhiBuilderPublicRouteCollisionRequest = {
  correlationId: string;
  moduleId: PhiRuntimeModuleId;
  moduleTitle: string;
  /** The Areas the gesture wanted, so confirming enables exactly what the switch or checkbox asked for. */
  areas: PhiDeveloperBuilderArea[];
  answers: PhiBuilderPublicRouteCollisionAnswer[];
};

/** One place a Module's blocks stand, said the way the dialog shows it. */
export type PhiBuilderModuleUsageEntry = {
  key: string;
  area: string;
  where: string;
  /** `null` for what is not a block: the sign-in a Public Auth UI provider takes with it. */
  blocks: number | null;
};

export type PhiBuilderModuleDeactivationRequest = {
  correlationId: string;
  moduleId: PhiRuntimeModuleId;
  moduleTitle: string;
  /** The Areas the gesture would switch off, so confirming does exactly what was asked for. */
  areas: PhiDeveloperBuilderArea[];
  usage: PhiBuilderModuleUsageEntry[];
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
    /** The Form field a `form-field` route writes; meaningless, and refused, on any other input. */
    fieldKey: string | null;
  };
  effectsEditorRequest: PhiDeveloperBuilderEffectsRequest | null;
  /**
   * The question enabling a Module asked, while it waits for an answer.
   *
   * A Module is active with every route addressed or it is not active, so nothing is applied while
   * this stands: the switch springs back, the dialog holds what was asked for, and confirming is what
   * enables the Module. Cancelling leaves the Site exactly as it was.
   */
  publicRouteCollisionRequest: PhiBuilderPublicRouteCollisionRequest | null;
  /**
   * What switching a Module off would stop drawing, while it waits to be acknowledged.
   *
   * The mirror image of the question beside it: enabling asks for an answer, disabling states a
   * consequence. Nothing is applied while it stands -- the switch springs back, and confirming is what
   * switches the Module off.
   */
  moduleDeactivationRequest: PhiBuilderModuleDeactivationRequest | null;
  builderMode: PhiDeveloperBuilderMode;
  search: string;
  darkMode: boolean;
  debugScaffold: boolean;
  commandWorkspace: PhiDeveloperBuilderCommandWorkspace;
  builderChromeControls: PhiBuilderChromeControls;
  pickerWidgetCategoryFilters: string[];
  /**
   * The Area root route being edited, by target Area.
   *
   * A missing key is an Area nobody has touched in this session; `null` is the Builder having chosen
   * the default back, which is stored as no config at all so the code-owned preset answers again.
   */
  areaRootRouteDrafts: Record<string, PhiAreaRootRoute | null>;
  /**
   * What the server said each Area's root does, before this session said anything.
   *
   * Kept apart from the drafts because absence means different things in the two: a missing draft is
   * an Area nobody touched, a missing baseline is an Area that never answered. Every workspace reads
   * it -- /pages hides `/` while it forwards -- and only /shells writes the draft beside it.
   */
  areaRootRoutes: Record<string, PhiAreaRootRoute | null>;
  /**
   * What an Area says about being found, by target Area, and what the server said before this session.
   *
   * Two records for the same reason the root route keeps two: a missing draft is an Area nobody
   * touched, a missing baseline is an Area that was never asked. Only Public is ever asked at all --
   * every other Area is authenticated -- so the other keys stay absent rather than answering "no".
   */
  areaMetaDrafts: Record<string, PhiAreaMeta | null>;
  areaMeta: Record<string, PhiAreaMeta | null>;
  /**
   * Areas whose Module selection has unsaved edits. The Modules workspace is site-wide, so its save
   * and publish commands walk this list instead of the header Area scope.
   */
  modulesDirtyAreas: PhiDeveloperBuilderArea[];
};

/**
 * What the Builder reads: its own tool state plus the workspace catalog it feeds.
 *
 * The two are stored apart -- the catalog in the Foundation, where the Editor can feed it too, and
 * where a Module like revisions can read it without importing the Builder. The Builder is the one
 * place that needs both at once, so it reads them merged.
 */
export type PhiDeveloperBuilderWorkspaceState = PhiDeveloperBuilderState & PhiWorkspaceCatalogState;
