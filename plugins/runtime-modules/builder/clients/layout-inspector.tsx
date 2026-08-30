"use client";

import { useState } from "react";

import { Typography } from "antd";

import { PhiBackgroundControl, type PhiBackgroundControlProps } from "../../../../components/controls/phi-background-control";
import { PhiBorderControl } from "../../../../components/controls/phi-border-control";
import { PhiShadowControl } from "../../../../components/controls/phi-shadow-control";
import { PhiViewportVisibilityControl } from "../../../../components/controls/phi-viewport-visibility-control";
import { PhiPlacementMatrixControl } from "../../../../components/controls/phi-placement-matrix-control";
import { PhiSelectControl } from "../../../../components/controls/phi-select-control";
import { PhiNumberControl } from "../../../../components/controls/phi-number-control";
import type { PhiBackgroundWidgetLabels } from "../../../../components/widgets/label-types/background";
import type { PhiBorderWidgetLabels } from "../../../../components/widgets/label-types/border";
import { PhiInspectorSectionContent } from "./inspector-section-content";
import {
  resolvePhiLayoutSignalEndpoints,
  resolvePhiSignalEndpointCapabilities,
} from "../../../../components/widgets/signals/signal-endpoints";
import type { PhiPaddingWidgetLabels } from "../../../../components/widgets/label-types/padding";
import type { PhiAnchorWidgetPlacement } from "../../../../components/controls/phi-anchor-control-contract";
import type { PhiSignalsWidgetLabels } from "../../../../components/widgets/label-types/signals";
import type { PhiColorPickerLabels } from "../../../../components/widgets/label-types/color-picker";
import type {
  PhiCmsBorderWidgetConfig,
  PhiCmsGridLayoutSlotPlacementConfig,
  PhiCmsPaddingWidgetConfig,
} from "../../../../types/cms-config";
import type { PhiCmsBackgroundWidgetConfig } from "../../../../components/widgets/config/background";
import type {
  PhiCmsConfigField,
  PhiRuntimeModuleDataProviderDescriptor,
} from "../../../../types/cms-plugins";
import type { PhiCalendarAdapterDescriptor } from "../../../../types/calendar";
import { readPhiShadow, type PhiShadow } from "../../../../types/layout-style";
import {
  expandPhiBorderRadiusConfig,
  mergePhiBorderWidgetConfig,
  normalizePhiPaddingWidgetConfig,
} from "../../../../types/cms-config";
import {
  type PhiDeveloperBuilderMode,
  type PhiDeveloperBuilderNodeKind,
  type PhiDeveloperBuilderRegionDraft,
} from "../developer-workspace-types";
import {
  isPhiInspectorConfigFieldVisible,
  renderPhiInspectorPaddingConfigControl,
  renderPhiInspectorConfigField,
  renderPhiInspectorSettingsRow,
} from "./inspector-config-field";
import type {
  PhiSignalRoute,
} from "../../../../types/signals";
import {
  PhiInspectorSignalSection,
} from "./inspector-signal-section";
import type { PhiBuilderContainerMeta } from "../../../../types/builder";

const PHI_GAP_SM = "var(--ant-padding-sm)";

type PhiCmsChromeConfigField = Extract<PhiCmsConfigField, { type: "padding" | "background" | "border" | "shadow" | "slot-placement" }>;

