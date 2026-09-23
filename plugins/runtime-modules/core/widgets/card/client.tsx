"use client";

import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";

import type { PhiClientBlockBaseProps } from "../../../../../types";
import { PhiCardControl } from "../../../../../components/controls/phi-card-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { PhiLink } from "../../../../../components/navigation/phi-link";
import { PhiStatisticControl } from "../../../../../components/controls/phi-statistic-control";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

/**
 * What fills a card between its eyebrow and its description.
 *
 * `text` is a heading, which is what a card has always been. `stat` is a labelled figure drawn by the
 * same Control the Theme inspector uses, so the house keeps one statistic rather than two: before this,
 * a Dashboard card wrote its figure into the title slot, and "Site users" was replaced by "42" with
 * only the eyebrow left to say what had been counted.
 *
 * The body is chosen, never inferred from whether a value happens to have arrived. A card that decided
 * by presence would draw as text and reflow into a statistic the moment its figure landed -- twelve
 * times on a Dashboard, on every load.
 */
export type PhiCardWidgetBody = "text" | "stat";

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
 * Handed in, never decided here. `design/STATE_MACHINES.md` puts it plainly -- a Widget "presents a
 * state it was given" -- and this is the whole of what a card is given about its own: whether the
 * content is still coming, and whether it failed.
 *
 * Two plain facts rather than a named phase, deliberately. A phase vocabulary of the card's own would
 * be the feature-local substitute that design forbids, and there would be two of them the day the real
 * machine lands. For the same reason it never travels in `config`: a page tree stores what an author
 * wrote, and "still loading" is not that.
 */
export type PhiCardWidgetClientBinding = {
  loading?: boolean;
  error?: string | null;
};

export type PhiCardWidgetClientConfig = {
  imageUrl?: string;
  /**
   * A small mark beside the title -- a logo, an app icon, an avatar.
   *
   * Not the cover, and the difference is the point: a cover is an opening image and takes the width it
   * is given, while a mark is read at one size and stops being a mark when it is stretched. A card that
   * had only the first turned every icon into a poster.
   */
  iconUrl?: string;
  iconAlt?: string;
  /**
   * The same mark, named rather than delivered: `antd:dashboard`, or anything else an icon name reaches.
   *
   * A picture that arrives as bytes and an icon that arrives as a name occupy one place on a card, so
   * they are one decision here. `iconUrl` wins when both are given, because a Site that uploaded a mark
   * meant it. A contributed card is the case this exists for: a Module ships an icon with itself and
   * has no file to point at.
   */
  iconName?: string;
  /**
   * How the delivered bytes meet the cover box. Both come from the shared image presentation
   * resolver, so a generated variant arrives already centered and an original keeps its focal
   * position instead of the Card inventing a second framing rule.
   */
  imageFit?: "cover" | "contain" | "fill";
  imagePosition?: string;
  alt?: string;
  blurDataUrl?: string;
  href?: string;
  newTab?: boolean;
  actionHref?: string;
  actionNewTab?: boolean;
  variant?: "default" | "compact" | "featured";
  /**
   * Which body draws, independent of `variant`.
   *
   * `variant` is size and weight, this is the kind of thing inside. A compact statistic and a featured
   * statistic are both sensible, which is why folding one into the other would have cost a case.
   */
  body?: PhiCardWidgetBody;
  highlight?: boolean;
};

export type PhiCardWidgetClientProps = PhiClientBlockBaseProps<
  PhiCardWidgetClientLabels,
  PhiCardWidgetClientConfig
> & {
  binding?: PhiCardWidgetClientBinding;
};

