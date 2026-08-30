"use client";

import type { CSSProperties, ReactNode } from "react";

import { Typography, theme } from "antd";
import type { PhiRegionWidgetLabels } from "../widgets/label-types/region";
import { PHI_LAYOUT } from "../../theme/phi-tokens";
import { usePhiAuthoringRegionOverrides } from "../runtime/authoring-region-overrides";

const PHI_PADDING = "var(--ant-padding)";
const PHI_PADDING_XS = "var(--ant-padding-xs)";
const PHI_COLOR_BORDER_SECONDARY = "var(--ant-color-border-secondary)";

export type PhiStructureRegionLayoutProps = {
  blockId?: string | number | null;
  headerTop?: ReactNode;
  headerMain?: ReactNode;
  siderLeft?: ReactNode;
  footerMain?: ReactNode;
  footerBottom?: ReactNode;
  style?: CSSProperties;
  labels?: PhiRegionWidgetLabels;
};

export function PhiStructureRegionLayout({
  blockId,
  headerTop,
  headerMain,
  siderLeft,
  footerMain,
  footerBottom,
  style,
  labels,
}: PhiStructureRegionLayoutProps) {
  const { token } = theme.useToken();
  const overrides = usePhiAuthoringRegionOverrides();
  const isPreviewMode = overrides.preview;
  const shellPadding = isPreviewMode ? 0 : PHI_PADDING;
  const resolvedSiderLeftMode = overrides.structureSiderLeft?.fullHeight ? "fullHeight" : "content";
  const hasVisibleSiderLeft = isPreviewMode ? overrides.structureSiderLeft?.visible === true : siderLeft != null;
  const resolvedSiderLeftWidth = overrides.structureSiderLeft?.width ?? `${PHI_LAYOUT.sidebarWidth}px`;
  const resolvedGridColumns = hasVisibleSiderLeft ? `${resolvedSiderLeftWidth} minmax(0, 1fr)` : "0px minmax(0, 1fr)";
  const sharedGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: resolvedGridColumns,
    gridTemplateRows: "auto auto minmax(200px, 1fr) auto auto",
    gap: 0,
    alignItems: "stretch",
    minWidth: 0,
    height: "100%",
  };

  const contentPreviewStyle: CSSProperties = {
    minHeight: 200,
    border: isPreviewMode ? "none" : `1px dashed ${PHI_COLOR_BORDER_SECONDARY}`,
    borderRadius: 0,
    background: isPreviewMode ? "transparent" : token.colorPrimaryBg,
    padding: shellPadding,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: isPreviewMode ? 0 : PHI_PADDING_XS,
    minWidth: 0,
  };

  return (
    <div
      className="phi-structure-region-layout"
      data-phi-block-id={blockId ?? undefined}
      style={{
        padding: shellPadding,
        minHeight: "100%",
        ...style,
      }}
    >
      {resolvedSiderLeftMode === "fullHeight" ? (
        <div
          className="phi-structure-region-layout__grid"
          style={{
            ...sharedGridStyle,
            minHeight: isPreviewMode ? "100%" : undefined,
          }}
        >
          <div
            key="sider_left"
            className="phi-structure-region-layout__sider-cell"
            style={{ gridColumn: 1, gridRow: "1 / 6", minWidth: 0, height: "100%", alignSelf: "stretch" }}
          >
            {hasVisibleSiderLeft ? siderLeft : null}
          </div>
          <div key="header_top" style={{ gridColumn: 2, gridRow: 1, minWidth: 0 }}>{headerTop}</div>
          <div key="header_main" style={{ gridColumn: 2, gridRow: 2, minWidth: 0 }}>{headerMain}</div>
          <div key="content" style={{ gridColumn: 2, gridRow: 3, ...contentPreviewStyle }}>
            {isPreviewMode ? null : (
              <>
                <Typography.Text strong>{labels?.structure?.surface?.contentTitle ?? "Page body viewport"}</Typography.Text>
                <Typography.Text type="secondary">
                  {labels?.structure?.surface?.contentDescription ??
                    "Placeholder for the page body rendered by the selected page."}
                </Typography.Text>
              </>
            )}
          </div>
          <div key="footer_main" style={{ gridColumn: 2, gridRow: 4, minWidth: 0 }}>{footerMain}</div>
          <div key="footer_bottom" style={{ gridColumn: 2, gridRow: 5, minWidth: 0 }}>{footerBottom}</div>
        </div>
      ) : (
        <div
          className="phi-structure-region-layout__grid"
          style={{
            ...sharedGridStyle,
            minHeight: isPreviewMode ? "100%" : undefined,
          }}
        >
          <div key="header_top" style={{ gridColumn: "1 / 3", gridRow: 1, minWidth: 0 }}>{headerTop}</div>
          <div key="header_main" style={{ gridColumn: "1 / 3", gridRow: 2, minWidth: 0 }}>{headerMain}</div>
          <div
            key="sider_left"
            className="phi-structure-region-layout__sider-cell"
            style={{ gridColumn: 1, gridRow: 3, minWidth: 0, height: "100%", alignSelf: "stretch" }}
          >
            {hasVisibleSiderLeft ? siderLeft : null}
          </div>
          <div key="content" style={{ gridColumn: 2, gridRow: 3, ...contentPreviewStyle }}>
            {isPreviewMode ? null : (
              <>
                <Typography.Text strong>{labels?.structure?.surface?.contentTitle ?? "Page body viewport"}</Typography.Text>
                <Typography.Text type="secondary">
                  {labels?.structure?.surface?.contentDescription ??
                    "Placeholder for the page body rendered by the selected page."}
                </Typography.Text>
              </>
            )}
          </div>
          <div key="footer_main" style={{ gridColumn: "1 / 3", gridRow: 4, minWidth: 0 }}>{footerMain}</div>
          <div key="footer_bottom" style={{ gridColumn: "1 / 3", gridRow: 5, minWidth: 0 }}>{footerBottom}</div>
        </div>
      )}
    </div>
  );
}
