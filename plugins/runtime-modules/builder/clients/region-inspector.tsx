"use client";

import { Typography } from "antd";

import { PhiBackgroundControl, type PhiBackgroundControlProps } from "../../../../components/controls/phi-background-control";
import { PhiBorderControl } from "../../../../components/controls/phi-border-control";
import { PhiGeometryControl } from "../../../../components/controls/phi-geometry-control";
import { PhiViewportVisibilityControl } from "../../../../components/controls/phi-viewport-visibility-control";
import { PhiShadowControl } from "../../../../components/controls/phi-shadow-control";
import { PhiPaddingControl } from "../../../../components/controls/phi-padding-control";
import type { PhiGeometryWidgetLabels } from "../../../../components/widgets/label-types/geometry";
import type { PhiBackgroundWidgetLabels } from "../../../../components/widgets/label-types/background";
import type { PhiBorderWidgetLabels } from "../../../../components/widgets/label-types/border";
import type { PhiColorPickerLabels } from "../../../../components/widgets/label-types/color-picker";
import type { PhiPaddingWidgetLabels } from "../../../../components/widgets/label-types/padding";
import { PhiInspectorSectionContent } from "./inspector-section-content";
import {
  getDefaultRegionDraft,
} from "../developer-region-drafts";
import type {
  PhiDeveloperBuilderMode,
  PhiDeveloperBuilderNodeKind,
  PhiDeveloperBuilderRegionDraft,
} from "../developer-workspace-types";
import {
  normalizePhiPaddingWidgetConfig,
  type PhiCmsPaddingWidgetConfig,
} from "../../../../types/cms-config";
const PHI_GAP_SM = "var(--ant-padding-sm)";

const REGION_PADDING_KEYS = [
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
] as const;

function patchRegionConfigPadding(
  regionConfig: Record<string, unknown> | null | undefined,
  padding: PhiCmsPaddingWidgetConfig | null,
) {
  const next = { ...(regionConfig ?? {}) };
  for (const key of REGION_PADDING_KEYS) {
    if (padding?.[key] == null) {
      delete next[key];
    } else {
      next[key] = padding[key];
    }
  }
  return next;
}

type PhiDeveloperBuilderRegionInspectorWidgetClientProps = {
  section?: string;
  builderMode?: PhiDeveloperBuilderMode;
  selectedStructureNodeKey?: string | null;
  selectedStructureNodeKind?: PhiDeveloperBuilderNodeKind | null;
  selectedRegionKey?: string | null;
  selectedRootRegionKey?: string | null;
  currentDraft?: PhiDeveloperBuilderRegionDraft | null;
  onDraftChange?: (patch: Partial<PhiDeveloperBuilderRegionDraft>) => void;
  geometryLabels?: PhiGeometryWidgetLabels;
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  paddingLabels?: PhiPaddingWidgetLabels;
  renderMediaPicker?: PhiBackgroundControlProps["renderMediaPicker"];
};

export function PhiDeveloperBuilderRegionInspectorWidgetClient({
  section,
  builderMode = "editor",
  selectedStructureNodeKind = null,
  selectedRegionKey = null,
  currentDraft = null,
  onDraftChange,
  geometryLabels,
  backgroundLabels,
  borderLabels,
  colorPickerLabels,
  paddingLabels,
  renderMediaPicker,
}: PhiDeveloperBuilderRegionInspectorWidgetClientProps) {
  const isPreviewMode = builderMode === "preview";
  const effectiveDraft = currentDraft ?? (selectedRegionKey ? getDefaultRegionDraft(selectedRegionKey) : null);

  function updateDraft(patch: Partial<PhiDeveloperBuilderRegionDraft>) {
    if (!selectedRegionKey || !effectiveDraft || !onDraftChange) {
      return;
    }

    onDraftChange(patch);
  }

  return (
    <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
      {!selectedRegionKey || !effectiveDraft || selectedStructureNodeKind !== "region" ? (
        <Typography.Text type="secondary">Select a region to edit its shell properties.</Typography.Text>
      ) : (
        <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
          <PhiInspectorSectionContent
            sectionKey={section ?? "geometry"}
            sections={[
              {
                key: "geometry",
                title: "Geometry",
                children: (
                  <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                    <PhiGeometryControl
                      mode="control"
                      disabled={isPreviewMode}
                      showViewport={false}
                      value={effectiveDraft}
                      onChange={(geometry) => updateDraft(geometry)}
                      labels={geometryLabels}
                    />
                  </div>
                ),
              },
              {
                key: "viewport",
                title: geometryLabels?.fields.viewport ?? "Viewport",
                children: (
                  <PhiViewportVisibilityControl
                    disabled={isPreviewMode || !onDraftChange}
                    value={effectiveDraft.viewportFlags}
                    labels={geometryLabels?.viewport}
                    onChange={(viewportFlags) => updateDraft({ viewportFlags })}
                  />
                ),
              },
              {
                key: "padding",
                title: paddingLabels?.title ?? "Padding",
                children: (
                  <PhiPaddingControl
                    mode="control"
                    disabled={isPreviewMode}
                    value={normalizePhiPaddingWidgetConfig(effectiveDraft.regionConfig)}
                    showGap={false}
                    onChange={(padding) => updateDraft({
                      regionConfig: patchRegionConfigPadding(effectiveDraft.regionConfig, padding),
                    })}
                    labels={paddingLabels}
                  />
                ),
              },
              {
                key: "background",
                title: backgroundLabels?.title ?? "Background",
                children: (
                  <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                    <PhiBackgroundControl
                      disabled={isPreviewMode}
                      value={{
                        ...effectiveDraft.background,
                        effect: effectiveDraft.effect ?? null,
                      }}
                      onChange={(background) => updateDraft({
                        effect: background.effect ?? null,
                        background: {
                          ...background,
                          effect: null,
                        },
                      })}
                      labels={backgroundLabels}
                      colorPickerLabels={colorPickerLabels}
                      colorPickerPlacement="left"
                      renderMediaPicker={renderMediaPicker}
                    />
                  </div>
                ),
              },
              {
                key: "border",
                title: borderLabels?.title ?? "Border",
                children: (
                  <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                    <PhiBorderControl
                      mode="control"
                      disabled={isPreviewMode}
                      value={effectiveDraft.border ?? null}
                      onChange={(border) => updateDraft({ border })}
                      labels={borderLabels}
                      colorPickerLabels={colorPickerLabels}
                      colorPickerPlacement="left"
                    />
                  </div>
                ),
              },
              {
                key: "shadow",
                title: "Shadow",
                children: (
                  <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                    <PhiShadowControl
                      mode="control"
                      disabled={isPreviewMode}
                      value={effectiveDraft.shadow ?? null}
                      onChange={(shadow) => updateDraft({ shadow })}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
