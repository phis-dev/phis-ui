"use client";

import { Card, Button, Typography } from "antd";

import type { PhiClientBlockBaseProps } from "../../../../../types";
import { PhiLink } from "../../../../../components/navigation/phi-link";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";

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
        <Typography.Title
          level={variant === "featured" ? 3 : 4}
          style={{ margin: 0, color: token.colorTextHeading }}
        >
          {labels.title}
        </Typography.Title>
      </PhiLink>
    ) : (
      <Typography.Title level={variant === "featured" ? 3 : 4} style={{ margin: 0, color: token.colorTextHeading }}>
        {labels.title}
      </Typography.Title>
    )
  ) : null;

  return (
    <Card
      size={size}
      variant="outlined"
      hoverable={hasPrimaryLink || hasAction}
      cover={cover}
      style={{
        width: "100%",
        borderColor: cardHighlight ? token.colorPrimary : token.colorBorderSecondary,
        boxShadow: cardHighlight
          ? `0 0 0 1px ${token.colorPrimary} inset, 0 4px 14px rgba(17, 24, 39, 0.08)`
        : variant === "featured"
            ? "0 10px 28px rgba(17, 24, 39, 0.10)"
            : "0 4px 14px rgba(17, 24, 39, 0.08)",
        background: variant === "featured" ? token.colorFillQuaternary : token.colorBgContainer,
      }}
      styles={{
        body: {
          display: "grid",
          gap: variant === "compact" ? token.paddingSM : token.paddingLG,
        },
      }}
    >
      <div
        style={{
          display: "grid",
          gap: variant === "compact" ? token.paddingSM : token.paddingLG,
        }}
      >
        {labels.eyebrow ? (
          <Typography.Text
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
          </Typography.Text>
        ) : null}
        {titleNode}
      </div>

      {labels.description ? (
        <Typography.Paragraph
          style={{
            marginBottom: 0,
            color: token.colorTextSecondary,
            fontSize: variant === "compact" ? token.fontSize : token.fontSizeLG,
            lineHeight: variant === "compact" ? token.lineHeight : token.lineHeightLG,
          }}
        >
          {labels.description}
        </Typography.Paragraph>
      ) : null}

      {labels.meta ? (
        <Typography.Text
          type="secondary"
          style={{
            fontSize: token.fontSizeSM,
            lineHeight: 1.5715,
            color: token.colorTextTertiary,
          }}
        >
          {labels.meta}
        </Typography.Text>
      ) : null}

      {hasAction ? (
        <div>
          <Button
            type={cardHighlight ? "primary" : "default"}
            size={variant === "compact" ? "small" : "medium"}
            href={config!.actionHref}
            target={config?.actionNewTab ? "_blank" : undefined}
            rel={config?.actionNewTab ? "noreferrer" : undefined}
          >
            {labels.actionLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
