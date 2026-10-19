"use client";

import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";

import type { PhiClientBlockBaseProps } from "../../../../../types";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import type { PhiTextTone } from "../../../../../components/widgets/config/text-tone";
import { PhiBulletListControl } from "../../../../../components/controls/phi-bullet-list-control";
import {
  buildPhiBulletListTree,
  resolvePhiBulletListStyle,
  type PhiBulletListEntry,
  type PhiBulletListStyle,
} from "../../../../../components/widgets/shared/bullet-list-vocabulary";
import { resolvePhiTextPlaceholders } from "../../../../../helpers/text-placeholders";
const PHI_LINE_HEIGHT_BASE = 1.5;
const PHI_LINE_HEIGHT_LG = 1.6;
const PHI_FONT_WEIGHT_STRONG = 600;

export type PhiDescriptionWidgetClientLabels = {
  eyebrow?: string;
  title?: string;
  description?: string;
  asideTitle?: string;
  asideItems?: PhiBulletListEntry[];
  footer?: string;
};

export type PhiDescriptionWidgetClientProps = PhiClientBlockBaseProps<
  PhiDescriptionWidgetClientLabels,
  { tone?: PhiTextTone; asideList?: PhiBulletListStyle }
>;

export function PhiDescriptionWidgetClient({
  labels,
  config,
}: PhiDescriptionWidgetClientProps) {
  const { token } = usePhiConfig();
  const asideItems = buildPhiBulletListTree(
    (labels.asideItems ?? []).filter((entry) => Boolean(entry.text)),
    (entry) => resolvePhiTextPlaceholders(entry.text, [], undefined, entry.values),
  );

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
              type={config?.tone}
              style={{
                marginBottom: 0,
                color: config?.tone ? undefined : token.colorTextSecondary,
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
          <div style={{ color: token.colorText, fontSize: token.fontSize, lineHeight: token.lineHeight }}>
            <PhiBulletListControl items={asideItems} listStyle={resolvePhiBulletListStyle(config?.asideList)} />
          </div>
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