export function PhiCardWidgetClient({
  labels,
  config,
  binding,
}: PhiCardWidgetClientProps) {
  const { token } = usePhiConfig();
  const variant = config?.variant ?? "default";
  const size = variant === "compact" ? "small" : "medium";
  const hasPrimaryLink = Boolean(config?.href);
  const hasAction = Boolean(config?.actionHref && labels.actionLabel);
  const cardHighlight = Boolean(config?.highlight);
  const cover = config?.imageUrl ? (
    <img
      alt={config.alt ?? labels.title ?? labels.eyebrow ?? ""}
      src={config.imageUrl}
      loading="lazy"
      style={{
        display: "block",
        width: "100%",
        aspectRatio: variant === "featured" ? "16 / 9" : "4 / 3",
        objectFit: config.imageFit ?? "cover",
        objectPosition: config.imagePosition ?? "center",
      }}
    />
  ) : null;

  const titleNode = labels.title ? (
    hasPrimaryLink ? (
      <PhiLink href={config!.href!} newTab={config?.newTab} style={{ color: "inherit" }}>
        <PhiTypographyControl presentation="title"
          level={variant === "featured" ? 3 : 4}
          style={{ margin: 0, color: token.colorTextHeading }}
        >
          {labels.title}
        </PhiTypographyControl>
      </PhiLink>
    ) : (
      <PhiTypographyControl presentation="title" level={variant === "featured" ? 3 : 4} style={{ margin: 0, color: token.colorTextHeading }}>
        {labels.title}
      </PhiTypographyControl>
    )
  ) : null;

  /*
   * A failure stands where the figure would, not in a footnote.
   *
   * `design/STATE_MACHINES.md`: "Waiting and failing are states, not flags beside them." A card whose
   * number could not be resolved has not got a number, and saying so in the place the number belongs is
   * the difference between a card that failed and a card that is merely quiet. It is set at body size
   * because a sentence in figure type is unreadable.
   */
  const statNode = (
    <PhiStatisticControl
      title={labels.title}
      value={binding?.error ?? labels.value ?? ""}
      loading={binding?.loading ?? false}
      styles={{
        content: binding?.error
          ? { color: token.colorError, fontSize: token.fontSize }
          : { color: cardHighlight ? token.colorPrimary : token.colorTextHeading },
      }}
    />
  );

  /*
   * On a stat card the link takes the whole body.
   *
   * A text card's heading is the link and has been since it was written, so it keeps that. A stat card's
   * label is small secondary type and a poor target on its own, so the figure goes inside the link with
   * it. Whether the whole box should be the link is older and wider than this body -- `PhiCardControl`
   * already lifts the box under the pointer as though it were -- and is not settled here.
   */
  const bodyNode = (config?.body ?? "text") === "stat"
    ? hasPrimaryLink
      ? (
        <PhiLink href={config!.href!} newTab={config?.newTab} style={{ color: "inherit", display: "block" }}>
          {statNode}
        </PhiLink>
      )
      : statNode
    : titleNode;

  return (
    <PhiCardControl
      size={size}
      hoverable={hasPrimaryLink || hasAction}
      cover={cover}
      style={{
        width: "100%",
        borderColor: cardHighlight ? token.colorPrimary : token.colorBorderSecondary,
        /*
         * Depth from the Theme, not from three colours typed in by hand. A card sits on the page rather
         * than over it, so the ordinary one is the quiet shadow and a featured one is the next step up;
         * a highlighted card keeps its ring, which is a border rather than depth.
         */
        boxShadow: cardHighlight
          ? `0 0 0 1px ${token.colorPrimary} inset, ${token.boxShadowTertiary}`
          : variant === "featured"
            ? token.boxShadowSecondary
            : token.boxShadowTertiary,
        background: variant === "featured" ? token.colorFillQuaternary : token.colorBgContainer,
      }}
    >
      {/* The Card is a box; arranging what is in it belongs to this Widget, not to the primitive's body. */}
      <div style={{ display: "grid", gap: variant === "compact" ? token.paddingSM : token.paddingLG }}>
        <div
          style={{
            display: "grid",
            gap: variant === "compact" ? token.paddingSM : token.paddingLG,
          }}
        >
          {config?.iconUrl ? (
            <img
              alt={config.iconAlt ?? labels.title ?? ""}
              src={config.iconUrl}
              loading="lazy"
              width={40}
              height={40}
              style={{
                display: "block",
                width: 40,
                height: 40,
                borderRadius: token.borderRadius,
                objectFit: "contain",
                // Marks are drawn to their own edges, so one is given room rather than cropped: what a
                // cover may lose at the sides, a logo may not.
                background: token.colorFillQuaternary,
              }}
            />
          ) : config?.iconName ? (
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: token.borderRadius,
                background: token.colorFillQuaternary,
                color: cardHighlight ? token.colorPrimary : token.colorTextSecondary,
              }}
            >
              <PhiIcon name={config.iconName} size={24} />
            </span>
          ) : null}
          {labels.eyebrow ? (
            <PhiTypographyControl
              type="secondary"
              style={{
                fontSize: token.fontSizeSM,
                lineHeight: 1.5715,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: cardHighlight ? token.colorPrimary : token.colorTextTertiary,
              }}
            >
              {labels.eyebrow}
            </PhiTypographyControl>
          ) : null}
          {bodyNode}
        </div>

        {labels.description ? (
          <PhiTypographyControl presentation="paragraph"
            style={{
              marginBottom: 0,
              color: token.colorTextSecondary,
              fontSize: variant === "compact" ? token.fontSize : token.fontSizeLG,
              lineHeight: variant === "compact" ? token.lineHeight : token.lineHeightLG,
            }}
          >
            {labels.description}
          </PhiTypographyControl>
        ) : null}

        {labels.meta ? (
          <PhiTypographyControl
            type="secondary"
            style={{
              fontSize: token.fontSizeSM,
              lineHeight: 1.5715,
              color: token.colorTextTertiary,
            }}
          >
            {labels.meta}
          </PhiTypographyControl>
        ) : null}

        {hasAction ? (
          <div>
            <PhiButtonControl
              type={cardHighlight ? "primary" : "default"}
              size={variant === "compact" ? "small" : "medium"}
              href={config!.actionHref}
              newTab={config?.actionNewTab}
              label={labels.actionLabel}
            />
          </div>
        ) : null}
      </div>
    </PhiCardControl>
  );
}
