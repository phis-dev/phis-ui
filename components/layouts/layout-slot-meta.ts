import type { PhiCmsLayoutRenderNode } from "../../types/cms";
import { comparePhiCmsInstanceIds } from "../../types/cms-instance-id";

export type PhiLayoutSlotDefinition = {
  key: string;
  label: string;
  slotIndex: number;
};

/**
 * What the pager Widgets are told a slotted Layout holds.
 *
 * Only the filled slots, named the way the person who filled them named them, because a Segmented
 * offering twelve entries for three pictures would be a list of mostly nothing. Carousel and Stack
 * carried this word for word; the slot table is the one thing that differs.
 */
export function resolvePhiLayoutSlotMeta(
  node: PhiCmsLayoutRenderNode,
  slots: readonly PhiLayoutSlotDefinition[],
) {
  const labelsBySlotIndex = new Map<number, string>();
  const occupiedSlotIndices = new Set<number>();
  const children = [
    ...(node.childLayouts ?? []).map((child) => ({ ...child, _kindOrder: 0 })),
    ...(node.childWidgets ?? []).map((child) => ({ ...child, _kindOrder: 1 })),
  ].sort((left, right) =>
    left.slotIndex - right.slotIndex ||
    left.sortOrder - right.sortOrder ||
    left._kindOrder - right._kindOrder ||
    comparePhiCmsInstanceIds(left.id, right.id));

  for (const child of children) {
    occupiedSlotIndices.add(child.slotIndex);
    const label = child.label?.trim();
    if (label && !labelsBySlotIndex.has(child.slotIndex)) {
      labelsBySlotIndex.set(child.slotIndex, label);
    }
  }

  return slots
    .filter((slot) => occupiedSlotIndices.has(slot.slotIndex))
    .map((slot) => ({
      key: slot.key,
      label: labelsBySlotIndex.get(slot.slotIndex) ?? slot.label,
      slotIndex: slot.slotIndex,
      hasContent: true,
    }));
}
