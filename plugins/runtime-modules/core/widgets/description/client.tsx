"use client";

import { Space, Tag, Typography } from "antd";

import type { PhiClientBlockBaseProps } from "../../../../../types";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
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
    <Space orientation="vertical" size={0} style={{ width: "100%", gap: token.paddingLG }}>
      {labels.eyebrow ? (
        <Tag
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
        </Tag>
      ) : null}
      {labels.title || labels.description ? (
        <div>
          {labels.title ? (
            <Typography.Title level={2} style={{ marginBottom: labels.description ? token.paddingXS : 0 }}>
              {labels.title}
            </Typography.Title>
          ) : null}
          {labels.description ? (
            <Typography.Paragraph
              style={{
                marginBottom: 0,
                color: token.colorTextSecondary,
                fontSize: token.fontSizeLG,
                lineHeight: PHI_LINE_HEIGHT_LG,
              }}
            >
              {labels.description}
            </Typography.Paragraph>
          ) : null}
        </div>
      ) : null}
      {labels.asideTitle || asideItems.length > 0 ? (
        <Space orientation="vertical" size={0} style={{ width: "100%", gap: token.paddingMD }}>
          {labels.asideTitle ? (
            <Typography.Text
              strong
              style={{
                fontSize: token.fontSize,
                lineHeight: PHI_LINE_HEIGHT_BASE,
                color: token.colorTextHeading,
              }}
            >
              {labels.asideTitle}
            </Typography.Text>
          ) : null}
          <Space orientation="vertical" size={0} style={{ width: "100%", gap: token.paddingSM }}>
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
                <Typography.Text
                  style={{
                    color: token.colorText,
                    fontSize: token.fontSize,
                    lineHeight: token.lineHeight,
                  }}
                >
                  {item}
                </Typography.Text>
              </div>
            ))}
          </Space>
        </Space>
      ) : null}
      {labels.footer ? (
        <Typography.Paragraph style={{ marginBottom: 0, color: token.colorTextTertiary }}>
          {labels.footer}
        </Typography.Paragraph>
      ) : null}
    </Space>
  );
}
