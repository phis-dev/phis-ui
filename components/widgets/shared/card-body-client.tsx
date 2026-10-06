"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

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
import { resolvePhiSurfaceStyle } from "../../../helpers/surface-style";
import type { PhiClientBlockBaseProps } from "../../../types";
import type { PhiSurface } from "../../../types/surface";
import type { PhiSignalRouteSet } from "../../../types/signals";
import { usePhiControlSignalController } from "../client/shared/phi-control-signals";
import type { PhiThemeTokens } from "../../../theme/phi-theme-tokens";
import type {
  PhiCardHeadingLevel,
  PhiCardHoverEffect,
  PhiCardIconPlacement,
  PhiCardTextAlign,
  PhiCardTextSlot,
  PhiCardVariant,
  PhiCardWidgetBody,
} from "./card-vocabulary";

export type {
  PhiCardHeadingLevel,
  PhiCardHoverEffect,
  PhiCardIconPlacement,
  PhiCardTextAlign,
  PhiCardTextSlot,
  PhiCardVariant,
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
  /** The icon's colour and its ground; absent, the Theme's. */
  iconColor?: string;
  iconBackground?: string;
  textAlign?: PhiCardTextAlign;
  headingLevel?: PhiCardHeadingLevel;
  /** Where the whole card leads, already resolved to an address. */
  href?: string;
  newTab?: boolean;
  external?: boolean;
  /**
   * The action button, when the card draws one. Present is drawn; its address is absent where none is
   * known yet -- on the canvas, which cannot resolve a Page and must not navigate anyway.
   */
  action?: PhiCardWidgetAction | null;
  /** How the card is set: insets, type sizes, the button's size. */
  variant?: PhiCardVariant;
  body?: PhiCardWidgetBody;
  highlight?: boolean;
  hoverEffect?: PhiCardHoverEffect;
  /** The card's wired signals (`PHI_CARD_SIGNALS`); absent where nothing is wired, as on the canvas. */
  signalRoutes?: PhiSignalRouteSet | null;
};

/* What arrived by signal, standing over what the card was placed with until the page is left. */
type PhiCardSignalOverrides = Partial<Record<PhiCardTextSlot, string>> & {
  loading?: boolean;
  highlight?: boolean;
};

const PHI_CARD_SIGNAL_TEXT_SLOTS: ReadonlySet<string> = new Set(["eyebrow", "title", "description", "meta", "value"]);

export type PhiCardWidgetAction = {
  href?: string;
  newTab?: boolean;
  external?: boolean;
  icon?: string;
  /** The button's name where it shows only its icon. */
  ariaLabel?: string;
};

export type PhiCardWidgetClientProps = PhiClientBlockBaseProps<
  PhiCardWidgetClientLabels,
  PhiCardWidgetClientConfig
> & {
  binding?: PhiCardWidgetClientBinding;
  /**
   * What stands in a text's place instead of the text, for an editor that edits it there. Asked for
   * every slot, the empty ones included: what it returns is drawn in the slot's type, and `null` leaves
   * the slot out as an empty text would be left out.
   */
  renderText?: (slot: PhiCardTextSlot, text: string | undefined) => ReactNode;
};

/* Lengths as the Theme states them, which is a number or a CSS length. */
type PhiCardVariantMetrics = {
  inset: number;
  gap: number;
  headingSize: number | string;
  descriptionSize: number | string;
  iconSize: number;
  topIconSize: number;
  buttonSize: "small" | "medium";
  /**
   * The picture's box, where a variant sets it rather than the picture's own proportion. The picture is
   * cropped into it around its focal point.
   */
  mediaAspectRatio?: string;
  /** The eyebrow on the picture's top-start corner rather than above the heading, where there is one. */
  eyebrowOnMedia?: true;
  /** Where a variant that is an arrangement puts things, over what the card states. */
  arrangement?: { textAlign: PhiCardTextAlign; iconPlacement: PhiCardIconPlacement };
};

/*
 * What each variant sets, in one row per variant. A further variant -- a featured card -- is a row here
 * and an entry in `PHI_CARD_VARIANTS`.
 */
