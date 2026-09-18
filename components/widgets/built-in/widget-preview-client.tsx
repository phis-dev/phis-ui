"use client";

import type { ReactNode } from "react";

import type { PhiCmsContentWidgetNode } from "../../../types/cms";
import { usePhiConfig } from "../../root/phi-config-provider";
import { PhiTypographyControl } from "../../controls/phi-typography-control";
import { PhiSkeletonControl } from "../../controls/phi-skeleton-control";

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
        <PhiTypographyControl strong style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {widget.label ?? pluginTitle ?? typeKey}
        </PhiTypographyControl>
        <PhiTypographyControl type="secondary" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pluginKey ? `${pluginKey}/${typeKey}` : typeKey}
        </PhiTypographyControl>
      </div>
      {summary ? <PhiTypographyControl type="secondary">{summary}</PhiTypographyControl> : null}
      {children ? null : (
        <PhiSkeletonControl
          // Still on purpose: this says the Widget has nothing to preview, not that something is on
          // its way, and a shimmer would promise an arrival that never comes.
          active={false}
          lines={2}
          lineWidths={["86%", "54%"]}
        />
      )}
      {children}
    </div>
  );
}
