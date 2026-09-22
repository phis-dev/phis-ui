"use client";

import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";

import type { PhiClientBlockBaseProps } from "../../../../../types";
import { PhiCardControl } from "../../../../../components/controls/phi-card-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { PhiLink } from "../../../../../components/navigation/phi-link";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

export type PhiCardWidgetClientLabels = {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
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
  highlight?: boolean;
};

export type PhiCardWidgetClientProps = PhiClientBlockBaseProps<
  PhiCardWidgetClientLabels,
  PhiCardWidgetClientConfig
>;

export function PhiCardWidgetClient({
  labels,
  config,
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
          {titleNode}
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
