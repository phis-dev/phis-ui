"use client";

import type { ReactNode } from "react";
import { Skeleton, Typography } from "antd";

import type { PhiCmsContentWidgetNode } from "../../../types/cms";
import { usePhiConfig } from "../../root/phi-config-provider";

function splitNamespacedType(widgetType: string) {
  const slashIndex = widgetType.lastIndexOf("/");

  if (slashIndex < 0) {
    return { pluginKey: "", typeKey: widgetType };
  }

  return {
    pluginKey: widgetType.slice(0, slashIndex),
    typeKey: widgetType.slice(slashIndex + 1),
  };
}

export type PhiWidgetPreviewFallbackProps = {
  widget: PhiCmsContentWidgetNode;
  pluginTitle?: string | null;
  summary?: ReactNode;
  children?: ReactNode;
};

export function PhiWidgetPreviewFallback({
  widget,
  pluginTitle,
  summary,
  children,
}: PhiWidgetPreviewFallbackProps) {
  const { token } = usePhiConfig();
  const { pluginKey, typeKey } = splitNamespacedType(widget.widgetType);

  return (
    <div
      className="phi-widget-preview-fallback"
      style={{
        display: "grid",
        gap: token.paddingXS,
        minWidth: 0,
        minHeight: 0,
        boxSizing: "border-box",
        padding: token.paddingSM,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusSM,
        background: token.colorFillQuaternary,
      }}
    >
      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <Typography.Text strong style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {widget.label ?? pluginTitle ?? typeKey}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pluginKey ? `${pluginKey}/${typeKey}` : typeKey}
        </Typography.Text>
      </div>
      {summary ? <Typography.Text type="secondary">{summary}</Typography.Text> : null}
      {children ? null : (
        <Skeleton
          active={false}
          title={false}
          paragraph={{
            rows: 2,
            width: ["86%", "54%"],
          }}
        />
      )}
      {children}
    </div>
  );
}
