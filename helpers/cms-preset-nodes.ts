import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "./cms-node-factories";
import { PhiCmsStatus } from "../constants/phi-cms";
import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiCmsOverlayNode,
  PhiCmsPageNode,
  PhiCmsRegionNode,
} from "../types/cms";
import type { PhiCmsInstanceId } from "../types/cms-instance-id";
import type { PhiCmsOverlayType, PhiOverlayFooterPresentation } from "../types/cms-overlay";

type PhiCmsPresetNodeDefaults = {
  siteId: number;
  visibilityMask: number;
  status?: number;
  flags?: number;
};

type PhiCmsPresetLayoutInput = Parameters<typeof buildPhiCmsLayoutNode>[0];
type PhiCmsPresetWidgetInput = Parameters<typeof buildPhiCmsWidgetNode>[0];

type PhiCmsPresetNodeInput<TInput> = Omit<
  TInput,
  "siteId" | "visibilityMask" | "status" | "flags" | "sortOrder"
> & Partial<Pick<TInput & { sortOrder?: number }, "sortOrder">> & {
  status?: number;
  flags?: number;
};

/**
 * What a Region placement decides: which Region, rooted where, in which order, configured how.
 *
 * `status`, `flags` and `visibilityMask` are there for the Preset that copies them from a Region it was
 * handed rather than taking the frame's.
 */
export type PhiCmsPresetRegionInput = {
  id: number;
  regionType: number;
  rootLayoutNodeId: PhiCmsInstanceId;
  sortOrder: number;
  config?: Record<string, unknown>;
  status?: number;
  flags?: number;
  visibilityMask?: number;
};

/**
 * What an Overlay decides. A header or footer it does not name is none: the footer's presentation and
 * the Layout it presents are named together or not at all, because one without the other is not a
 * footer. They keep the node's own field names, which the overlay contract scripts read in source.
 */
export type PhiCmsPresetOverlayInput = {
  id: PhiCmsInstanceId;
  overlayType: PhiCmsOverlayType;
  headerLayoutNodeId?: PhiCmsInstanceId | null;
  bodyLayoutNodeId: PhiCmsInstanceId;
  sortOrder: number;
  label: string | null;
  config: Record<string, unknown>;
} & (
  | {
      footerPresentation?: Extract<PhiOverlayFooterPresentation, "none">;
      footerLayoutNodeId?: null;
    }
  | {
      footerPresentation: Exclude<PhiOverlayFooterPresentation, "none">;
      footerLayoutNodeId: PhiCmsInstanceId;
    }
);

/** The two things a Preset changes about the Page row it was built for; everything else is kept. */
export type PhiCmsPresetPageInput = Partial<Pick<PhiCmsPageNode, "pageType" | "layoutConfig">>;

/**
 * The parts of a node that a Preset repeats rather than decides.
 *
 * A placement is four things -- what it is, where it sits, what it is called, how it is configured --
 * and it was written as eleven, because `siteId`, `visibilityMask`, `status`, `flags`, `contentId` and
 * `sortOrder` are the same for every node of a page and were spelled out on each of them. That is not
 * detail a reader of a Preset needs; it is noise they have to look past to find the four that matter,
 * and it is six chances to write the wrong page's `visibilityMask` on one node out of twenty.
 *
 * `sortOrder` follows `slotIndex` unless it is given. Presets set them to the same number almost
 * everywhere, and where they differ it is deliberate and worth writing down.
 *
 * Given the Page itself rather than only its defaults, the factory also builds the rest of the frame:
 * the Page the tree returns and its Regions. Overlays need no Page and are there either way. The frame
 * does not take the Page row's `status` and `flags` the way Layouts and Widgets do: a Preset returns
 * its Page published whatever row it was handed, and a Region or Overlay that followed a draft row
 * would be the one part of a published tree that is not.
 */
export function createPhiCmsPresetNodes(page: PhiCmsPageNode): PhiCmsPresetPageNodes;
export function createPhiCmsPresetNodes(defaults: PhiCmsPresetNodeDefaults): PhiCmsPresetNodes;
export function createPhiCmsPresetNodes(
  defaults: PhiCmsPresetNodeDefaults | PhiCmsPageNode,
): PhiCmsPresetNodes | PhiCmsPresetPageNodes {
  const nodes = createPhiCmsPresetNodeSet(defaults);
  return "pageType" in defaults ? createPhiCmsPresetPageNodeSet(defaults, nodes) : nodes;
}

