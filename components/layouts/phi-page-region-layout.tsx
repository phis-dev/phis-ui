"use client";

import type { CSSProperties, ReactNode } from "react";

import { PHI_LAYOUT } from "../../theme/phi-tokens";
import { usePhiAuthoringRegionOverrides } from "../runtime/authoring-region-overrides";

const PHI_PADDING = "var(--ant-padding)";

export type PhiPageRegionLayoutProps = {
  blockId?: string | number | null;
  headerBottom?: ReactNode;
  hero?: ReactNode;
  content?: ReactNode;
  siderRight?: ReactNode;
  footerTop?: ReactNode;
  style?: CSSProperties;
};

export function PhiPageRegionLayout({
  blockId,
  headerBottom,
  hero,
  content,
  siderRight,
  footerTop,
  style,
}: PhiPageRegionLayoutProps) {
  const overrides = usePhiAuthoringRegionOverrides();
  const isPreviewMode = overrides.preview;
  const shellPadding = isPreviewMode ? 0 : PHI_PADDING;
  const bodyGap = "0px";
  const hasVisibleSiderRight = isPreviewMode ? overrides.pageSiderRight?.visible === true : siderRight != null;
  const resolvedSiderRightWidth = overrides.pageSiderRight?.width ?? `${PHI_LAYOUT.sidebarWidth}px`;
  const resolvedBodyColumns = hasVisibleSiderRight ? `minmax(0, 1fr) ${resolvedSiderRightWidth}` : "minmax(0, 1fr) 0px";
  return (
    <div
      className="phi-page-region-layout"
      data-phi-block-id={blockId ?? undefined}
      style={{
        padding: shellPadding,
        minHeight: "100%",
        minWidth: 0,
        ...style,
      }}
    >
      <div
        className="phi-page-region-layout__grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gap: 0,
          minWidth: 0,
          minHeight: "100%",
          alignItems: "stretch",
        }}
      >
        <div style={{ gridColumn: 1, gridRow: 1, minWidth: 0 }}>
          {headerBottom}
        </div>
        <div
          className="phi-page-region-layout__body"
          style={{
            gridColumn: 1,
            gridRow: 2,
            minWidth: 0,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: resolvedBodyColumns,
            gap: bodyGap,
            alignItems: "stretch",
          }}
        >
          <div
            className="phi-page-region-layout__main"
            style={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: bodyGap,
            }}
          >
            <div style={{ minWidth: 0, minHeight: 0 }}>
              {hero}
            </div>
            <div
              className="phi-page-region-layout__content"
              style={{ minWidth: 0, minHeight: 0, flex: "1 1 auto", display: "flex", flexDirection: "column" }}
            >
              {content}
            </div>
          </div>
          <div
            className="phi-page-region-layout__sider"
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              alignSelf: "stretch",
              blockSize: "100%",
              inlineSize: "100%",
              minInlineSize: 0,
              maxInlineSize: "none",
            }}
          >
            {hasVisibleSiderRight ? (
              <div
                className="phi-page-region-layout__sider-slot"
                style={{
                  flex: "1 1 auto",
                  alignSelf: "stretch",
                  width: "100%",
                  height: "100%",
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {siderRight}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ gridColumn: 1, gridRow: 3, minWidth: 0 }}>
          {footerTop}
        </div>
      </div>
    </div>
  );
}
