import type { CSSProperties, ReactNode } from "react";

import { PhiCmsFlags } from "../../constants/phi-cms";
import {
  resolvePhiAnchorWidgetPlacement,
  type PhiAnchorWidgetPlacement,
} from "../controls/phi-anchor-control-contract";
import type {
  PhiRenderableBlockRenderMode,
  PhiRenderableBlockAnchor,
  PhiRenderableBlockSize,
} from "../../types";
import { serializeRenderableBlock } from "../../helpers/renderable-block-serialization";
import { stripPhiLayoutDefaults } from "../../helpers/cms-layout-defaults";
import type { PhiShadow, PhiLayoutEffectId } from "../../types/layout-style";

type JsonRecord = Record<string, unknown>;

export type PhiLayoutProps = {
  size?: PhiRenderableBlockSize;
  minSize?: PhiRenderableBlockSize;
  maxSize?: PhiRenderableBlockSize;
  collapsedSizeHint?: PhiRenderableBlockSize;
  renderMode?: PhiRenderableBlockRenderMode;
  layoutKind?: PhiLayoutKind;
  enabled?: boolean;
  zIndex?: number;
  opacity?: number;
  effect?: PhiLayoutEffectId;
  shadow?: PhiShadow | null;
  flags?: number;
  initialSlotStates?: PhiBaseLayoutSlotStates;
  editRenderInsertControl?: PhiLayoutEditRenderInsertControl;
  editRenderTitleControl?: PhiLayoutEditRenderTitleControl;
  padding?: CSSProperties["padding"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingBottom?: CSSProperties["paddingBottom"];
  paddingLeft?: CSSProperties["paddingLeft"];
  background?: CSSProperties["background"];
  backgroundLayer?: ReactNode;
  border?: CSSProperties["border"];
  borderRadius?: CSSProperties["borderRadius"];
};

export type PhiLayoutEditInsertControl = {
  key?: string;
  presentation: "inline" | "overlay";
  slotIndex: number;
  label?: ReactNode;
  ariaLabel?: string;
  anchor?: PhiAnchorWidgetPlacement | null;
  slotRole?: "left" | "middle" | "right";
  inset?: {
    top?: CSSProperties["top"];
    right?: CSSProperties["right"];
    bottom?: CSSProperties["bottom"];
    left?: CSSProperties["left"];
  };
  onInsert: (slotIndex: number) => void;
};

export type PhiLayoutEditRenderInsertControl = (
  control: PhiLayoutEditInsertControl,
) => ReactNode;

export type PhiLayoutEditTitleControl = {
  value: string;
  ariaLabel?: string;
  style?: CSSProperties;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

export type PhiLayoutEditRenderTitleControl = (
  control: PhiLayoutEditTitleControl,
) => ReactNode;

export type PhiLayoutKind =
  | "flex"
  | "stack"
  | "grid"
  | "split"
  | "threecol"
  | "masonry"
  | "content"
  | "verticalflex"
  | "form"
  | "collapsible";
export type PhiLayoutSlotPolicy = "fill" | "hug" | "fill-inline" | "fill-block" | "fixed" | "intrinsic";

export const PhiLayoutFlags = PhiCmsFlags;

export type PhiLayoutFlag = (typeof PhiLayoutFlags)[keyof typeof PhiLayoutFlags];

export type PhiBaseLayoutSlotState = "expanded" | "collapsed" | "hidden";

export type PhiBaseLayoutSlotStates =
  | Array<PhiBaseLayoutSlotState | null | undefined>
  | Record<number, PhiBaseLayoutSlotState | null | undefined>;

export function hasPhiLayoutFlag(flags: number | null | undefined, flag: PhiLayoutFlag) {
  return ((flags ?? 0) & flag) === flag;
}

export function normalizePhiCssSize(value: number | string | undefined) {
  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function copyIfPresent(target: JsonRecord, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  target[key] = value;
}

export function serializePhiBaseLayoutConfig(value: unknown): JsonRecord {
  const normalized = isRecord(value) ? value : {};
  const next = serializeRenderableBlock(normalized);

  copyIfPresent(next, "padding", normalized.padding);
  copyIfPresent(next, "paddingTop", normalized.paddingTop);
  copyIfPresent(next, "paddingRight", normalized.paddingRight);
  copyIfPresent(next, "paddingBottom", normalized.paddingBottom);
  copyIfPresent(next, "paddingLeft", normalized.paddingLeft);
  copyIfPresent(next, "background", normalized.background);
  copyIfPresent(next, "border", normalized.border);
  copyIfPresent(next, "borderRadius", normalized.borderRadius);

  return next;
}

export function serializePhiBaseLayoutConfigWithDefaults<T extends JsonRecord>(
  value: unknown,
  defaults: JsonRecord,
  append: (next: JsonRecord, normalized: JsonRecord) => void,
) {
  const normalized = isRecord(value) ? value : {};
  const next = serializePhiBaseLayoutConfig(normalized);
  append(next, normalized);
  return stripPhiLayoutDefaults<T>(next as Partial<T>, defaults);
}

export function resolvePhiLayoutBoxStyle({
  size,
  minSize,
  maxSize,
}: Pick<PhiLayoutProps, "size" | "minSize" | "maxSize">): CSSProperties {
  const resolvedStyle: CSSProperties = {};

  const resolvedWidth = normalizePhiCssSize(size?.width ?? "100%");
  const resolvedHeight = normalizePhiCssSize(size?.height ?? "100%");
  const resolvedMinWidth = normalizePhiCssSize(minSize?.width ?? undefined);
  const resolvedMaxWidth = normalizePhiCssSize(maxSize?.width ?? undefined);
  const resolvedMinHeight = normalizePhiCssSize(minSize?.height ?? undefined);
  const resolvedMaxHeight = normalizePhiCssSize(maxSize?.height ?? undefined);

  if (resolvedWidth !== undefined) {
    resolvedStyle.width = resolvedWidth;
  }
  if (resolvedHeight !== undefined) {
    resolvedStyle.height = resolvedHeight;
  }
  if (resolvedMinWidth !== undefined) {
    resolvedStyle.minWidth = resolvedMinWidth;
  }
  if (resolvedMaxWidth !== undefined) {
    resolvedStyle.maxWidth = resolvedMaxWidth;
  }
  if (resolvedMinHeight !== undefined) {
    resolvedStyle.minHeight = resolvedMinHeight;
  }
  if (resolvedMaxHeight !== undefined) {
    resolvedStyle.maxHeight = resolvedMaxHeight;
  }

  return resolvedStyle;
}

export function resolvePhiLayoutStyle({
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  background,
  border,
  borderRadius,
}: Pick<
  PhiLayoutProps,
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "background"
  | "border"
  | "borderRadius"
>): CSSProperties {

  const resolvedBorderRadius = normalizePhiCssSize(borderRadius);

  return {
    ...(background == null ? {} : { background }),
    ...(border == null
      ? {}
      : {
          border,
        }),
    ...(resolvedBorderRadius == null ? {} : { borderRadius: resolvedBorderRadius }),
    ...resolvePhiPaddingStyle({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft }),
  };
}

export function resolvePhiPaddingStyle({
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
}: Pick<
  PhiLayoutProps,
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
>): CSSProperties {
  const resolvedPadding = normalizePhiCssSize(padding);

  return {
    ...(resolvedPadding == null
      ? {}
      : {
          paddingTop: resolvedPadding,
          paddingRight: resolvedPadding,
          paddingBottom: resolvedPadding,
          paddingLeft: resolvedPadding,
        }),
    ...(paddingTop == null ? {} : { paddingTop: normalizePhiCssSize(paddingTop) }),
    ...(paddingRight == null ? {} : { paddingRight: normalizePhiCssSize(paddingRight) }),
    ...(paddingBottom == null ? {} : { paddingBottom: normalizePhiCssSize(paddingBottom) }),
    ...(paddingLeft == null ? {} : { paddingLeft: normalizePhiCssSize(paddingLeft) }),
  };
}

export function resolvePhiLayoutInset({
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
}: Pick<
  PhiLayoutProps,
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
>): Pick<CSSProperties, "top" | "right" | "bottom" | "left"> {
  const resolvedPadding = normalizePhiCssSize(padding);

  return {
    top: paddingTop == null ? resolvedPadding ?? 0 : normalizePhiCssSize(paddingTop) ?? 0,
    right: paddingRight == null ? resolvedPadding ?? 0 : normalizePhiCssSize(paddingRight) ?? 0,
    bottom: paddingBottom == null ? resolvedPadding ?? 0 : normalizePhiCssSize(paddingBottom) ?? 0,
    left: paddingLeft == null ? resolvedPadding ?? 0 : normalizePhiCssSize(paddingLeft) ?? 0,
  };
}

export function resolvePhiAnchorPlacement(
  anchor?: PhiRenderableBlockAnchor | null,
): PhiAnchorWidgetPlacement | null {
  return resolvePhiAnchorWidgetPlacement(anchor);
}

export function resolvePhiFlexAxisAlignment(
  anchor: PhiAnchorWidgetPlacement | null | undefined,
  vertical: boolean,
): Pick<CSSProperties, "justifyContent" | "alignItems"> {
  if (anchor == null) {
    return {
      justifyContent: "flex-start",
      alignItems: "stretch",
    };
  }

  const anchoredAlignment = vertical
    ? {
        justifyContent:
          anchor === "topLeft" || anchor === "top" || anchor === "topRight"
            ? "flex-start"
            : anchor === "bottomLeft" || anchor === "bottom" || anchor === "bottomRight"
              ? "flex-end"
              : "center",
        alignItems:
          anchor === "topLeft" || anchor === "left" || anchor === "bottomLeft"
            ? "flex-start"
            : anchor === "topRight" || anchor === "right" || anchor === "bottomRight"
              ? "flex-end"
              : "center",
      }
    : {
        justifyContent:
          anchor === "topLeft" || anchor === "left" || anchor === "bottomLeft"
            ? "flex-start"
            : anchor === "topRight" || anchor === "right" || anchor === "bottomRight"
              ? "flex-end"
              : "center",
        alignItems:
          anchor === "topLeft" || anchor === "top" || anchor === "topRight"
            ? "flex-start"
            : anchor === "bottomLeft" || anchor === "bottom" || anchor === "bottomRight"
              ? "flex-end"
              : "center",
      };

  return {
    justifyContent: anchoredAlignment.justifyContent,
    alignItems: anchoredAlignment.alignItems,
  };
}