export type PhiCmsPresetNodes = ReturnType<typeof createPhiCmsPresetNodeSet>;
export type PhiCmsPresetPageNodes = ReturnType<typeof createPhiCmsPresetPageNodeSet>;

function createPhiCmsPresetNodeSet(defaults: PhiCmsPresetNodeDefaults) {
  const common = {
    siteId: defaults.siteId,
    visibilityMask: defaults.visibilityMask,
    status: defaults.status ?? PhiCmsStatus.Published,
    flags: defaults.flags ?? 0,
  };

  return {
    layout(input: PhiCmsPresetNodeInput<PhiCmsPresetLayoutInput>): PhiCmsLayoutNode {
      return buildPhiCmsLayoutNode({
        ...common,
        sortOrder: input.slotIndex,
        ...input,
      } as PhiCmsPresetLayoutInput);
    },
    widget(input: PhiCmsPresetNodeInput<PhiCmsPresetWidgetInput>): PhiCmsContentWidgetNode {
      return buildPhiCmsWidgetNode({
        ...common,
        sortOrder: input.slotIndex,
        contentId: null,
        ...input,
      } as PhiCmsPresetWidgetInput);
    },
    /**
     * Widgets stacked in one Layout, in the order they are written.
     *
     * Slots are counted for them, because a stack is a sequence and renumbering one by hand after
     * inserting something in the middle is exactly the kind of edit that goes wrong quietly.
     */
    stack(
      parentLayoutNodeId: PhiCmsInstanceId,
      entries: readonly Omit<
        PhiCmsPresetNodeInput<PhiCmsPresetWidgetInput>,
        "parentLayoutNodeId" | "slotIndex"
      >[],
      startAt = 0,
    ): PhiCmsContentWidgetNode[] {
      return entries.map((entry, index) => buildPhiCmsWidgetNode({
        ...common,
        contentId: null,
        parentLayoutNodeId,
        slotIndex: startAt + index,
        sortOrder: startAt + index,
        ...entry,
      } as PhiCmsPresetWidgetInput));
    },
    overlay(input: PhiCmsPresetOverlayInput): PhiCmsOverlayNode {
      const node = {
        id: input.id,
        overlayType: input.overlayType,
        headerLayoutNodeId: input.headerLayoutNodeId ?? null,
        bodyLayoutNodeId: input.bodyLayoutNodeId,
        footerPresentation: "none" as const,
        footerLayoutNodeId: null,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: defaults.visibilityMask,
        sortOrder: input.sortOrder,
        label: input.label,
        config: input.config,
      };
      return hasPhiCmsPresetOverlayFooter(input)
        ? {
            ...node,
            footerPresentation: input.footerPresentation,
            footerLayoutNodeId: input.footerLayoutNodeId,
          }
        : node;
    },
  };
}

function hasPhiCmsPresetOverlayFooter(
  input: PhiCmsPresetOverlayInput,
): input is Extract<PhiCmsPresetOverlayInput, { footerLayoutNodeId: PhiCmsInstanceId }> {
  return input.footerPresentation !== undefined && input.footerPresentation !== "none";
}

function createPhiCmsPresetPageNodeSet(page: PhiCmsPageNode, nodes: PhiCmsPresetNodes) {
  return {
    ...nodes,
    /** The Page the tree returns: the row it was built for, published, with what the Preset decides. */
    page(input: PhiCmsPresetPageInput = {}): PhiCmsPageNode {
      return { ...page, ...input, status: PhiCmsStatus.Published };
    },
    /** A Region of this Page. Preset Regions belong to no Area Preset row, so `areaPresetId` is null. */
    region(input: PhiCmsPresetRegionInput): PhiCmsRegionNode {
      return {
        id: input.id,
        pageId: page.id,
        areaPresetId: null,
        regionType: input.regionType,
        rootLayoutNodeId: input.rootLayoutNodeId,
        status: input.status ?? PhiCmsStatus.Published,
        flags: input.flags ?? 0,
        visibilityMask: input.visibilityMask ?? page.visibilityMask,
        sortOrder: input.sortOrder,
        config: input.config ?? {},
      };
    },
  };
}
