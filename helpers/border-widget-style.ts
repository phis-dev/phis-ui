import type { CSSProperties } from "react";

import type { PhiCmsBorderSource, PhiCmsBorderWidgetConfig } from "../types/cms-config";

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

/** The Site's own line: its border colour at its line width. One string, so nobody types a second. */
export const PHI_THEME_BORDER_LINE = "var(--ant-line-width, 1px) solid var(--ant-color-border)";

/**
 * The border style of something that states WHERE its line comes from.
 *
 * Line and corner both follow the source, and only `custom` reads what was configured. Switching to
 * `theme` is how somebody asks for the Site's own edge, so the Site has to answer with all of it -- a
 * `square` shape has to square the corners then and there, and a `pill` round them, rather than leaving
 * the radii of the custom border standing and looking as though the switch did nothing.
 *
 * `none` states `border: "none"` rather than saying nothing, because this style is laid over one that
 * may already carry a line. Silence there would leave the old line standing, which is exactly how "no
 * border" came to draw the border somebody had configured before switching it off. Its corners come
 * from the shape as well: an unoutlined box still has them, and they are the Site's to answer.
 */
export function resolvePhiSourcedBorderStyle(
  source: PhiCmsBorderSource,
  border: PhiCmsBorderWidgetConfig | null | undefined,
): PhiResolvedBorderWidgetStyle {
  if (source === "custom") {
    return resolvePhiBorderWidgetStyle(border);
  }
  return { border: source === "theme" ? PHI_THEME_BORDER_LINE : "none" };
}

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
