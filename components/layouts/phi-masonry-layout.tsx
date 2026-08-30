import type { CSSProperties, ReactNode } from "react";

import { normalizePhiCssSize } from "./phi-layout-contract";
import { PhiBaseLayout, type PhiBaseLayoutProps } from "./phi-base-layout";
import { resolvePhiLayoutDefaults } from "../../helpers/cms-layout-defaults";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../helpers/layout-authoring-markers";

const PHI_MASONRY_LAYOUT_DEFAULTS = resolvePhiLayoutDefaults("masonry");

export type PhiMasonryLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  columns?: number;
  minColumnWidth?: CSSProperties["minWidth"];
  gap?: CSSProperties["gap"];
  style?: CSSProperties;
};

export function PhiMasonryLayout({
  slots,
  ...layoutProps
}: PhiMasonryLayoutProps) {
  const {
    columns = PHI_MASONRY_LAYOUT_DEFAULTS.columns as number,
    minColumnWidth,
    gap = PHI_MASONRY_LAYOUT_DEFAULTS.gap as number | string,
    renderMode,
    style,
    layoutKind = "masonry",
  } = layoutProps;
  const resolvedGap = normalizePhiCssSize(gap) ?? (PHI_MASONRY_LAYOUT_DEFAULTS.gap as number | string);
  const resolvedColumns = Number.isFinite(columns) && columns > 0 ? Math.floor(columns) : 3;
  const resolvedMinColumnWidth = normalizePhiCssSize(minColumnWidth);
  const isAuthoringRender = isPhiLayoutAuthoringRender(layoutProps);

  return (
    <PhiBaseLayout
      {...layoutProps}
      layoutKind={layoutKind}
      slots={slots.map((slot, index) => (
        <div
          key={index}
          className={phiLayoutSlotClassName(isAuthoringRender)}
          data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, true)}
          style={{
            display: "inline-block",
            width: "100%",
            minWidth: 0,
            breakInside: "avoid",
            pageBreakInside: "avoid",
            marginBottom: resolvedGap,
          }}
        >
          {slot}
        </div>
      ))}
      renderMode={renderMode}
      gap={resolvedGap}
      style={{
        minWidth: 0,
        columnCount: resolvedMinColumnWidth ? undefined : resolvedColumns,
        columnWidth: resolvedMinColumnWidth,
        columnGap: resolvedGap,
        columnFill: "balance",
        ...style,
      }}
    >
    </PhiBaseLayout>
  );
}
