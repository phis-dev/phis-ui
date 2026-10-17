import {
  buildPhiCmsLayoutNode,
  buildPhiCmsWidgetNode,
  type PhiCmsWidgetNodeFactoryCommon,
  type PhiCmsWidgetPlacementFields,
} from "./cms-node-factories";
import { PhiCmsStatus } from "../constants/phi-cms";
import { PHI_DIALOG_BODY_CONFIG, PHI_DIALOG_COMMANDS_CONFIG, PHI_DIALOG_WIDTH } from "./cms-dialog";
import type { PhiCommandToolbarWidgetPlacement } from "../types/core-widget-placements";
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

type PhiCmsPresetNodeInput<TInput> = Omit<
  TInput,
  "siteId" | "visibilityMask" | "status" | "flags" | "sortOrder"
> & Partial<Pick<TInput & { sortOrder?: number }, "sortOrder">> & {
  status?: number;
  flags?: number;
};

/** A Widget placement in a Preset: typed by its type key, like `buildPhiCmsWidgetNode`. */
type PhiCmsPresetWidgetInput<
  TTypeKey extends string,
  TPluginKey extends string | undefined = undefined,
> = PhiCmsPresetNodeInput<PhiCmsWidgetNodeFactoryCommon> &
  PhiCmsWidgetPlacementFields<TTypeKey, TPluginKey>;

/**
 * An entry of a stack. It names no `pluginKey`: the type keys of a stack are read as one tuple, and a
 * second tuple beside it stops the compiler from reading either -- every config would pass unchecked.
 * A Widget of another Module is placed with `widget`.
 */
type PhiCmsPresetStackEntry<TTypeKey extends string> = Omit<
  PhiCmsPresetNodeInput<PhiCmsWidgetNodeFactoryCommon>,
  "parentLayoutNodeId" | "slotIndex"
> & PhiCmsWidgetPlacementFields<TTypeKey>;

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

/**
 * A dialog: the Overlay, its body, and -- where it has actions -- its footer and their Command Toolbar.
 *
 * What it decides is what differs between dialogs: its ids, its title and wiring, what extra the body
 * Layout carries (a form's label column, say), and its buttons. How the body and the actions look is the
 * one answer every dialog shares (`helpers/cms-dialog.ts`), so it is not an input.
 */
export type PhiCmsPresetDialogInput = {
  id: PhiCmsInstanceId;
  bodyLayoutNodeId: PhiCmsInstanceId;
  sortOrder: number;
  label: string | null;
  /** The Overlay's config: title, mount and close policy, open action, routes. `width` defaults. */
  config: Record<string, unknown>;
  headerLayoutNodeId?: PhiCmsInstanceId | null;
  /** Config the body Layout carries besides the dialog's own: anything but its gap, padding and ground. */
  body?: { label?: string; config?: Record<string, unknown> };
  /** The actions, where the dialog has any. */
  commands?: {
    footerLayoutNodeId: PhiCmsInstanceId;
    widgetId: PhiCmsInstanceId;
    label: string;
    flags?: number;
    config: Omit<PhiCommandToolbarWidgetPlacement, "compact" | "showLabels" | "controlSize">;
  };
};

/** The two things a Preset changes about the Page row it was built for; everything else is kept. */
export type PhiCmsPresetPageInput = Partial<Pick<PhiCmsPageNode, "pageType" | "layoutConfig">>;

/**
 * The parts of a node that a Preset repeats rather than decides.
 *
 * A placement is four things -- what it is, where it sits, what it is called, how it is configured --
 * and it was written as eleven, because `siteId`, `visibilityMask`, `status`, `flags`, `contentVersionId` and
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
    widget<TTypeKey extends string, TPluginKey extends string | undefined = undefined>(
      input: PhiCmsPresetWidgetInput<TTypeKey, TPluginKey>,
    ): PhiCmsContentWidgetNode {
      return buildPhiCmsWidgetNode<TTypeKey, TPluginKey>({
        ...common,
        sortOrder: input.slotIndex,
        ...input,
      });
    },
    /**
     * Widgets stacked in one Layout, in the order they are written.
     *
     * Slots are counted for them, because a stack is a sequence and renumbering one by hand after
     * inserting something in the middle is exactly the kind of edit that goes wrong quietly.
     */
    stack<const TTypeKeys extends readonly string[]>(
      parentLayoutNodeId: PhiCmsInstanceId,
      entries: { [TIndex in keyof TTypeKeys]: PhiCmsPresetStackEntry<TTypeKeys[TIndex]> },
      startAt = 0,
    ): PhiCmsContentWidgetNode[] {
      const stacked = entries as readonly PhiCmsPresetStackEntry<string>[];
      return stacked.map((entry, index) => buildPhiCmsWidgetNode({
        ...common,
        parentLayoutNodeId,
        slotIndex: startAt + index,
        sortOrder: startAt + index,
        ...entry,
      }));
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
    /**
     * A dialog in one call (`PhiCmsPresetDialogInput`): the nodes it is made of, for the tree's
     * `overlays`, `layoutNodes` and `contentWidgets`. The widgets of the body are the Preset's own, placed
     * in `bodyLayoutNodeId` from slot 0.
     */
    dialog(input: PhiCmsPresetDialogInput) {
      const body = this.layout({
        typeKey: "flex-vertical",
        id: input.bodyLayoutNodeId,
        parentLayoutNodeId: null,
        slotIndex: 0,
        label: input.body?.label ?? `${input.label ?? "dialog"} body`,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        config: { ...input.body?.config, ...PHI_DIALOG_BODY_CONFIG },
      });
      const config = { width: PHI_DIALOG_WIDTH, ...input.config };
      const commands = input.commands;
      if (!commands) {
        return {
          overlay: this.overlay({
            id: input.id,
            overlayType: "modal",
            headerLayoutNodeId: input.headerLayoutNodeId ?? null,
            bodyLayoutNodeId: input.bodyLayoutNodeId,
            sortOrder: input.sortOrder,
            label: input.label,
            config,
          }),
          layouts: [body],
          widgets: [] as PhiCmsContentWidgetNode[],
        };
      }
      return {
        overlay: this.overlay({
          id: input.id,
          overlayType: "modal",
          headerLayoutNodeId: input.headerLayoutNodeId ?? null,
          bodyLayoutNodeId: input.bodyLayoutNodeId,
          footerPresentation: "actions",
          footerLayoutNodeId: commands.footerLayoutNodeId,
          sortOrder: input.sortOrder,
          label: input.label,
          config,
        }),
        layouts: [
          body,
          this.layout({
            typeKey: "flex",
            id: commands.footerLayoutNodeId,
            parentLayoutNodeId: null,
            slotIndex: 0,
            label: `${input.label ?? "dialog"} footer`,
            creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
            config: {},
          }),
        ],
        widgets: [this.widget({
          typeKey: "command-toolbar",
          id: commands.widgetId,
          parentLayoutNodeId: commands.footerLayoutNodeId,
          slotIndex: 0,
          label: commands.label,
          ...(commands.flags == null ? {} : { flags: commands.flags }),
          config: { ...commands.config, ...PHI_DIALOG_COMMANDS_CONFIG },
        })],
      };
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
