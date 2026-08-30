import type { CSSProperties, ReactNode } from "react";

import type { PhiBaseLayoutProps } from "./phi-layout-view-model";
import type { PhiRenderableBlockAnchor } from "../../types";
import type { PhiAnchorWidgetPlacement } from "../controls/phi-anchor-control-contract";
import type { PhiResponsiveValue } from "../../types/responsive";

export type PhiGridLayoutSlotPlacement = {
  slotIndex: number;
  span?: PhiResponsiveValue<number>;
  offset?: PhiResponsiveValue<number>;
};

export type PhiGridLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  gap?: CSSProperties["gap"];
  columnGap?: CSSProperties["columnGap"];
  slotPlacements?: PhiGridLayoutSlotPlacement[];
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  anchor?: PhiRenderableBlockAnchor;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  wrap?: boolean | CSSProperties["flexWrap"];
  slotStyle?: CSSProperties;
};

export function resolvePhiGridSlotPlacement(
  slotPlacements: PhiGridLayoutSlotPlacement[] | undefined,
  slotIndex: number,
  profile: "compact" | "medium" | "wide",
  fallbackSpan: number,
) {
  const placement = slotPlacements?.find((candidate) => candidate.slotIndex === slotIndex);
  const span = placement?.span?.[profile] ?? (profile === "wide"
    ? placement?.span?.medium ?? placement?.span?.compact
    : profile === "medium"
      ? placement?.span?.compact
      : undefined) ?? fallbackSpan;
  const offset = placement?.offset?.[profile] ?? (profile === "wide"
    ? placement?.offset?.medium ?? placement?.offset?.compact
    : profile === "medium"
      ? placement?.offset?.compact
      : undefined) ?? 0;
  return { span, offset };
}
