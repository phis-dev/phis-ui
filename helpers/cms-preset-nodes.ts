import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "./cms-node-factories";
import { PhiCmsStatus } from "../constants/phi-cms";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutNode } from "../types/cms";
import type { PhiCmsInstanceId } from "../types/cms-instance-id";

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
 */
export function createPhiCmsPresetNodes(defaults: PhiCmsPresetNodeDefaults) {
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
  };
}
