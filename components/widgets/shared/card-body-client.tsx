"use client";

import type { CSSProperties, ReactNode } from "react";

import { PhiButtonControl } from "../../controls/phi-button-control";
import { PhiImageControl, type PhiImageControlSource } from "../../controls/phi-image-control";
import { PhiStatisticControl } from "../../controls/phi-statistic-control";
import { PhiTypographyControl } from "../../controls/phi-typography-control";
import type { PhiImagePresentation } from "../../media/image-presentation";
import { PhiLink } from "../../navigation/phi-link";
import { usePhiConfig } from "../../root/phi-config-provider";
import { PhiIcon } from "../../shell/phi-icon";
import { PhiSurfaceGroundLayer } from "../../surface/phi-surface-ground";
import { PhiSurfaceTone } from "../../surface/phi-surface-tone";
import { combinePhiBoxShadows } from "../../../helpers/layout-style";
import { resolvePhiSurfaceStyle } from "../../../helpers/surface-style";
import type { PhiClientBlockBaseProps } from "../../../types";
import type { PhiSurface } from "../../../types/surface";
import type {
  PhiCardHeadingLevel,
  PhiCardHoverEffect,
  PhiCardIconPlacement,
  PhiCardTextAlign,
  PhiCardWidgetBody,
} from "./card-vocabulary";

export type {
  PhiCardHeadingLevel,
  PhiCardHoverEffect,
  PhiCardIconPlacement,
  PhiCardTextAlign,
  PhiCardWidgetBody,
} from "./card-vocabulary";

export type PhiCardWidgetClientLabels = {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
  /** The figure a `stat` body draws. Data rather than copy, and never translated. */
  value?: string;
};

/**
 * What is true about a card's content right now, as opposed to what the card says.
 *
 * Handed in, never decided here (`design/STATE_MACHINES.md`: a Widget "presents a state it was given"):
 * whether the content is still coming, and whether it failed. It never travels in `config`.
 */
export type PhiCardWidgetClientBinding = {
  loading?: boolean;
  error?: string | null;
};

/** The card's picture, already resolved: which bytes, how they are framed, how they may arrive. */
export type PhiCardWidgetImage = {
  presentation: PhiImagePresentation;
  source: PhiImageControlSource;
  alt: string;
  blurDataUrl?: string | null;
  optimizable?: boolean;
};

export type PhiCardWidgetClientConfig = {
  surface?: PhiSurface | null;
  image?: PhiCardWidgetImage | null;
  iconName?: string;
  iconPlacement?: PhiCardIconPlacement;
  textAlign?: PhiCardTextAlign;
  headingLevel?: PhiCardHeadingLevel;
  /** Where the whole card leads, already resolved to an address. */
  href?: string;
  newTab?: boolean;
  external?: boolean;
  actionHref?: string;
  actionNewTab?: boolean;
  /** Size and weight: insets, type sizes, the button's size. */
  variant?: "default" | "compact" | "featured";
  body?: PhiCardWidgetBody;
  highlight?: boolean;
  hoverEffect?: PhiCardHoverEffect;
};

export type PhiCardWidgetClientProps = PhiClientBlockBaseProps<
  PhiCardWidgetClientLabels,
  PhiCardWidgetClientConfig
> & {
  binding?: PhiCardWidgetClientBinding;
};

/** The box a picture is shown in takes the picture's own proportion; 3:2 where nothing is known. */
function resolveMediaAspectRatio(presentation: PhiImagePresentation) {
  return presentation.width && presentation.height
    ? `${presentation.width} / ${presentation.height}`
    : "3 / 2";
}