function isPhiCmsChromeConfigField(field: PhiCmsConfigField): field is PhiCmsChromeConfigField {
  return (
    field.type === "padding"
    || field.type === "background"
    || field.type === "border"
    || field.type === "shadow"
    || field.type === "slot-placement"
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
  currentDraft?: PhiDeveloperBuilderRegionDraft | null;
  currentShadow?: PhiShadow | null;
  signalRouteScope?: PhiSignalRoute["scope"];
  selectedLayoutAnchor?: PhiAnchorWidgetPlacement | null;
  onLayoutAnchorChange?: (next: PhiAnchorWidgetPlacement) => void;
  onPaddingChange?: (next: PhiCmsPaddingWidgetConfig | null) => void;
  onBackgroundChange?: (next: PhiCmsBackgroundWidgetConfig) => void;
  onBorderChange?: (next: PhiCmsBorderWidgetConfig) => void;
  onShadowChange?: (next: PhiShadow) => void;
  onConfigChange?: (key: string, value: unknown) => void;
  paddingLabels?: PhiPaddingWidgetLabels;
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  signalsLabels?: PhiSignalsWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  dataProviderDescriptors?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors?: readonly PhiCalendarAdapterDescriptor[];
  renderMediaPicker?: PhiBackgroundControlProps["renderMediaPicker"];
};

export function PhiDeveloperBuilderLayoutInspectorWidgetClient({
  section,
  builderMode = "editor",
  selectedStructureNodeKind = null,
  selectedStructureDefaultConfig = null,
  selectedStructurePlugin = null,
  currentDraft = null,
  currentShadow = null,
  signalRouteScope = "layout",
  selectedLayoutAnchor = "center",
  onLayoutAnchorChange,
  onPaddingChange,
  onBackgroundChange,
  onBorderChange,
  onShadowChange,
  onConfigChange,
  paddingLabels,
  backgroundLabels,
  borderLabels,
  signalsLabels,
  colorPickerLabels,
  dataProviderDescriptors = [],
  calendarAdapterDescriptors = [],
  renderMediaPicker,
}: PhiDeveloperBuilderLayoutInspectorWidgetClientProps) {
  const isPreviewMode = builderMode === "preview";
  const isTargetKind = selectedStructureNodeKind === "layout";
  const resolvedLayoutAnchor = currentDraft?.rootNodeAnchor ?? selectedLayoutAnchor;
  const resolvedLayoutPadding = currentDraft?.rootNodePadding ?? null;
  const resolvedLayoutBackground = currentDraft?.rootNodeBackground ?? null;
  const resolvedLayoutShadow = currentShadow;
  const currentDraftRecord = currentDraft as Record<string, unknown> | null;
  const layoutDefaultConfigRecord = selectedStructureDefaultConfig;
  const currentLayoutConfigRecord = {
    ...(layoutDefaultConfigRecord ?? {}),
    ...(currentDraftRecord ?? {}),
  };
  const resolvedLayoutBorder = mergePhiBorderWidgetConfig(
    expandPhiBorderRadiusConfig(
      currentDraftRecord?.borderRadius ?? layoutDefaultConfigRecord?.borderRadius,
    ),
    currentDraft?.rootNodeBorder,
  );
  const resolvedLayoutPaddingDefaults = normalizePhiPaddingWidgetConfig(layoutDefaultConfigRecord);
  const declaredFields = selectedStructurePlugin?.fields ?? [];
  const settingsFields = declaredFields.filter(
    (field) => !isPhiCmsChromeConfigField(field) && isPhiInspectorConfigFieldVisible(field, currentLayoutConfigRecord),
  );
  const chromeFields = declaredFields
    .filter(isPhiCmsChromeConfigField)
    .filter((field) => isPhiInspectorConfigFieldVisible(field, currentLayoutConfigRecord))
    .filter((field) => field.type !== "slot-placement");
  const slotPlacementField =
    declaredFields
      .filter(isPhiCmsChromeConfigField)
      .filter((field) => isPhiInspectorConfigFieldVisible(field, currentLayoutConfigRecord))
      .find((field) => field.type === "slot-placement") ?? null;
  const resolveGridSlotPlacements = (value: unknown): PhiCmsGridLayoutSlotPlacementConfig[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return [];
      }

      const slotIndex = typeof entry.slotIndex === "number" ? entry.slotIndex : null;
      if (slotIndex == null) {
        return [];
      }

      const readResponsive = (key: "span" | "offset") => {
        const input = entry[key];
        if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
        const record = input as Record<string, unknown>;
        return {
          compact: typeof record.compact === "number" ? record.compact : undefined,
          medium: typeof record.medium === "number" ? record.medium : undefined,
          wide: typeof record.wide === "number" ? record.wide : undefined,
        };
      };

      return [
        {
          slotIndex,
          span: readResponsive("span"),
          offset: readResponsive("offset"),
        },
      ];
    });
  };
  const resolvedCurrentSlotPlacements = resolveGridSlotPlacements(currentDraftRecord?.slotPlacements);
  const resolvedSlotPlacements =
    resolvedCurrentSlotPlacements.length > 0
      ? resolvedCurrentSlotPlacements
      : resolveGridSlotPlacements(layoutDefaultConfigRecord?.slotPlacements);
  const gridSlotDefinitions = slotPlacementField
    ? [...(selectedStructurePlugin?.slots ?? [])].sort((left, right) => left.slotIndex - right.slotIndex)
    : [];
  const [selectedGridSlotOverride, setSelectedGridSlotOverride] = useState<number | null>(null);
  const selectedGridSlotIndex =
    selectedGridSlotOverride != null && gridSlotDefinitions.some((slot) => slot.slotIndex === selectedGridSlotOverride)
      ? selectedGridSlotOverride
      : gridSlotDefinitions[0]?.slotIndex ?? null;
  const updateGridSlotPlacement = (
    slotIndex: number,
    field: "span" | "offset",
    profile: "compact" | "medium" | "wide",
    value: number | null,
  ) => {
    if (!slotPlacementField || !onConfigChange) {
      return;
    }

    const nextSlotPlacements = [...resolvedSlotPlacements];
    const existingIndex = nextSlotPlacements.findIndex((entry) => entry.slotIndex === slotIndex);
    const existingEntry =
      existingIndex >= 0
        ? nextSlotPlacements[existingIndex]
        : {
            slotIndex,
          };
    const currentResponsive = existingEntry[field] ?? {};
    const nextResponsive = { ...currentResponsive, [profile]: value == null ? undefined : value };
    const nextEntry: PhiCmsGridLayoutSlotPlacementConfig = {
      ...existingEntry,
      [field]: Object.values(nextResponsive).some((entry) => entry != null) ? nextResponsive : undefined,
    };

    if (nextEntry.span == null && nextEntry.offset == null) {
      if (existingIndex >= 0) {
        nextSlotPlacements.splice(existingIndex, 1);
      }
    } else if (existingIndex >= 0) {
      nextSlotPlacements[existingIndex] = nextEntry;
    } else {
      nextSlotPlacements.push(nextEntry);
    }

    onConfigChange(
      slotPlacementField.key,
      nextSlotPlacements.length > 0 ? nextSlotPlacements.sort((left, right) => left.slotIndex - right.slotIndex) : null,
    );
  };
  const selectedGridSlotPlacement =
    selectedGridSlotIndex == null ? null : resolvedSlotPlacements.find((entry) => entry.slotIndex === selectedGridSlotIndex) ?? null;
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
  return (
    <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
      {!isTargetKind ? (
        <Typography.Text type="secondary">Select a layout to edit its geometry.</Typography.Text>
      ) : (
        <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
          <PhiInspectorSectionContent
            sectionKey={section === "chrome" ? "*" : section ?? "settings"}
            excludeSectionKeys={section === "chrome" ? ["settings", "anchor", "viewport", "background", "border", "shadow", "signals"] : undefined}
            sections={[
              ...(settingsFields.length > 0 || slotPlacementField
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
                              dataProviderDescriptors,
                              calendarAdapterDescriptors,
                              onChange: onConfigChange
                                ? (next) => {
                                    for (const [key, value] of Object.entries(next)) {
                                      onConfigChange(key, value);
                                    }
                                  }
                                : undefined,
                            }),
                          )}
                          {slotPlacementField && selectedGridSlotIndex != null
                            ? (
                                <>
                                  {renderPhiInspectorSettingsRow(
                                    "Slot",
                                    <PhiSelectControl
                                      options={gridSlotDefinitions.map((slot) => ({
                                          value: String(slot.slotIndex),
                                          label: String(slot.slotIndex),
                                      }))}
                                      value={String(selectedGridSlotIndex)}
                                      disabled={isPreviewMode}
                                      style={{ width: "100%" }}
                                      onChange={(nextValue) => setSelectedGridSlotOverride(Number(nextValue))}
                                    />,
                                    "grid-slot-index",
                                  )}
                                  {(["compact", "medium", "wide"] as const).flatMap((profile) => ([
                                    renderPhiInspectorSettingsRow(
                                      `${profile} span`,
                                      <PhiNumberControl
                                        disabled={isPreviewMode || !onConfigChange}
                                        value={selectedGridSlotPlacement?.span?.[profile] ?? null}
                                        min={1}
                                        max={24}
                                        precision={0}
                                        placeholder="6"
                                        style={{ width: "100%" }}
                                        onChange={(nextValue) => updateGridSlotPlacement(
                                          selectedGridSlotIndex,
                                          "span",
                                          profile,
                                          typeof nextValue === "number" && Number.isFinite(nextValue)
                                            ? Math.min(24, Math.max(1, Math.round(nextValue)))
                                            : null,
                                        )}
                                      />,
                                      `grid-slot-${profile}-span`,
                                    ),
                                    renderPhiInspectorSettingsRow(
                                      `${profile} offset`,
                                      <PhiNumberControl
                                        disabled={isPreviewMode || !onConfigChange}
                                        value={selectedGridSlotPlacement?.offset?.[profile] ?? null}
                                        min={0}
                                        max={23}
                                        precision={0}
                                        placeholder="0"
                                        style={{ width: "100%" }}
                                        onChange={(nextValue) => updateGridSlotPlacement(
                                          selectedGridSlotIndex,
                                          "offset",
                                          profile,
                                          typeof nextValue === "number" && Number.isFinite(nextValue)
                                            ? Math.min(23, Math.max(0, Math.round(nextValue)))
                                            : null,
                                        )}
                                      />,
                                      `grid-slot-${profile}-offset`,
                                    ),
                                  ]))}
                                </>
                              )
                            : null}
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
                      key: "background",
                      title: backgroundLabels?.title ?? "Background",
                      children: (
                        <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                          <PhiBackgroundControl
                            mode="control"
                            disabled={isPreviewMode}
                            value={resolvedLayoutBackground}
                            onChange={(background) => onBackgroundChange?.(background)}
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
                            value={resolvedLayoutBorder}
                            onChange={(border) => onBorderChange?.(border)}
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
                            value={resolvedLayoutShadow}
                            onChange={(shadow) => onShadowChange?.(shadow)}
                          />
                        </div>
                      ),
                    },
                    ...chromeFields.map((field) => ({
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
                    })),
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
