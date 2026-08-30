import type { CSSProperties } from "react";

import type { PhiCmsBorderWidgetConfig } from "../types/cms-config";

export type PhiResolvedBorderWidgetStyle = Pick<
  CSSProperties,
  | "border"
  | "borderTopLeftRadius"
  | "borderTopRightRadius"
  | "borderBottomLeftRadius"
  | "borderBottomRightRadius"
>;

type PhiBorderWidgetStyleFallback = {
  border?: CSSProperties["border"] | null;
  borderRadius?: number | string | null;
};

export function resolvePhiBorderWidgetStyle(
  border: PhiCmsBorderWidgetConfig | null | undefined,
  fallback?: PhiBorderWidgetStyleFallback,
): PhiResolvedBorderWidgetStyle {
  const resolvedFallbackBorder = fallback?.border ?? undefined;
  const resolvedFallbackRadius = fallback?.borderRadius ?? undefined;
  const hasExplicitBorder =
    border != null &&
    (border.borderWidth != null || border.borderStyle != null || border.borderColor != null);
  const resolvedBorder = hasExplicitBorder
    ? border!.borderStyle === "none"
      ? "none"
      : `${border!.borderWidth ?? 1}px ${border!.borderStyle ?? "solid"} ${border!.borderColor ?? "transparent"}`
    : resolvedFallbackBorder;
  const resolveRadius = (value?: number | string | null) =>
    value ?? resolvedFallbackRadius ?? undefined;

  return {
    ...(resolvedBorder == null ? {} : { border: resolvedBorder }),
    ...(resolveRadius(border?.borderTopLeftRadius) == null
      ? {}
      : { borderTopLeftRadius: resolveRadius(border?.borderTopLeftRadius) }),
    ...(resolveRadius(border?.borderTopRightRadius) == null
      ? {}
      : { borderTopRightRadius: resolveRadius(border?.borderTopRightRadius) }),
    ...(resolveRadius(border?.borderBottomRightRadius) == null
      ? {}
      : { borderBottomRightRadius: resolveRadius(border?.borderBottomRightRadius) }),
    ...(resolveRadius(border?.borderBottomLeftRadius) == null
      ? {}
      : { borderBottomLeftRadius: resolveRadius(border?.borderBottomLeftRadius) }),
  };
}
