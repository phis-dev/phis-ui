"use client";

import { useEffect } from "react";

import { usePhiBaseLayoutOwnSlotController } from "../../../../components/layouts/phi-layout-slot-state";
import { PhiBackgroundControl, type PhiBackgroundControlProps } from "../../../../components/controls/phi-background-control";
import { PhiBorderControl } from "../../../../components/controls/phi-border-control";
import { PhiSurfaceControl } from "../../../../components/controls/phi-surface-control";
import type { PhiInspectorSurfaceLabels } from "./inspector-surface-labels";
import type { PhiInspectorWidgetLabels } from "../../../../components/widgets/label-types/inspector";
import { PhiShadowControl } from "../../../../components/controls/phi-shadow-control";
import { PhiViewportVisibilityControl } from "../../../../components/controls/phi-viewport-visibility-control";
import { PhiPlacementMatrixControl } from "../../../../components/controls/phi-placement-matrix-control";
import type { PhiBackgroundWidgetLabels } from "../../../../components/widgets/label-types/background";
import type { PhiBorderWidgetLabels } from "../../../../components/widgets/label-types/border";
import { PhiInspectorSectionContent } from "./inspector-section-content";
import { PhiGridPlacementSettings } from "./grid-placement-settings";
import {
  resolvePhiLayoutSignalEndpoints,
  resolvePhiSignalEndpointCapabilities,
} from "../../../../components/widgets/signals/signal-endpoints";
import type { PhiPaddingWidgetLabels } from "../../../../components/widgets/label-types/padding";
import type { PhiAnchorWidgetPlacement } from "../../../../components/controls/phi-anchor-control-contract";
import type { PhiSignalsWidgetLabels } from "../../../../components/widgets/label-types/signals";
import type { PhiColorPickerLabels } from "../../../../components/widgets/label-types/color-picker";
import type { PhiIconPickerControlLabels } from "../../../../components/widgets/label-types/icon-picker";
import type {
  PhiCmsBorderWidgetConfig,
  PhiCmsPaddingWidgetConfig,
} from "../../../../types/cms-config";
import type { PhiCmsBackgroundWidgetConfig } from "../../../../components/widgets/config/background";
import type {
  PhiCmsConfigField,
  PhiRuntimeModuleDataProviderDescriptor,
} from "../../../../types/cms-plugins";
import type { PhiCalendarAdapterDescriptor } from "../../../../types/calendar";
import type { PhiVideoProviderDescriptor } from "../../../../types/video";
import { readPhiShadow } from "../../../../types/layout-style";
import type { PhiSurface } from "../../../../types/surface";
import { normalizePhiPaddingWidgetConfig } from "../../../../types/cms-config";
import {
  type PhiDeveloperBuilderMode,
  type PhiDeveloperBuilderNodeKind,
  type PhiDeveloperBuilderStructureNodeDraft,
} from "../developer-workspace-types";
import {
  isPhiInspectorConfigFieldVisible,
  renderPhiInspectorPaddingConfigControl,
  renderPhiInspectorConfigField,
} from "./inspector-config-field";
import type {
  PhiSignalRoute,
} from "../../../../types/signals";
import {
  PhiInspectorSignalSection,
} from "./inspector-signal-section";
import type { PhiBuilderContainerMeta } from "../../../../types/builder";
import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../components/controls/phi-typography-control";

const PHI_GAP_SM = "var(--ant-padding-sm)";

type PhiCmsChromeConfigField = Extract<PhiCmsConfigField, { type: "padding" | "background" | "border" | "shadow" | "grid-placement" }>;

function isPhiCmsChromeConfigField(field: PhiCmsConfigField): field is PhiCmsChromeConfigField {
  return (
    field.type === "padding"
    || field.type === "background"
    || field.type === "border"
    || field.type === "shadow"
    || field.type === "grid-placement"
  );
}

function isCanonicalPaddingField(field: Extract<PhiCmsConfigField, { type: "padding" }>) {
  return (
    (field.paddingKey ?? "padding") === "padding"
    && (field.gapKey ?? "gap") === "gap"
    && (field.paddingTopKey ?? "paddingTop") === "paddingTop"
    && (field.paddingRightKey ?? "paddingRight") === "paddingRight"
    && (field.paddingBottomKey ?? "paddingBottom") === "paddingBottom"
    && (field.paddingLeftKey ?? "paddingLeft") === "paddingLeft"
  );
}

