import type { CSSProperties, ReactNode } from "react";
import { PHI_FORM_GRID_TRACKS } from "../../types/form-descriptor";

import {
  PHI_LAYOUT_SURFACE_RADIUS,
  resolvePhiPaddingStyle,
  type PhiBaseLayoutSlotStates,
  type PhiBaseLayoutSlotState,
  type PhiLayoutKind,
  type PhiLayoutProps,
} from "./phi-layout-contract";
import type {
  PhiRenderableBlockCapabilities,
  PhiRenderableBlockRuntime,
  PhiRenderableBlockVisibility,
} from "../../types";
import { resolvePhiSurfaceStyle, type PhiSurfaceGround } from "../../helpers/surface-style";

export type PhiBaseLayoutProps = PhiLayoutProps & {
  blockId?: string | number | null;
  visibility?: PhiRenderableBlockVisibility;
  capabilities?: PhiRenderableBlockCapabilities;
  runtime?: PhiRenderableBlockRuntime;
  debugMode?: boolean;
  className?: string;
  margin?: CSSProperties["margin"];
  gap?: CSSProperties["gap"];
  slots?: ReactNode[];
  editSlotLabels?: ReactNode[];
  editSlotAction?: (
    slotIndex: number,
    options?: {
      defaultPickSection?: "layout" | "widget";
      allowWidgetSection?: boolean;
      slotIndex?: number;
    },
  ) => void;
  editSlotTitleAction?: (slotIndex: number, title: string) => void;
  layoutKind?: PhiLayoutKind;
  /** Shared Layout field: the grid line the label column inside this Layout ends at. */
  labelEnd?: number;
  editFrameBackground?: CSSProperties["background"];
  /** Drawn under the slots and over the Surface: an authoring guide, never part of the Layout's look. */
  underlay?: ReactNode;
  style?: CSSProperties;
};

export function resolvePhiBaseLayoutSlotState(
  initialSlotStates: PhiBaseLayoutSlotStates | undefined,
  slotIndex: number,
) {
  const candidate = Array.isArray(initialSlotStates)
    ? initialSlotStates[slotIndex]
    : initialSlotStates?.[slotIndex];

  return candidate === "collapsed" || candidate === "hidden" || candidate === "expanded"
    ? candidate
    : "expanded" as PhiBaseLayoutSlotState;
}

export function resolvePhiBaseLayoutSlotStates(
  slotCount: number,
  initialSlotStates?: PhiBaseLayoutSlotStates,
) {
  return Array.from({ length: slotCount }, (_, slotIndex) =>
    resolvePhiBaseLayoutSlotState(initialSlotStates, slotIndex),
  );
}

export function resolvePhiBaseLayoutChrome({
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  surface,
  labelEnd,
}: Pick<
  PhiBaseLayoutProps,
  | "labelEnd"
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "surface"
>): {
  style: CSSProperties;
  /** The layer the paint lives on when the box cannot carry it; render it as the box's first child. */
  ground: PhiSurfaceGround | null;
  hasExplicitLayoutBackground: boolean;
} {
  /*
   * A Layout is a surface, so a corner nobody stated is the Site's to answer -- the same step a Table and
   * a Tree take. A Layout without a Surface states no corner: there is no box there to round.
   */
  const resolvedSurface = resolvePhiSurfaceStyle(surface, { cornerFallback: PHI_LAYOUT_SURFACE_RADIUS });
  const style: CSSProperties = {
    ...resolvedSurface.style,
    ...resolvePhiPaddingStyle({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft }),
    /*
     * The label column, written the two ways it is read: as the grid line a descriptor form places its
     * labels on, and as the share of the width a labelled Control needs, which knows nothing of the
     * grid. Custom properties because they have to cross a server/client boundary -- a Layout renders on
     * the server and its slots arrive as already-rendered children, so nothing React carries gets there.
     *
     * Here rather than in one Layout, because every Layout resolves its chrome through this: a form or a
     * panel of labelled Controls can stand in any of them. It used to be a Layout kind of its own, which
     * bought nothing and gave the word "form" a second meaning beside the Widget.
     */
    ...(labelEnd == null ? {} : {
      "--phi-form-label-end": labelEnd,
      "--phi-labeled-control-label-width":
        `${Number((((labelEnd - 1) / PHI_FORM_GRID_TRACKS) * 100).toFixed(4))}%`,
      "--phi-labeled-control-width": "100%",
    } as CSSProperties),
  };
  return {
    style,
    ground: resolvedSurface.ground,
    hasExplicitLayoutBackground: resolvedSurface.paintsGround,
  };
}
