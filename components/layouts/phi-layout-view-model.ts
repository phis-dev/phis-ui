import type { CSSProperties, ReactNode } from "react";

import {
  resolvePhiLayoutStyle,
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
import {
  combinePhiBoxShadows,
  composePhiLayoutEffectStyle,
  resolvePhiShadow,
  resolvePhiLayoutEffectStyle,
} from "../../helpers/layout-style";

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
  editFrameBackground?: CSSProperties["background"];
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
  background,
  border,
  borderRadius,
  effect,
  shadow,
}: Pick<
  PhiBaseLayoutProps,
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "background"
  | "border"
  | "borderRadius"
  | "effect"
  | "shadow"
>) {
  const layoutStyle = resolvePhiLayoutStyle({
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    background,
    border,
    borderRadius,
  });
  const effectStyle = resolvePhiLayoutEffectStyle({
    effect,
    background: layoutStyle.background,
  });
  const resolvedBoxShadow = combinePhiBoxShadows(effectStyle?.boxShadow, resolvePhiShadow(shadow));
  const style: CSSProperties = {
    ...composePhiLayoutEffectStyle(layoutStyle, effectStyle),
    ...(resolvedBoxShadow == null ? {} : { boxShadow: resolvedBoxShadow }),
  };
  const hasExplicitLayoutBackground =
    style.background != null ||
    style.backgroundColor != null ||
    style.backgroundImage != null;

  return { style, hasExplicitLayoutBackground };
}