type PhiDeveloperBuilderLayoutInspectorWidgetClientProps = {
  section?: string;
  builderMode?: PhiDeveloperBuilderMode;
  selectedStructureNodeKind?: PhiDeveloperBuilderNodeKind | null;
  selectedStructureNodeTitle?: string | null;
  selectedStructureDefaultConfig?: Record<string, unknown> | null;
  selectedStructurePlugin?: PhiBuilderContainerMeta | null;
  currentDraft?: PhiDeveloperBuilderStructureNodeDraft | null;
  signalRouteScope?: PhiSignalRoute["scope"];
  selectedLayoutAnchor?: PhiAnchorWidgetPlacement | null;
  onLayoutAnchorChange?: (next: PhiAnchorWidgetPlacement) => void;
  onPaddingChange?: (next: PhiCmsPaddingWidgetConfig | null) => void;
  /** The whole next Surface, or `null` once nothing is left in it. */
  onSurfaceChange?: (next: PhiSurface | null) => void;
  onConfigChange?: (key: string, value: unknown) => void;
  paddingLabels?: PhiPaddingWidgetLabels;
  surfaceLabels?: PhiInspectorSurfaceLabels;
  gridLabels?: PhiInspectorWidgetLabels["grid"];
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  signalsLabels?: PhiSignalsWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  iconPickerLabels?: PhiIconPickerControlLabels;
  dataProviderDescriptors?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors?: readonly PhiCalendarAdapterDescriptor[];
  videoProviderDescriptors?: readonly PhiVideoProviderDescriptor[];
  renderMediaPicker?: PhiBackgroundControlProps["renderMediaPicker"];
};

