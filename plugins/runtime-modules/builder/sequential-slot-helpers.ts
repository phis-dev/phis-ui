import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import { comparePhiCmsInstanceIds } from "../../../types/cms-instance-id";

type PhiCmsSequentialChildNode =
  | (PhiCmsLayoutRenderNode & { kind: "layout" })
  | (PhiCmsContentWidgetNode & { kind: "widget" });

export function isPhiCmsSequentialLayoutSlots(
  slots: readonly { sequential?: boolean }[] | null | undefined,
) {
  return Array.isArray(slots) && slots.length > 0 && slots.every((slot) => slot.sequential === true);
}

export function compactPhiCmsSequentialChildren({
  childLayouts,
  childWidgets,
}: {
  childLayouts: PhiCmsLayoutRenderNode[];
  childWidgets: PhiCmsContentWidgetNode[];
}) {
  const orderedChildren: PhiCmsSequentialChildNode[] = [
    ...childLayouts.map((child) => ({ ...child, kind: "layout" as const })),
    ...childWidgets.map((child) => ({ ...child, kind: "widget" as const })),
  ].sort((left, right) =>
    left.slotIndex - right.slotIndex ||
    left.sortOrder - right.sortOrder ||
    comparePhiCmsInstanceIds(left.id, right.id));

  return orderedChildren.reduce(
    (next, child, slotIndex) => {
      if (child.kind === "layout") {
        next.childLayouts.push({
          ...child,
          slotIndex,
          sortOrder: Math.max(0, child.sortOrder),
        });
        return next;
      }

      next.childWidgets.push({
        ...child,
        slotIndex,
        sortOrder: Math.max(0, child.sortOrder),
      });
      return next;
    },
    {
      childLayouts: [] as PhiCmsLayoutRenderNode[],
      childWidgets: [] as PhiCmsContentWidgetNode[],
    },
  );
}