const PHI_CARD_VARIANT_METRICS: Record<PhiCardVariant, (token: PhiThemeTokens) => PhiCardVariantMetrics> = {
  default: (token) => ({
    inset: token.padding,
    gap: token.paddingSM,
    headingSize: token.fontSizeHeading4,
    descriptionSize: token.fontSizeLG,
    iconSize: 24,
    topIconSize: 40,
    buttonSize: "medium",
  }),
  compact: (token) => ({
    inset: token.paddingSM,
    gap: token.paddingXS,
    headingSize: token.fontSizeHeading5,
    descriptionSize: token.fontSize,
    iconSize: 20,
    topIconSize: 32,
    buttonSize: "small",
    // A strip rather than a poster, so the words stay the larger part of a compact card.
    mediaAspectRatio: "2 / 1",
    eyebrowOnMedia: true,
  }),
  center: (token) => ({
    ...PHI_CARD_VARIANT_METRICS.default(token),
    arrangement: { textAlign: "center", iconPlacement: "top-center" },
  }),
};

/*
 * A card's corners where its Surface states none -- "None" in the Surface section, the contents without a
 * box. The picture is still clipped to the Theme's corner, so a card without a box keeps the shape of one.
 */
const PHI_CARD_THEME_CORNER = "var(--phi-surface-radius, var(--ant-border-radius-lg))";

/** The box a picture is shown in takes the picture's own proportion; 3:2 where nothing is known. */
function resolveMediaAspectRatio(presentation: PhiImagePresentation) {
  return presentation.width && presentation.height
    ? `${presentation.width} / ${presentation.height}`
    : "3 / 2";
}

