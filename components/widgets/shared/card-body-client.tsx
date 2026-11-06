"use client";

import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import { PhiButtonControl } from "../../controls/phi-button-control";
import {
  PHI_BACKGROUND_OVERLAY_DEFAULT_OPACITY,
  resolvePhiBackgroundWidgetStyle,
  type PhiBackgroundOverlay,
} from "../config/background";
import { resolvePhiButtonVariantPresentation, type PhiButtonVariant } from "../config/button-variant";
import type { PhiThemeGradientKey } from "../../../theme/phi-theme-gradients";
import { PhiFlexControl } from "../../controls/phi-flex-control";
import { PhiImageControl, type PhiImageControlSource } from "../../controls/phi-image-control";
import { PhiRibbonControl } from "../../controls/phi-ribbon-control";
import { PhiRibbonWrapControl } from "../../controls/phi-ribbon-wrap-control";
import { PhiSkeletonControl } from "../../controls/phi-skeleton-control";
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
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { PHI_THEME_HEADING_FONT_VARIABLE } from "../../../theme/phi-theme-typography";
import { PHI_CARD_TEXT_SLOTS, readPhiCardBillingPeriod } from "./card-vocabulary";
import type {
  PhiCardBadgeStyle,
  PhiCardBillingPeriod,
  PhiCardHeadingLevel,
  PhiCardHoverEffect,
  PhiCardIconPlacement,
  PhiCardTextAlign,
  PhiCardTextSlot,
  PhiCardVariant,
  PhiCardWidgetBody,
} from "./card-vocabulary";