export function PhiCardWidgetClient({
  labels,
  config,
  binding,
}: PhiCardWidgetClientProps) {
  const { token } = usePhiConfig();
  const variant = config?.variant ?? "default";
  const body = config?.body ?? "text";
  const textAlign = config?.textAlign ?? "start";
  const headingLevel = config?.headingLevel ?? "h3";
  const iconPlacement = config?.iconPlacement ?? "inline";
  const highlight = config?.highlight === true;
  const href = config?.href;
  const hoverEffect = href ? config?.hoverEffect ?? "none" : "none";
  const hasAction = Boolean(config?.actionHref && labels.actionLabel);
  const image = config?.image?.presentation.url ? config.image : null;
  const iconName = config?.iconName;

  /*
   * The card's own Surface, drawn by the card: its picture moves inside the box under the pointer, so
   * the ground goes on a layer the zoom can scale when the card zooms.
   */
  const surface = resolvePhiSurfaceStyle(config?.surface, {
    cornerFallback: "var(--phi-surface-radius, 0)",
    forceGroundLayer: hoverEffect === "zoom",
  });
  const inset = variant === "compact" ? token.paddingSM : variant === "featured" ? token.paddingMD : token.padding;
  const gap = variant === "compact" ? token.paddingXS : token.paddingSM;
  const headingSize = variant === "featured"
    ? token.fontSizeHeading3
    : variant === "compact"
      ? token.fontSizeHeading5
      : token.fontSizeHeading4;
  const iconSize = variant === "compact" ? 20 : 24;
  const topIconSize = variant === "compact" ? 32 : variant === "featured" ? 48 : 40;
  const justify = textAlign === "center" ? "center" : textAlign === "end" ? "flex-end" : "flex-start";

  /*
   * The whole card is the link, and the link is still one element: the heading's anchor reaches over the
   * box (`.phi-card__link::after`), so a reader can click anywhere while a screen reader hears one link
   * named by the heading. The action button stands above that reach, so it stays a button of its own and
   * is never a link inside a link.
   */
  const linked = (content: ReactNode) => href ? (
    <PhiLink
      href={href}
      newTab={config?.newTab}
      external={config?.external}
      className="phi-card__link"
      style={{ color: "inherit" }}
    >
      {content}
    </PhiLink>
  ) : content;

  const heading = labels.title ? (
    <PhiTypographyControl
      presentation="title"
      level={Number(headingLevel.slice(1)) as 2 | 3 | 4}
      style={{ margin: 0, fontSize: headingSize, color: token.colorTextHeading }}
    >
      {linked(labels.title)}
    </PhiTypographyControl>
  ) : null;

  const iconMark = (size: number, framed: number) => iconName ? (
    <span
      aria-hidden="true"
      className="phi-card__icon"
      style={{
        display: "inline-flex",
        flex: "none",
        alignItems: "center",
        justifyContent: "center",
        width: framed,
        height: framed,
        borderRadius: token.borderRadius,
        background: token.colorFillQuaternary,
        color: highlight ? token.colorPrimary : token.colorTextSecondary,
      }}
    >
      <PhiIcon name={iconName} size={size} />
    </span>
  ) : null;

  /*
   * A failure stands where the figure would, at body size, because a sentence in figure type is
   * unreadable. A card whose figure is the only thing it has makes the figure the link.
   */
  const figure = (
    <PhiStatisticControl
      value={binding?.error ?? labels.value ?? ""}
      loading={binding?.loading ?? false}
      styles={{
        content: binding?.error
          ? { color: token.colorError, fontSize: token.fontSize }
          : { color: highlight ? token.colorPrimary : token.colorTextHeading },
      }}
    />
  );

  const headingRow = iconPlacement === "inline" && iconName ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: justify, gap }}>
      {iconMark(iconSize, iconSize + 16)}
      {heading}
    </div>
  ) : heading;

  const media = image ? (
    <div
      className="phi-card__media"
      style={{ position: "relative", aspectRatio: resolveMediaAspectRatio(image.presentation), overflow: "hidden" }}
    >
      <PhiImageControl
        presentation={image.presentation}
        source={image.source}
        alt={image.alt}
        blurDataUrl={image.blurDataUrl}
        optimizable={image.optimizable}
        style={{ width: "100%", height: "100%" }}
        imageStyle={{ width: "100%", height: "100%" }}
      />
      {iconPlacement === "top" && iconName ? (
        <span
          aria-hidden="true"
          className="phi-card__icon"
          style={{
            position: "absolute",
            insetInlineStart: textAlign === "start" ? inset : textAlign === "end" ? undefined : "50%",
            insetInlineEnd: textAlign === "end" ? inset : undefined,
            top: "50%",
            translate: textAlign === "center" ? "-50% -50%" : "0 -50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: topIconSize + 24,
            height: topIconSize + 24,
            borderRadius: "50%",
            // A ground of its own, so the mark reads on a bright picture and on a dark one alike.
            background: `color-mix(in srgb, ${token.colorBgContainer} 88%, transparent)`,
            color: highlight ? token.colorPrimary : token.colorText,
            boxShadow: token.boxShadowTertiary,
          }}
        >
          <PhiIcon name={iconName} size={topIconSize} />
        </span>
      ) : null}
    </div>
  ) : null;

  const boxStyle: CSSProperties = {
    ...surface.style,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
    textAlign,
    color: token.colorText,
    // A highlighted card keeps its ring, which is a line rather than depth.
    ...(highlight
      ? { boxShadow: combinePhiBoxShadows(surface.style.boxShadow, `inset 0 0 0 1px ${token.colorPrimary}`) }
      : {}),
  };

  const content = (
    <>
      {media}
      <div style={{ display: "grid", gap, padding: inset, justifyItems: justify }}>
        {iconPlacement === "top" && iconName && !image ? iconMark(topIconSize, topIconSize + 24) : null}
        {labels.eyebrow ? (
          <PhiTypographyControl
            type="secondary"
            style={{
              fontSize: token.fontSizeSM,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: highlight ? token.colorPrimary : token.colorTextTertiary,
            }}
          >
            {labels.eyebrow}
          </PhiTypographyControl>
        ) : null}
        {headingRow}
        {body === "stat" ? (labels.title ? figure : linked(figure)) : null}
        {labels.description ? (
          <PhiTypographyControl
            presentation="paragraph"
            style={{
              marginBottom: 0,
              color: token.colorTextSecondary,
              fontSize: variant === "compact" ? token.fontSize : token.fontSizeLG,
            }}
          >
            {labels.description}
          </PhiTypographyControl>
        ) : null}
        {labels.meta ? (
          <PhiTypographyControl type="secondary" style={{ fontSize: token.fontSizeSM, color: token.colorTextTertiary }}>
            {labels.meta}
          </PhiTypographyControl>
        ) : null}
        {hasAction ? (
          <div className="phi-card__action">
            <PhiButtonControl
              type={highlight ? "primary" : "default"}
              size={variant === "compact" ? "small" : "medium"}
              href={config!.actionHref}
              newTab={config?.actionNewTab}
              label={labels.actionLabel}
            />
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      className={[
        "phi-card",
        href ? "phi-card--link" : null,
        hoverEffect !== "none" ? `phi-card--hover-${hoverEffect}` : null,
        surface.className,
      ].filter(Boolean).join(" ")}
      data-phi-card-variant={variant}
      style={boxStyle}
    >
      <PhiSurfaceGroundLayer ground={surface.ground} className="phi-card__ground" />
      {surface.className ? <PhiSurfaceTone tone={config?.surface?.tone}>{content}</PhiSurfaceTone> : content}
    </article>
  );
}
