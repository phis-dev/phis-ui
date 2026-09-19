"use client";

import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";

import type { PhiClientBlockBaseProps } from "../../../../../types";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
const PHI_LINE_HEIGHT_BASE = 1.5;
const PHI_LINE_HEIGHT_LG = 1.6;
const PHI_FONT_WEIGHT_STRONG = 600;

export type PhiDescriptionWidgetClientLabels = {
  eyebrow?: string;
  title?: string;
  description?: string;
  asideTitle?: string;
  asideItems?: string[];
  footer?: string;
};

export type PhiDescriptionWidgetClientProps = PhiClientBlockBaseProps<
  PhiDescriptionWidgetClientLabels,
  Record<string, never>
>;

export function PhiDescriptionWidgetClient({
  labels,
}: PhiDescriptionWidgetClientProps) {
  const { token } = usePhiConfig();
  const asideItems = (labels.asideItems ?? []).filter(Boolean);

  return (
    <PhiFlexControl vertical gap={token.paddingLG} style={{ width: "100%" }}>
      {labels.eyebrow ? (
        <PhiTagControl
          color="default"
          style={{
            width: "fit-content",
            borderRadius: 999,
            paddingInline: token.paddingSM,
            paddingBlock: token.paddingXXS,
            fontWeight: PHI_FONT_WEIGHT_STRONG,
            letterSpacing: "0.04em",
            color: token.colorTextTertiary,
            borderColor: token.colorBorderSecondary,
            background: token.colorFillQuaternary,
          }}
        >
          {labels.eyebrow}
        </PhiTagControl>
      ) : null}
      {labels.title || labels.description ? (
        <div>
          {labels.title ? (
            <PhiTypographyControl presentation="title" level={2} style={{ marginBottom: labels.description ? token.paddingXS : 0 }}>
              {labels.title}
            </PhiTypographyControl>
          ) : null}
          {labels.description ? (
            <PhiTypographyControl presentation="paragraph"
              style={{
                marginBottom: 0,
                color: token.colorTextSecondary,
                fontSize: token.fontSizeLG,
                lineHeight: PHI_LINE_HEIGHT_LG,
              }}
            >
              {labels.description}
            </PhiTypographyControl>
          ) : null}
        </div>
      ) : null}
      {labels.asideTitle || asideItems.length > 0 ? (
        <PhiFlexControl vertical gap={token.paddingMD} style={{ width: "100%" }}>
          {labels.asideTitle ? (
            <PhiTypographyControl
              strong
              style={{
                fontSize: token.fontSize,
                lineHeight: PHI_LINE_HEIGHT_BASE,
                color: token.colorTextHeading,
              }}
            >
              {labels.asideTitle}
            </PhiTypographyControl>
          ) : null}
          <PhiFlexControl vertical gap={token.paddingSM} style={{ width: "100%" }}>
            {asideItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: token.paddingXS,
                  padding: `${token.paddingSM}px ${token.padding}px`,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: token.paddingXS,
                    height: token.paddingXS,
                    marginTop: (token.fontSize * token.lineHeight - token.paddingXS) / 2,
                    borderRadius: "50%",
                    background: token.colorPrimary,
                    flexShrink: 0,
                  }}
                />
                <PhiTypographyControl
                  style={{
                    color: token.colorText,
                    fontSize: token.fontSize,
                    lineHeight: token.lineHeight,
                  }}
                >
                  {item}
                </PhiTypographyControl>
              </div>
            ))}
          </PhiFlexControl>
        </PhiFlexControl>
      ) : null}
      {labels.footer ? (
        <PhiTypographyControl presentation="paragraph" style={{ marginBottom: 0, color: token.colorTextTertiary }}>
          {labels.footer}
        </PhiTypographyControl>
      ) : null}
    </PhiFlexControl>
  );
}