export type {
  PhiCardBadgeStyle,
  PhiCardBillingPeriod,
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
  /**
   * A second eyebrow at the end of the eyebrow's line, such as a date beside who wrote it. Data a caller
   * states, not a slot of the Card Widget: the Inspector offers no field for it and no signal writes it.
   */
  eyebrowEnd?: string;
  title?: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
  /** The figure a `stat` body draws. Data rather than copy, and never translated. */
  value?: string;
  /** The band at the card's end edge. */
  badge?: string;
  /** A `plan` body's prices, data and never translated, and their periods, which are words. */
  price?: string;
  pricePeriod?: string;
  priceYearly?: string;
  pricePeriodYearly?: string;
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

/**
 * The layer over a card's picture. A colour or a gradient is drawn as CSS, each colour mixed down to the
 * Overlay's opacity, so a Theme variable (`var(--ant-color-bg-container)`) resolves and the picture fades
 * into the card's own ground in either mode; a Background draws the same Overlay into an SVG picture,
 * where no variable reaches. A pattern or noise is drawn as a Background draws it.
 */
function resolvePhiCardImageOverlayStyle(overlay: PhiBackgroundOverlay): CSSProperties {
  if (overlay.kind !== "color") {
    return resolvePhiBackgroundWidgetStyle({ base: { kind: "none" }, overlay });
  }
  const opacity = Math.round(Math.max(0, Math.min(1, overlay.opacity ?? PHI_BACKGROUND_OVERLAY_DEFAULT_OPACITY)) * 1000) / 10;
  const mix = (color: string) => (color === "transparent" || opacity >= 100
    ? color
    : `color-mix(in srgb, ${color} ${opacity}%, transparent)`);
  const ink = overlay.ink ?? { kind: "color" as const, color: "#000000" };
  return ink.kind === "color"
    ? { backgroundColor: mix(ink.color) }
    : { backgroundImage: `linear-gradient(${ink.direction}, ${ink.stops.map((stop) => `${mix(stop.color)} ${stop.percent}%`).join(", ")})` };
}

/** The card's picture, already resolved: which bytes, how they are framed, how they may arrive. */
export type PhiCardWidgetImage = {
  presentation: PhiImagePresentation;
  /** 0 to 1; absent is the whole picture. */
  opacity?: number;
  /** A layer over the picture, under the card's marks (`PhiCmsCardWidgetConfig.imageOverlay`). */
  overlay?: PhiBackgroundOverlay | null;
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
  /** The badge's ground; absent, the Theme's primary. */
  badgeColor?: string;
  /** How the badge is drawn; absent, `none`. */
  badgeStyle?: PhiCardBadgeStyle;
  /** A Theme gradient slot the badge is filled with, over `badgeColor`. */
  badgeGradient?: PhiThemeGradientKey;
  /** Which price a `plan` shows until a `billingPeriod` signal says otherwise. Absent is `monthly`. */
  billingPeriod?: PhiCardBillingPeriod;
  hoverEffect?: PhiCardHoverEffect;
  /** The card's wired signals (`PHI_CARD_SIGNALS`); absent where nothing is wired, as on the canvas. */
  signalRoutes?: PhiSignalRouteSet | null;
};

/* What arrived by signal, standing over what the card was placed with until the page is left. */
type PhiCardSignalOverrides = Partial<Record<PhiCardTextSlot, string>> & {
  loading?: boolean;
  highlight?: boolean;
  billingPeriod?: PhiCardBillingPeriod;
};

const PHI_CARD_SIGNAL_TEXT_SLOTS: ReadonlySet<string> = new Set<PhiCardTextSlot>(PHI_CARD_TEXT_SLOTS);

export type PhiCardWidgetAction = {
  href?: string;
  newTab?: boolean;
  external?: boolean;
  icon?: string;
  /** The button's name where it shows only its icon. */
  ariaLabel?: string;
  /** How it stands out; absent, primary on a highlighted card and normal otherwise. */
  variant?: PhiButtonVariant;
  /** The Theme gradient slot a `gradient` button is filled with. */
  gradient?: PhiThemeGradientKey;
};

export type PhiCardWidgetClientProps = PhiClientBlockBaseProps<
  PhiCardWidgetClientLabels,
  PhiCardWidgetClientConfig
> & {
  binding?: PhiCardWidgetClientBinding;
  /**
   * What a `list` body draws, a `series` body's chart, and a `plan` body's features, already drawn.
   *
   * Handed in rather than drawn here: the Card is on Public pages, and a list Control imported by it
   * would load on every page with a Card. A Dashboard draws its entries and passes them; a plan card's
   * server half draws its features on the server, and its editor draws them as fields.
   */
  listContent?: ReactNode;
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
  /**
   * The heading's size and line height per level: the Theme's own size for that level, and in a
   * compact card the next smaller one.
   */
  headingType: Record<PhiCardHeadingLevel, { fontSize: number | string; lineHeight: number | string }>;
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
    headingType: {
      h2: { fontSize: token.fontSizeHeading2, lineHeight: token.lineHeightHeading2 },
      h3: { fontSize: token.fontSizeHeading3, lineHeight: token.lineHeightHeading3 },
      h4: { fontSize: token.fontSizeHeading4, lineHeight: token.lineHeightHeading4 },
    },
    descriptionSize: token.fontSizeLG,
    iconSize: 24,
    topIconSize: 40,
    buttonSize: "medium",
  }),
  compact: (token) => ({
    inset: token.paddingSM,
    gap: token.paddingXS,
    headingType: {
      h2: { fontSize: token.fontSizeHeading3, lineHeight: token.lineHeightHeading3 },
      h3: { fontSize: token.fontSizeHeading4, lineHeight: token.lineHeightHeading4 },
      h4: { fontSize: token.fontSizeHeading5, lineHeight: token.lineHeightHeading5 },
    },
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
/* Text a screen reader reads and nobody sees, the usual way: out of the flow and clipped to nothing. */
const PHI_CARD_HIDDEN_TEXT: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const PHI_CARD_THEME_CORNER = "var(--phi-surface-radius)";

/** The box a picture is shown in takes the picture's own proportion; 3:2 where nothing is known. */
function resolveMediaAspectRatio(presentation: PhiImagePresentation) {
  return presentation.width && presentation.height
    ? `${presentation.width} / ${presentation.height}`
    : "3 / 2";
}

/*
 * Every colour the card paints is the Theme's variable (`PHI_COLOR`), never a token's resolved value: a
 * Surface with a `tone` writes the other mode's variables on the card's box, and only a variable reaches
 * the words inside it. Resolved values were the page's mode written in by hand, and dark words stayed
 * dark on a photograph darkened for light ones.
 */
export function PhiCardWidgetClient({
  labels: placedLabels,
  config,
  binding,
  listContent,
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
      } else if (capabilityId === "billingPeriod") {
        const billingPeriod = readPhiCardBillingPeriod(signal.value);
        if (billingPeriod) setOverrides((current) => ({ ...current, billingPeriod }));
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
  const { inset, gap, headingType, descriptionSize, iconSize, topIconSize, buttonSize } = metrics;
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

  /* What the card's link is called: its heading, or where it has none, its other words in turn. */
  const cardLinkName = labels.title || labels.description || labels.eyebrow || labels.value || labels.meta || href;
  /*
   * The card is the link: one anchor of its own, its name read by a screen reader and its reach
   * (`.phi-card__link::after`) over the whole box, so a reader can click anywhere. Not the heading's
   * anchor -- a card without a heading leads where it leads all the same. The action button stands above
   * that reach, a button of its own and never a link inside a link.
   */
  const cardLink = href ? (
    <PhiLink
      href={href}
      newTab={config?.newTab}
      external={config?.external}
      className="phi-card__link"
      style={{ color: "inherit" }}
    >
      <span style={PHI_CARD_HIDDEN_TEXT}>{cardLinkName}</span>
    </PhiLink>
  ) : null;

  const eyebrow = textOf("eyebrow");
  const title = textOf("title");
  const description = textOf("description");
  const meta = textOf("meta");
  const badge = textOf("badge");
  const eyebrowType: CSSProperties = { fontSize: token.fontSizeSM, letterSpacing: "0.04em", textTransform: "uppercase" };
  /* On the picture's corner where the variant puts it there and there is a picture to put it on. */
  const eyebrowOnMedia = metrics.eyebrowOnMedia === true && image != null;
  const heading = title != null ? (
    <PhiTypographyControl
      presentation="title"
      level={Number(headingLevel.slice(1)) as 2 | 3 | 4}
      style={{ margin: 0, ...headingType[headingLevel], color: PHI_COLOR.textHeading, ...slotWidth }}
    >
      {title}
    </PhiTypographyControl>
  ) : null;

  /*
   * The icon's colours as custom properties, which `.phi-card__icon` paints (`styles/layout.css`): the
   * `icon` hover effect turns them round, and a colour stated inline could not be turned by a rule.
   */
  const iconColours = (color: string, background: string) =>
    ({
      "--phi-card-icon-color": color,
      "--phi-card-icon-background": background,
      /* The mark's colour once the `icon` effect turns them round: a ground it can be read on. */
      "--phi-card-icon-hover-color": config?.iconBackground ?? PHI_COLOR.bgContainer,
    }) as CSSProperties;

  /*
   * The corner of the icon's ground: the Theme's Control shape at the large size, scaled from a large
   * Control's height to the ground's side. So `square` draws a square, `pill` a circle -- half the large
   * height scaled to the side is half the side -- and the steps between keep their proportion, as a
   * Segmented's items follow their track. The Theme's plain corner did not: a pill Site drew square marks.
   */
  const iconCorner = (side: number) =>
    `calc(var(--phi-control-radius-lg, ${token.borderRadiusLG}px) * ${side / token.controlHeightLG})`;

  /* The framed box an icon before the title stands in. */
  const inlineIconFrame = iconSize + 16;
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
        borderRadius: iconCorner(framed),
        ...iconColours(
          config?.iconColor ?? (highlight ? PHI_COLOR.primary : PHI_COLOR.textSecondary),
          config?.iconBackground ?? PHI_COLOR.fillQuaternary,
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
  /*
   * Beside an icon before the title, the figure starts where the title's words do, under them rather
   * than under the icon: the number belongs to the heading, the icon only marks it. On a line set to its
   * start only -- centred or at the end, the figure already stands with the words.
   */
  const figureIndent: CSSProperties =
    iconPlacement === "inline" && iconName && (textAlign === "start" || textAlign === "justify")
      ? { paddingInlineStart: inlineIconFrame + gap }
      : {};
  /*
   * The figure is set like the title it belongs to: in the font the Theme gives headings, and with digits
   * of one width, so a figure that changes does not shift as it counts. No fallback in the `var()`, as for
   * the headings themselves (`styles/layout.css`): a Theme that keeps headings on the body font sets no
   * variable, and the figure inherits the body font.
   */
  const figureType: CSSProperties = {
    fontFamily: `var(${PHI_THEME_HEADING_FONT_VARIABLE})`,
    fontVariantNumeric: "tabular-nums",
  };
  const figure = valueText != null ? (
    <div
      style={{
        ...figureType,
        fontSize: token.fontSizeHeading3,
        color: highlight ? PHI_COLOR.primary : PHI_COLOR.textHeading,
        ...slotWidth,
        ...figureIndent,
      }}
    >
      {valueText}
    </div>
  ) : (
    <PhiStatisticControl
      value={binding?.error ?? labels.value ?? ""}
      loading={binding?.loading === true || overrides.loading === true}
      style={figureIndent}
      styles={{
        content: binding?.error
          ? { color: PHI_COLOR.error, fontSize: token.fontSize }
          : { ...figureType, color: highlight ? PHI_COLOR.primary : PHI_COLOR.textHeading },
      }}
    />
  );

  /* A failure stands where the lines would, as it does for a figure; a list still coming is three lines. */
  const list = binding?.error ? (
    <PhiTypographyControl style={{ color: PHI_COLOR.error, ...slotWidth }}>{binding.error}</PhiTypographyControl>
  ) : binding?.loading === true || overrides.loading === true ? (
    <PhiSkeletonControl lines={3} />
  ) : listContent ?? null;

  /*
   * A plan's price: the period's own where it states one, the monthly one where it does not, so a switch
   * to yearly never leaves a card without a price. An editor is asked for the shown period's fields.
   */
  const yearly = (overrides.billingPeriod ?? config?.billingPeriod) === "yearly";
  const showsYearly = yearly && (renderText != null || Boolean(labels.priceYearly));
  const priceText = body === "plan" ? textOf(showsYearly ? "priceYearly" : "price") : null;
  const periodText = body === "plan" ? textOf(showsYearly ? "pricePeriodYearly" : "pricePeriod") : null;
  const plan = body === "plan" ? (
    <div style={{ display: "grid", gap, justifySelf: "stretch", justifyItems, minWidth: 0 }}>
      {priceText != null || periodText != null ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: justify, columnGap: PHI_SPACE.xs, ...slotWidth }}>
          {priceText != null ? (
            <span
              className="phi-card__price"
              style={{
                fontSize: token.fontSizeHeading2,
                lineHeight: token.lineHeightHeading2,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: highlight ? PHI_COLOR.primary : PHI_COLOR.textHeading,
                ...slotWidth,
              }}
            >
              {priceText}
            </span>
          ) : null}
          {periodText != null ? (
            <span style={{ color: PHI_COLOR.textSecondary, ...slotWidth }}>{periodText}</span>
          ) : null}
        </div>
      ) : null}
      {list != null ? <div style={{ justifySelf: "stretch", minWidth: 0, textAlign: "start" }}>{list}</div> : null}
    </div>
  ) : null;

  const headingRow = iconPlacement === "inline" && iconName ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: justify, gap, ...slotWidth }}>
      {iconMark(iconSize, inlineIconFrame)}
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
        imageStyle={{
          width: "100%",
          height: "100%",
          ...(image.opacity == null || image.opacity >= 1 ? {} : { opacity: image.opacity }),
        }}
      />
      {image.overlay ? (
        <span
          aria-hidden="true"
          className="phi-card__media-overlay"
          style={{
            ...resolvePhiCardImageOverlayStyle(image.overlay),
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        />
      ) : null}
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
            borderRadius: iconCorner(topIconSize + 24),
            // A ground of its own, so the mark reads on a bright picture and on a dark one alike.
            ...iconColours(
              config?.iconColor ?? (highlight ? PHI_COLOR.primary : PHI_COLOR.text),
              config?.iconBackground ?? `color-mix(in srgb, ${PHI_COLOR.bgContainer} 88%, transparent)`,
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
            background: `color-mix(in srgb, ${PHI_COLOR.bgContainer} 88%, transparent)`,
            color: highlight ? PHI_COLOR.primary : PHI_COLOR.text,
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
    color: PHI_COLOR.text,
    /* The ring's colour; `.phi-card--highlight` draws it (`styles/layout.css`). */
    ...(highlight ? { "--phi-card-highlight-color": PHI_COLOR.primary } as CSSProperties : {}),
  };

  /*
   * A plan's button stands at the card's foot: plans side by side in a row have lists of different
   * lengths, and their buttons belong on one line. The words keep their grid; the grid and the button
   * stand in a column that fills the card, and the button takes what is left above it.
   */
  const footAction = body === "plan" && action != null;

  const actionButton = action ? (
    <div
      className="phi-card__action"
      /* At the foot, it stands where the words' alignment puts it, as it does among them. */
      style={footAction ? { marginTop: "auto", alignSelf: textAlign === "center" ? "center" : textAlign === "end" ? "flex-end" : "flex-start" } : undefined}
    >
      <PhiButtonControl
        {...(action.variant
          ? resolvePhiButtonVariantPresentation(action.variant, action.gradient)
          : { type: highlight ? "primary" as const : "default" as const })}
        size={buttonSize}
        {...(action.href ? { href: action.href, newTab: action.newTab, external: action.external } : {})}
        label={labels.actionLabel || undefined}
        {...(labels.actionLabel ? {} : { ariaLabel: action.ariaLabel })}
        {...(action.icon ? { icon: <PhiIcon name={action.icon} size="1em" /> } : {})}
        /* Pressed, it says so to whatever is wired; with an address it leads there as well. */
        {...(activates ? { onClick: () => controlSignals.emitCapability("activate", null) } : {})}
      />
    </div>
  ) : null;

  /*
   * The band in the card's top end corner, floating (`PhiRibbonControl`): the words below it start where
   * they start in a card without one, so plans side by side keep their headings on one line.
   */
  const badgeStyle = config?.badgeStyle ?? "none";
  const ribbon = badge != null && (badgeStyle === "corner" || badgeStyle === "tag") ? (
    <PhiRibbonControl
      color={config?.badgeColor}
      {...(config?.badgeGradient ? { gradient: config.badgeGradient } : {})}
      placement={badgeStyle === "tag" ? "edge" : "corner"}
      /*
       * On the page, the whole words on hover where the band cut them short; pointed at, the band takes
       * the pointer, so a click on it is handed to the card's link as a click anywhere else on the card.
       * An editor's band holds a field and shows its words in full there.
       */
      {...(!renderText && labels.badge
        ? {
            fullText: labels.badge,
            ...(href
              ? {
                  onClick: (event: ReactMouseEvent<HTMLSpanElement>) =>
                    event.currentTarget.closest(".phi-card")?.querySelector<HTMLAnchorElement>(".phi-card__link")?.click(),
                }
              : {}),
          }
        : {})}
      /* An editor writes in the band, so it takes the pointer there and keeps room for a word. */
      {...(renderText ? { style: { pointerEvents: "auto", minWidth: "6em" } } : {})}
    >
      {badge}
    </PhiRibbonControl>
  ) : null;

  const words = (
    <div style={{ display: "grid", gap, padding: footAction ? 0 : inset, justifyItems }}>
      {iconAtTop && iconName && !image ? (
        <div style={{ justifySelf: markSide === "center" ? "center" : markSide === "end" ? "end" : "start" }}>
          {iconMark(topIconSize, topIconSize + 24)}
        </div>
      ) : null}
      {eyebrow != null && !eyebrowOnMedia && !labels.eyebrowEnd ? (
        <PhiTypographyControl
          type="secondary"
          style={{ ...eyebrowType, color: highlight ? PHI_COLOR.primary : PHI_COLOR.textTertiary, ...slotWidth }}
        >
          {eyebrow}
        </PhiTypographyControl>
      ) : null}
      {labels.eyebrowEnd && !eyebrowOnMedia ? (
        // The two ends of one line; an empty start keeps the end at the end.
        <PhiFlexControl justify="space-between" align="baseline" wrap gap={PHI_SPACE.xs} style={{ justifySelf: "stretch", minWidth: 0 }}>
          <PhiTypographyControl
            type="secondary"
            style={{ ...eyebrowType, color: highlight ? PHI_COLOR.primary : PHI_COLOR.textTertiary }}
          >
            {eyebrow ?? ""}
          </PhiTypographyControl>
          <PhiTypographyControl type="secondary" style={{ ...eyebrowType, color: PHI_COLOR.textTertiary }}>
            {labels.eyebrowEnd}
          </PhiTypographyControl>
        </PhiFlexControl>
      ) : null}
      {headingRow}
      {body === "stat" ? figure : null}
      {body === "series" ? (
        <>
          {/* The headline where there is one, and the figure's loading and failure in its place either way. */}
          {labels.value || binding?.error || binding?.loading === true || overrides.loading === true ? figure : null}
          {list != null && !binding?.error && binding?.loading !== true && overrides.loading !== true ? (
            <div style={{ justifySelf: "stretch", minWidth: 0 }}>{list}</div>
          ) : null}
        </>
      ) : null}
      {body === "list" && list != null ? (
        /* The lines take the card's width whatever the text alignment centres. */
        <div style={{ justifySelf: "stretch", minWidth: 0 }}>{list}</div>
      ) : null}
      {description != null ? (
        <PhiTypographyControl
          presentation="paragraph"
          style={{
            marginBottom: 0,
            color: PHI_COLOR.textSecondary,
            fontSize: descriptionSize,
            ...slotWidth,
          }}
        >
          {description}
        </PhiTypographyControl>
      ) : null}
      {plan}
      {meta != null ? (
        <PhiTypographyControl type="secondary" style={{ fontSize: token.fontSizeSM, color: PHI_COLOR.textTertiary, ...slotWidth }}>
          {meta}
        </PhiTypographyControl>
      ) : null}
      {footAction ? null : actionButton}
    </div>
  );

  const content = (
    <>
      {media}
      {footAction ? (
        <div style={{ display: "flex", flexDirection: "column", gap, padding: inset, flex: "1 1 auto", minWidth: 0 }}>
          {words}
          {actionButton}
        </div>
      ) : words}
      {/* Outside the words' grid, which would give it a row and a gap of its own; it takes no room. */}
      {cardLink}
    </>
  );

  const card = (
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
      {ribbon}
      {surface.className ? <PhiSurfaceTone tone={config?.surface?.tone}>{content}</PhiSurfaceTone> : content}
    </article>
  );

  /*
   * A ribbon hangs over the card's edge, which the card -- clipping for its picture and its zoom -- cannot
   * give a child of its own; it wraps the card instead (`PhiRibbonWrapControl`). An editor writes in it.
   */
  return badge != null && badgeStyle === "ribbon" ? (
    <PhiRibbonWrapControl
      text={badge}
      {...(config?.badgeColor ? { color: config.badgeColor } : {})}
      {...(config?.badgeGradient ? { gradient: config.badgeGradient } : {})}
      interactive={renderText != null}
      className={hoverEffect === "lift" ? "phi-card-ribbon phi-card-ribbon--lift" : "phi-card-ribbon"}
    >
      {card}
    </PhiRibbonWrapControl>
  ) : card;
}
