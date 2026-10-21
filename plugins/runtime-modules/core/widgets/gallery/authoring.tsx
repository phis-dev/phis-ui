"use client";

import type { CSSProperties } from "react";

import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import {
  PHI_GALLERY_WIDGET_DEFINITION,
  type PhiCmsGalleryWidgetConfig,
} from "./config";
import { resolvePhiSpacingScaleValue } from "../../../../../components/widgets/config/spacing-options";
import { PHI_SEQUENCE_SETTINGS_DEFAULTS } from "../../../../../components/widgets/config/sequence-settings";
import { resolvePhiGalleryFrame } from "./defaults";

/** How many dots stand for "more than one page" on the canvas, which does not know how many pictures there are. */
const EDITOR_DOT_COUNT = 3;

/**
 * The Gallery's window, drawn empty.
 *
 * The Folder is read when the page is drawn, and what is in it then is what a visitor sees, so the
 * canvas fetches nothing. What it can show is everything the author set: as many frames as pictures
 * stand side by side, in the variant's proportion or the one set for originals, at their distance,
 * with the arrows and dots the controls ask for. A change in the Inspector is a change on the canvas,
 * which a sentence never was.
 */
function PhiGalleryWidgetEditor({ config }: { config: PhiCmsGalleryWidgetConfig | undefined }) {
  const { token } = usePhiConfig();
  const visibleCount = config?.visibleCount ?? PHI_SEQUENCE_SETTINGS_DEFAULTS.visibleCount;
  const controls = config?.controls ?? PHI_SEQUENCE_SETTINGS_DEFAULTS.controls;
  const showArrows = controls === "arrows" || controls === "both";
  const showDots = controls === "dots" || controls === "both";
  const folderId = config?.source?.params?.folderId;
  const hasFolder = folderId != null && folderId !== "";
  const { aspectRatio } = resolvePhiGalleryFrame(config);

  const arrowStyle: CSSProperties = {
    position: "absolute",
    insetBlockStart: "50%",
    transform: "translateY(-50%)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: token.controlHeight,
    height: token.controlHeight,
    borderRadius: "50%",
    background: token.colorBgElevated,
    boxShadow: token.boxShadowTertiary,
    color: token.colorTextSecondary,
    pointerEvents: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: token.marginXS, width: "100%", minWidth: 0 }}>
      <div style={{ position: "relative", minWidth: 0 }}>
        <div style={{ display: "flex", gap: resolvePhiSpacingScaleValue(config?.gap ?? PHI_SEQUENCE_SETTINGS_DEFAULTS.gap), minWidth: 0 }}>
          {Array.from({ length: visibleCount }, (_, index) => (
            <div
              key={index}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                aspectRatio,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: token.marginXXS,
                borderRadius: token.borderRadius,
                border: `1px dashed ${token.colorBorder}`,
                background: token.colorFillQuaternary,
                color: token.colorTextTertiary,
                fontSize: token.fontSizeLG,
                overflow: "hidden",
              }}
            >
              <PhiIcon name="picture" size="inherit" />
              <span style={{ fontSize: token.fontSizeSM }}>{index + 1}</span>
            </div>
          ))}
        </div>
        {showArrows ? (
          <>
            <span style={{ ...arrowStyle, insetInlineStart: token.marginXS }}><PhiIcon name="left" size="inherit" /></span>
            <span style={{ ...arrowStyle, insetInlineEnd: token.marginXS }}><PhiIcon name="right" size="inherit" /></span>
          </>
        ) : null}
      </div>
      {showDots ? (
        <div style={{ display: "flex", justifyContent: "center", gap: token.marginXXS }}>
          {Array.from({ length: EDITOR_DOT_COUNT }, (_, page) => (
            <span
              key={page}
              style={{
                width: page === 0 ? token.controlHeightXS : token.marginXS,
                height: token.marginXS,
                borderRadius: token.borderRadiusSM,
                background: page === 0 ? token.colorPrimary : token.colorFill,
              }}
            />
          ))}
        </div>
      ) : null}
      <PhiTypographyControl type="secondary" style={{ fontSize: token.fontSizeSM }}>
        {hasFolder
          ? "The public pictures of the chosen media folder, read when the page is drawn."
          : "No folder chosen yet. Pick one in the inspector; its public pictures are read when the page is drawn."}
      </PhiTypographyControl>
    </div>
  );
}

export const PHI_GALLERY_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiCmsGalleryWidgetConfig>(
  PHI_GALLERY_WIDGET_DEFINITION,
  ({ config }) => <PhiGalleryWidgetEditor config={config ?? undefined} />,
);