export function PhiDeveloperBuilderLayoutInspectorWidgetClient({
  section,
  builderMode = "editor",
  selectedStructureNodeKind = null,
  selectedStructureDefaultConfig = null,
  selectedStructurePlugin = null,
  currentDraft = null,
  signalRouteScope = "layout",
  selectedLayoutAnchor = "center",
  onLayoutAnchorChange,
  onPaddingChange,
  onSurfaceChange,
  onConfigChange,
  paddingLabels,
  surfaceLabels,
  gridLabels,
  backgroundLabels,
  borderLabels,
  signalsLabels,
  colorPickerLabels,
  iconPickerLabels,
  dataProviderDescriptors = [],
  calendarAdapterDescriptors = [],
  videoProviderDescriptors = [],
  renderMediaPicker,
}: PhiDeveloperBuilderLayoutInspectorWidgetClientProps) {
  const isPreviewMode = builderMode === "preview";
  const isTargetKind = selectedStructureNodeKind === "layout";
  const resolvedLayoutAnchor = currentDraft?.rootNodeAnchor ?? selectedLayoutAnchor;
  const resolvedLayoutPadding = currentDraft?.rootNodePadding ?? null;
  const currentDraftRecord = currentDraft as Record<string, unknown> | null;
  const layoutDefaultConfigRecord = selectedStructureDefaultConfig;
  const currentLayoutConfigRecord = {
    ...(layoutDefaultConfigRecord ?? {}),
    ...(currentDraftRecord ?? {}),
  };
  const resolvedLayoutPaddingDefaults = normalizePhiPaddingWidgetConfig(layoutDefaultConfigRecord);
  const declaredFields = selectedStructurePlugin?.fields ?? [];
  const settingsFields = declaredFields.filter(
    (field) => !isPhiCmsChromeConfigField(field) && isPhiInspectorConfigFieldVisible(field, currentLayoutConfigRecord),
  );
  const chromeFields = declaredFields
    .filter(isPhiCmsChromeConfigField)
    .filter((field) => isPhiInspectorConfigFieldVisible(field, currentLayoutConfigRecord))
    .filter((field) => field.type !== "grid-placement");
  const gridPlacementField =
    declaredFields
      .filter(isPhiCmsChromeConfigField)
      .filter((field) => isPhiInspectorConfigFieldVisible(field, currentLayoutConfigRecord))
      .find((field) => field.type === "grid-placement") ?? null;

  /*
   * The Settings panel hides itself when the layout declares nothing for it. It is the Drawer's first
   * panel and open by default, so it is mounted and can act; the Drawer itself lists one Collapse item
   * per section and cannot know what a section will render.
   *
   * Nothing is decided before the layout's plugin has arrived. A plugin that is not resolved yet
   * declares no fields, which reads exactly like a layout that declares none -- and at mount that is
   * the ordinary state, so the panel hid itself over a question it could not yet answer. "Not known"
   * is not "empty".
   */
  const settingsAnswerIsKnown = selectedStructurePlugin != null;
  const settingsHasContent = !settingsAnswerIsKnown || !isTargetKind || section !== "settings"
    || settingsFields.length > 0 || gridPlacementField != null
    || chromeFields.some((field) => field.type !== "padding");
  const ownSlot = usePhiBaseLayoutOwnSlotController();
  useEffect(() => {
    if (!ownSlot) return;
    if (!settingsHasContent) {
      if (ownSlot.state !== "hidden") ownSlot.hide();
      return;
    }
    if (ownSlot.state === "hidden") ownSlot.show();
  }, [ownSlot, settingsHasContent]);
  const gridOccupiedSlotIndices = gridPlacementField && currentDraft
    ? [...new Set([...(currentDraft.rootNodeChildLayouts ?? []), ...(currentDraft.rootNodeChildWidgets ?? [])].map((child) => child.slotIndex))]
        .sort((left, right) => left - right)
    : [];
  const signalEndpoints = currentDraft?.rootNodeId == null
    ? []
    : resolvePhiLayoutSignalEndpoints({
        blockId: currentDraft.rootNodeId,
        label: currentDraft.rootNodeTitle ?? currentDraft.rootNodeId,
        typeKey: currentDraft.rootNodeTypeKey,
        kind: "layout",
        runtimeSignals: selectedStructurePlugin?.runtimeSignals ?? null,
        routeScope: signalRouteScope,
      });
  const signalCapabilities = resolvePhiSignalEndpointCapabilities(signalEndpoints);
  /*
   * The chrome fields a layout declares itself: its own padding, which has the Drawer's Paddings panel,
   * and anything else -- Split Card's two cards -- which lives in Settings with the layout's other fields.
   */
  const declaredChromeSections = chromeFields.map((field) => ({
    field,
    section: {
                      key: field.section ?? field.key,
                      title: field.label,
                      children: (
                        <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                          {field.type === "padding" ? (
                            renderPhiInspectorPaddingConfigControl({
                              field,
                              disabled: isPreviewMode || (!onPaddingChange && !onConfigChange),
                              config: isCanonicalPaddingField(field)
                                ? { ...(currentDraftRecord ?? {}), ...(resolvedLayoutPadding ?? {}) }
                                : currentDraftRecord ?? {},
                              defaultConfig: isCanonicalPaddingField(field)
                                ? { ...(layoutDefaultConfigRecord ?? {}), ...(resolvedLayoutPaddingDefaults ?? {}) }
                                : layoutDefaultConfigRecord,
                              labels: paddingLabels,
                              onChange: (padding, patch) => {
                                if (isCanonicalPaddingField(field)) {
                                  onPaddingChange?.(padding);
                                  return;
                                }

                                if (!onConfigChange) {
                                  return;
                                }

                                for (const [key, value] of Object.entries(patch)) {
                                  onConfigChange(key, value ?? null);
                                }
                              },
                            })
                          ) : field.type === "background" ? (
                            <PhiBackgroundControl
                              mode="control"
                              disabled={isPreviewMode || !onConfigChange}
                              value={(currentDraftRecord?.[field.key] as PhiCmsBackgroundWidgetConfig | null) ?? null}
                              config={(layoutDefaultConfigRecord?.[field.key] as PhiCmsBackgroundWidgetConfig | null) ?? null}
                              onChange={(background) => onConfigChange?.(field.key, background)}
                              labels={backgroundLabels}
                              colorPickerLabels={colorPickerLabels}
                              colorPickerPlacement="left"
                              renderMediaPicker={renderMediaPicker}
                            />
                          ) : field.type === "border" ? (
                            <PhiBorderControl
                              mode="control"
                              disabled={isPreviewMode || !onConfigChange}
                              value={(currentDraftRecord?.[field.key] as PhiCmsBorderWidgetConfig | null) ?? null}
                              config={(layoutDefaultConfigRecord?.[field.key] as PhiCmsBorderWidgetConfig | null) ?? null}
                              onChange={(border) => onConfigChange?.(field.key, border)}
                              labels={borderLabels}
                              colorPickerLabels={colorPickerLabels}
                              colorPickerPlacement="left"
                            />
                          ) : (
                            <PhiShadowControl
                              mode="control"
                              disabled={isPreviewMode || !onConfigChange}
                              value={
                                readPhiShadow(currentDraftRecord?.[field.key]) ??
                                readPhiShadow(layoutDefaultConfigRecord?.[field.key]) ??
                                null
                              }
                              onChange={(shadow) => onConfigChange?.(field.key, shadow)}
                            />
                          )}
                        </div>
                      ),
    },
  }));
  const declaredCardSections = declaredChromeSections.filter((entry) => entry.field.type !== "padding");
  return (
    <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
      {!isTargetKind ? (
        <PhiTypographyControl type="secondary">Select a layout to edit its geometry.</PhiTypographyControl>
      ) : (
        <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
          <PhiInspectorSectionContent
            sectionKey={section ?? "settings"}
            sections={[
              ...(settingsFields.length > 0 || gridPlacementField || declaredCardSections.length > 0
                ? [
                    {
                      key: "settings",
                      title: "Settings",
                      children: (
                        <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                          {settingsFields.map((field) =>
                            renderPhiInspectorConfigField({
                              field,
                              value: currentDraftRecord?.[field.key],
                              defaultValue: layoutDefaultConfigRecord?.[field.key],
                              config: currentDraftRecord ?? {},
                              defaultConfig: layoutDefaultConfigRecord,
                              disabled: isPreviewMode,
                              colorPickerLabels,
                              iconPickerLabels,
                              dataProviderDescriptors,
                              calendarAdapterDescriptors,
                              videoProviderDescriptors,
                              onChange: onConfigChange
                                ? (next) => {
                                    for (const [key, value] of Object.entries(next)) {
                                      onConfigChange(key, value);
                                    }
                                  }
                                : undefined,
                            }),
                          )}
                          {gridPlacementField ? (
                            <PhiGridPlacementSettings
                              config={currentDraftRecord ?? {}}
                              defaultConfig={layoutDefaultConfigRecord}
                              occupiedSlotIndices={gridOccupiedSlotIndices}
                              labels={gridLabels}
                              disabled={isPreviewMode}
                              onConfigChange={onConfigChange}
                            />
                          ) : null}
                          {declaredCardSections.map((entry) => (
                            <PhiFlexControl key={entry.section.key} vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
                              <PhiTypographyControl>{entry.section.title}</PhiTypographyControl>
                              {entry.section.children}
                            </PhiFlexControl>
                          ))}
                        </div>
                      ),
                    },
                  ]
                : []),
              {
                key: "anchor",
                title: "Anchor",
                children: (
                  <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%", justifyItems: "center" }}>
                    <PhiPlacementMatrixControl
                      mode="control"
                      disabled={isPreviewMode}
                      value={resolvedLayoutAnchor}
                      onChange={(next) => onLayoutAnchorChange?.(next)}
                    />
                  </div>
                ),
              },
              {
                key: "viewport",
                title: "Viewport",
                children: (
                  <PhiViewportVisibilityControl
                    disabled={isPreviewMode || !onConfigChange}
                    value={
                      typeof currentDraftRecord?.viewportFlags === "number"
                        ? currentDraftRecord.viewportFlags
                        : 0
                    }
                    onChange={(viewportFlags) => onConfigChange?.("viewportFlags", viewportFlags)}
                  />
                ),
              },
              ...[
                    {
                      key: "surface",
                      title: surfaceLabels?.section ?? "Surface",
                      children: (
                        <PhiSurfaceControl
                          disabled={isPreviewMode}
                          value={currentDraft?.rootNodeSurface ?? null}
                          onChange={(surface) => onSurfaceChange?.(surface)}
                          labels={surfaceLabels?.parts}
                          backgroundLabels={backgroundLabels}
                          borderLabels={borderLabels}
                          colorPickerLabels={colorPickerLabels}
                          renderMediaPicker={renderMediaPicker}
                        />
                      ),
                    },
                    ...declaredChromeSections
                      .filter((entry) => entry.field.type === "padding")
                      .map((entry) => entry.section),
              ],
              {
                key: "signals",
                title: signalsLabels?.title ?? "Signals",
                children: (
                  <PhiInspectorSignalSection
                    labels={signalsLabels}
                    emits={signalCapabilities.emits}
                    listens={signalCapabilities.listens}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