export function PhiCardWidgetClient({
  labels: placedLabels,
  config,
  binding,
  renderText,
}: PhiCardWidgetClientProps) {
  const { token } = usePhiConfig();
  const [overrides, setOverrides] = useState<PhiCardSignalOverrides>({});
  const signalRoutes = config?.signalRoutes ?? null;
  const controlSignals = usePhiControlSignalController<string>({
    key: "card",
    signalRoutes,
    signalsEnabled: signalRoutes != null,
    onReceiveCapability: (capabilityId, signal) => {
      if (PHI_CARD_SIGNAL_TEXT_SLOTS.has(capabilityId)) {
        const text = typeof signal.value === "string" ? signal.value : signal.value == null ? "" : String(signal.value);
        setOverrides((current) => ({ ...current, [capabilityId]: text }));
      } else if (capabilityId === "loading" || capabilityId === "highlight") {
        setOverrides((current) => ({ ...current, [capabilityId]: signal.value === true }));
      }
      return true;
    },
  });
  const labels: PhiCardWidgetClientLabels = {
    ...placedLabels,
    ...Object.fromEntries(
      [...PHI_CARD_SIGNAL_TEXT_SLOTS].flatMap((slot) => {
        const text = overrides[slot as PhiCardTextSlot];
        return text === undefined ? [] : [[slot, text]];
      }),
    ),
  };
  const activates = (signalRoutes?.emits?.length ?? 0) > 0;
  const variant = config?.variant ?? "default";
  const body = config?.body ?? "text";
  const metrics = (PHI_CARD_VARIANT_METRICS[variant] ?? PHI_CARD_VARIANT_METRICS.default)(token);
  const { inset, gap, headingSize, descriptionSize, iconSize, topIconSize, buttonSize } = metrics;
  const textAlign = metrics.arrangement?.textAlign ?? config?.textAlign ?? "start";
  const headingLevel = config?.headingLevel ?? "h3";
  const iconPlacement = metrics.arrangement?.iconPlacement ?? config?.iconPlacement ?? "inline";
  const highlight = overrides.highlight ?? config?.highlight === true;
  const href = config?.href;
  const hoverEffect = config?.hoverEffect ?? "none";
  /* A button with neither words nor a mark would be an empty box, so it is not drawn. */
  const action = config?.action && (labels.actionLabel || config.action.icon) ? config.action : null;
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
  /*
   * A text as the card draws it, or what an editor puts in its place. `null` is a slot left out: an
   * empty text, or an editor that keeps an empty one out of sight.
   */
  const textOf = (slot: PhiCardTextSlot): ReactNode =>
    renderText ? renderText(slot, labels[slot]) : labels[slot] || null;
  /*
   * A field in a slot needs the card's width to measure against. Left to shrink to its contents, the
   * slot is as wide as a field that is itself as wide as the slot, and the text wraps after a few letters.
   * Stretched, the field still fits its text, and `textAlign` still places it.
   */
  const slotWidth: CSSProperties = renderText ? { justifySelf: "stretch", flex: "1 1 auto", minWidth: 0 } : {};
  const justify = textAlign === "center" ? "center" : textAlign === "end" ? "flex-end" : "flex-start";
  /* Justified text fills the line, so its blocks take the whole width; everything else sits at its side. */
  const justifyItems = textAlign === "justify" ? "stretch" : justify;
  /* Where a mark at the top stands, as its placement says: at the start, the middle or the end. */
  const iconAtTop = iconPlacement !== "inline";
  const markSide = iconPlacement === "top-center" ? "center" : iconPlacement === "top-end" ? "end" : "start";

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

  const eyebrow = textOf("eyebrow");
  const title = textOf("title");
  const description = textOf("description");
  const meta = textOf("meta");
  const eyebrowType: CSSProperties = { fontSize: token.fontSizeSM, letterSpacing: "0.04em", textTransform: "uppercase" };
  /* On the picture's corner where the variant puts it there and there is a picture to put it on. */
  const eyebrowOnMedia = metrics.eyebrowOnMedia === true && image != null;
  const heading = title != null ? (
    <PhiTypographyControl
      presentation="title"
      level={Number(headingLevel.slice(1)) as 2 | 3 | 4}
      style={{ margin: 0, fontSize: headingSize, color: token.colorTextHeading, ...slotWidth }}
    >
      {linked(title)}
    </PhiTypographyControl>
  ) : null;

  /*
   * The icon's colours as custom properties, which `.phi-card__icon` paints (`styles/layout.css`): the
   * `icon` hover effect turns them round, and a colour stated inline could not be turned by a rule.
   */
  const iconColours = (color: string, background: string) =>
    ({ "--phi-card-icon-color": color, "--phi-card-icon-background": background }) as CSSProperties;

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
        ...iconColours(
          config?.iconColor ?? (highlight ? token.colorPrimary : token.colorTextSecondary),
          config?.iconBackground ?? token.colorFillQuaternary,
        ),
      }}
    >
      <PhiIcon name={iconName} size={size} />
    </span>
  ) : null;

  /*
   * A failure stands where the figure would, at body size, because a sentence in figure type is
   * unreadable. A card whose figure is the only thing it has makes the figure the link.
   */
  const valueText = renderText ? renderText("value", labels.value) : null;
  const figure = valueText != null ? (
    <div style={{ fontSize: token.fontSizeHeading3, color: highlight ? token.colorPrimary : token.colorTextHeading, ...slotWidth }}>
      {valueText}
    </div>
  ) : (
    <PhiStatisticControl
      value={binding?.error ?? labels.value ?? ""}
      loading={binding?.loading === true || overrides.loading === true}
      styles={{
        content: binding?.error
          ? { color: token.colorError, fontSize: token.fontSize }
          : { color: highlight ? token.colorPrimary : token.colorTextHeading },
      }}
    />
  );

  const headingRow = iconPlacement === "inline" && iconName ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: justify, gap, ...slotWidth }}>
      {iconMark(iconSize, iconSize + 16)}
      {heading}
    </div>
  ) : heading;

  const media = image ? (
    <div
      className="phi-card__media"
      style={{
        position: "relative",
        aspectRatio: metrics.mediaAspectRatio ?? resolveMediaAspectRatio(image.presentation),
        overflow: "hidden",
      }}
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
      {iconAtTop && iconName ? (
        <span
          aria-hidden="true"
          className="phi-card__icon"
          style={{
            position: "absolute",
            insetInlineStart: markSide === "start" ? inset : markSide === "end" ? undefined : "50%",
            insetInlineEnd: markSide === "end" ? inset : undefined,
            top: "50%",
            translate: markSide === "center" ? "-50% -50%" : "0 -50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: topIconSize + 24,
            height: topIconSize + 24,
            borderRadius: "50%",
            // A ground of its own, so the mark reads on a bright picture and on a dark one alike.
            ...iconColours(
              config?.iconColor ?? (highlight ? token.colorPrimary : token.colorText),
              config?.iconBackground ?? `color-mix(in srgb, ${token.colorBgContainer} 88%, transparent)`,
            ),
            boxShadow: token.boxShadowTertiary,
          }}
        >
          <PhiIcon name={iconName} size={topIconSize} />
        </span>
      ) : null}
      {eyebrowOnMedia && eyebrow != null ? (
        <PhiTypographyControl
          type="secondary"
          style={{
            ...eyebrowType,
            position: "absolute",
            insetInlineStart: inset,
            top: inset,
            zIndex: 2,
            maxWidth: `calc(100% - 2 * ${typeof inset === "number" ? `${inset}px` : inset})`,
            paddingInline: token.paddingXS,
            borderRadius: token.borderRadiusSM,
            // A ground of its own, as the icon has, so the words read on any picture.
            background: `color-mix(in srgb, ${token.colorBgContainer} 88%, transparent)`,
            color: highlight ? token.colorPrimary : token.colorText,
          }}
        >
          {eyebrow}
        </PhiTypographyControl>
      ) : null}
    </div>
  ) : null;

  const boxStyle: CSSProperties = {
    ...(config?.surface ? {} : { borderRadius: PHI_CARD_THEME_CORNER }),
    ...surface.style,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
    textAlign,
    color: token.colorText,
    /* The ring's colour; `.phi-card--highlight` draws it (`styles/layout.css`). */
    ...(highlight ? { "--phi-card-highlight-color": token.colorPrimary } as CSSProperties : {}),
  };

  const content = (
    <>
      {media}
      <div style={{ display: "grid", gap, padding: inset, justifyItems }}>
        {iconAtTop && iconName && !image ? (
          <div style={{ justifySelf: markSide === "center" ? "center" : markSide === "end" ? "end" : "start" }}>
            {iconMark(topIconSize, topIconSize + 24)}
          </div>
        ) : null}
        {eyebrow != null && !eyebrowOnMedia ? (
          <PhiTypographyControl
            type="secondary"
            style={{ ...eyebrowType, color: highlight ? token.colorPrimary : token.colorTextTertiary, ...slotWidth }}
          >
            {eyebrow}
          </PhiTypographyControl>
        ) : null}
        {headingRow}
        {body === "stat" ? (title != null ? figure : linked(figure)) : null}
        {description != null ? (
          <PhiTypographyControl
            presentation="paragraph"
            style={{
              marginBottom: 0,
              color: token.colorTextSecondary,
              fontSize: descriptionSize,
              ...slotWidth,
            }}
          >
            {description}
          </PhiTypographyControl>
        ) : null}
        {meta != null ? (
          <PhiTypographyControl type="secondary" style={{ fontSize: token.fontSizeSM, color: token.colorTextTertiary, ...slotWidth }}>
            {meta}
          </PhiTypographyControl>
        ) : null}
        {action ? (
          <div className="phi-card__action">
            <PhiButtonControl
              type={highlight ? "primary" : "default"}
              size={buttonSize}
              {...(action.href ? { href: action.href, newTab: action.newTab, external: action.external } : {})}
              label={labels.actionLabel || undefined}
              {...(labels.actionLabel ? {} : { ariaLabel: action.ariaLabel })}
              {...(action.icon ? { icon: <PhiIcon name={action.icon} size="1em" /> } : {})}
              /* Pressed, it says so to whatever is wired; with an address it leads there as well. */
              {...(activates ? { onClick: () => controlSignals.emitCapability("activate", null) } : {})}
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
        highlight ? "phi-card--highlight" : null,
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
