"use client";

import { useEffect } from "react";

import { PhiGeometryControl } from "../../../../components/controls/phi-geometry-control";
import type { PhiBackgroundControlProps } from "../../../../components/controls/phi-background-control";
import { PhiSurfaceControl } from "../../../../components/controls/phi-surface-control";
import { usePhiBaseLayoutOwnSlotController } from "../../../../components/layouts/phi-layout-slot-state";
import type { PhiBackgroundWidgetLabels } from "../../../../components/widgets/label-types/background";
import type { PhiBorderWidgetLabels } from "../../../../components/widgets/label-types/border";
import type { PhiSurface } from "../../../../types/surface";
import type { PhiInspectorSurfaceLabels } from "./inspector-surface-labels";
import { PhiViewportVisibilityControl } from "../../../../components/controls/phi-viewport-visibility-control";
import type { PhiGeometryWidgetLabels } from "../../../../components/widgets/label-types/geometry";
import type { PhiSignalsWidgetLabels } from "../../../../components/widgets/label-types/signals";
import type { PhiColorPickerLabels } from "../../../../components/widgets/label-types/color-picker";
import type { PhiIconPickerControlLabels } from "../../../../components/widgets/label-types/icon-picker";
import type { PhiDeveloperBuilderMode, PhiDeveloperBuilderNodeKind } from "../developer-workspace-types";
import type { PhiCmsContentWidgetNode } from "../../../../types/cms";
import type { PhiCmsGeometryWidgetConfig } from "../../../../components/widgets/config/geometry";
import type { PhiRenderableBlockBase } from "../../../../types";
import type { PhiRuntimeModuleDataProviderDescriptor } from "../../../../types/cms-plugins";
import type { PhiCalendarAdapterDescriptor } from "../../../../types/calendar";
import type { PhiVideoProviderDescriptor } from "../../../../types/video";
import { mergeRenderableBlockDefaults } from "../../../../helpers/renderable-block-serialization";
import type { PhiBuilderWidgetMeta } from "../../../../types/builder";
import {
  resolvePhiBuilderPluginDefaultConfig,
  resolvePhiBuilderWidgetDraftConfig,
} from "../plugin-metas";
import type {
  PhiSignalPluginMeta,
  PhiSignalRoute,
} from "../../../../types/signals";
import {
  resolvePhiSignalEndpointCapabilities,
  resolvePhiWidgetSignalEndpoints,
} from "../../../../components/widgets/signals/signal-endpoints";
import { PhiInspectorSectionContent } from "./inspector-section-content";
import {
  PhiInspectorSignalSection,
} from "./inspector-signal-section";
import {
  buildPhiInspectorConfigPathPatch,
  isPhiInspectorConfigFieldVisible,
  readPhiInspectorConfigPathValue,
  renderPhiInspectorConfigField,
  renderPhiInspectorSwitchRow,
  resolvePhiInspectorDimensionValue,
  resolvePhiInspectorFieldLock,
  type PhiInspectorWidgetReferenceOption,
} from "./inspector-config-field";
import { PhiTypographyControl } from "../../../../components/controls/phi-typography-control";
import { PhiCmsFlags } from "../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../helpers/flags";

const PHI_GAP_SM = "var(--ant-padding-sm)";

type PhiDeveloperBuilderWidgetInspectorWidgetClientProps = {
  section?: string;
  builderMode?: PhiDeveloperBuilderMode;
  selectedStructureNodeKey?: string | null;
  selectedStructureNodeKind?: PhiDeveloperBuilderNodeKind | null;
  selectedStructureNodeTitle?: string | null;
  selectedStructureWidgetMeta?: PhiBuilderWidgetMeta | null;
  currentDraft?: PhiCmsContentWidgetNode | null;
  widgetReferenceOptions?: PhiInspectorWidgetReferenceOption[];
  signalRouteScope?: PhiSignalRoute["scope"];
  onConfigChange?: (next: Record<string, unknown>) => void;
  onGeometryChange?: (next: PhiCmsGeometryWidgetConfig) => void;
  /** The whole next Surface, or `null` once nothing is left in it. */
  onSurfaceChange?: (next: PhiSurface | null) => void;
  /** Sets the node's `NoTranslate` flag; offered for a Widget that translates its own text. */
  onTranslateChange?: (translate: boolean) => void;
  geometryLabels?: PhiGeometryWidgetLabels;
  surfaceLabels?: PhiInspectorSurfaceLabels;
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  renderMediaPicker?: PhiBackgroundControlProps["renderMediaPicker"];
  signalsLabels?: PhiSignalsWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  iconPickerLabels?: PhiIconPickerControlLabels;
  dataProviderDescriptors?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors?: readonly PhiCalendarAdapterDescriptor[];
  videoProviderDescriptors?: readonly PhiVideoProviderDescriptor[];
};

export function PhiDeveloperBuilderWidgetInspectorWidgetClient({
  section,
  builderMode = "editor",
  selectedStructureNodeKey = null,
  selectedStructureNodeKind = null,
  selectedStructureNodeTitle = null,
  selectedStructureWidgetMeta = null,
  currentDraft = null,
  widgetReferenceOptions = [],
  signalRouteScope = "widget",
  onConfigChange,
  onGeometryChange,
  onSurfaceChange,
  onTranslateChange,
  geometryLabels,
  surfaceLabels,
  backgroundLabels,
  borderLabels,
  renderMediaPicker,
  signalsLabels,
  colorPickerLabels,
  iconPickerLabels,
  dataProviderDescriptors = [],
  calendarAdapterDescriptors = [],
  videoProviderDescriptors = [],
}: PhiDeveloperBuilderWidgetInspectorWidgetClientProps) {
  const isPreviewMode = builderMode === "preview";
  const isTargetKind = selectedStructureNodeKind === "widget";
  const currentWidgetConfig = resolvePhiBuilderWidgetDraftConfig<PhiRenderableBlockBase>(
    selectedStructureWidgetMeta,
    currentDraft?.config as Record<string, unknown> | null | undefined,
  );
  const currentBlockConfig = mergeRenderableBlockDefaults(
    currentWidgetConfig as Partial<PhiRenderableBlockBase> | null | undefined,
  );
  const widgetDefaultConfigRecord = resolvePhiBuilderPluginDefaultConfig(selectedStructureWidgetMeta);
  const currentWidgetSettingsConfigRecord = {
    ...(widgetDefaultConfigRecord ?? {}),
    ...((currentDraft?.config as Record<string, unknown> | null | undefined) ?? {}),
  };
  const runtimeSignals: PhiSignalPluginMeta | null | undefined =
    selectedStructureWidgetMeta?.runtimeSignals ?? null;
  const currentWidgetConfigRecord = currentWidgetConfig as Record<string, unknown>;
  const signalEndpoints = currentDraft
    ? resolvePhiWidgetSignalEndpoints({
        blockId: currentDraft.id,
        label: currentDraft.label ?? currentDraft.id,
        typeKey: selectedStructureWidgetMeta?.typeKey,
        config: currentWidgetConfigRecord,
        runtimeSignals,
        signalSubcontrols: selectedStructureWidgetMeta?.signalSubcontrols,
        surfacePolicy: selectedStructureWidgetMeta?.surface,
        routeScope: signalRouteScope,
      })
    : [];
  const signalCapabilities = resolvePhiSignalEndpointCapabilities(signalEndpoints);
  const settingsFields = (selectedStructureWidgetMeta?.fields ?? []).filter(
    (field) => isPhiInspectorConfigFieldVisible(field, currentWidgetSettingsConfigRecord),
  );
  /*
   * Only a Widget that asks for a Surface (`surface: "frame"` or `"own"`) gets the Surface section; for
   * the rest the panel hides itself, the way the Layout Settings panel does when there is nothing to set.
   * Nothing is decided before the Widget's metadata has arrived -- not known is not "none".
   */
  const surfaceSectionHidden = section === "surface" && isTargetKind
    && selectedStructureWidgetMeta != null && (selectedStructureWidgetMeta.surface ?? "none") === "none";
  const ownSlot = usePhiBaseLayoutOwnSlotController();
  useEffect(() => {
    if (!ownSlot || section !== "surface") return;
    if (surfaceSectionHidden) {
      if (ownSlot.state !== "hidden") ownSlot.hide();
      return;
    }
    if (ownSlot.state === "hidden") ownSlot.show();
  }, [ownSlot, section, surfaceSectionHidden]);
  /* A heading over the very first field names the Widget's own group rather than starting another. */
  const headedFieldIndex = settingsFields.findIndex((field, index) => index > 0 && field.heading != null);
  const firstHeadedFieldIndex = headedFieldIndex === -1 ? settingsFields.length : headedFieldIndex;
  const renderSettingsField = (field: (typeof settingsFields)[number]) => {
    const lock = resolvePhiInspectorFieldLock(
      field,
      selectedStructureWidgetMeta?.fields ?? [],
      currentWidgetSettingsConfigRecord,
    );
    return renderPhiInspectorConfigField({
      field,
      value: lock ? lock.value : readPhiInspectorConfigPathValue(currentWidgetSettingsConfigRecord, field.key),
      defaultValue: readPhiInspectorConfigPathValue(widgetDefaultConfigRecord, field.key),
      config: currentWidgetSettingsConfigRecord,
      defaultConfig: widgetDefaultConfigRecord,
      disabled: isPreviewMode || lock != null,
      widgetReferenceOptions,
      colorPickerLabels,
      iconPickerLabels,
      dataProviderDescriptors,
      calendarAdapterDescriptors,
      videoProviderDescriptors,
      onChange: (next) => {
        const patch = buildPhiInspectorConfigPathPatch(currentWidgetSettingsConfigRecord, next);
        onConfigChange?.(patch);
      },
    });
  };
  const geometryValue: PhiCmsGeometryWidgetConfig = {
    sticky: false,
    offsetTop: 0,
    size: resolvePhiInspectorDimensionValue(currentBlockConfig.size ?? null) ?? undefined,
    minSize: resolvePhiInspectorDimensionValue(currentBlockConfig.minSize ?? null) ?? undefined,
    maxSize: resolvePhiInspectorDimensionValue(currentBlockConfig.maxSize ?? null) ?? undefined,
    zIndex: typeof currentBlockConfig.zIndex === "number" ? currentBlockConfig.zIndex : 0,
    viewportFlags: currentBlockConfig.viewportFlags,
  };
  return (
    <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
      {!isTargetKind || !currentDraft ? (
        <PhiTypographyControl type="secondary">Select a widget to edit its geometry.</PhiTypographyControl>
      ) : (
        <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
          <PhiInspectorSectionContent
            sectionKey={section ?? "settings"}
            sections={[
              {
                key: "settings",
                title: "Settings",
                children: selectedStructureWidgetMeta == null ? (
                  <PhiTypographyControl type="danger">
                    Widget metadata for {selectedStructureNodeKey ?? selectedStructureNodeTitle ?? "this widget"} is not available from the active Canvas modules.
                  </PhiTypographyControl>
                ) : settingsFields.length === 0 ? (
                  <PhiTypographyControl type="secondary">
                    This widget does not declare configurable settings.
                  </PhiTypographyControl>
                ) : (
                  <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                    {/*
                      * "Translate text" closes the Widget's own fields, before the next headed group:
                      * it is about the words above it, and a group under a heading -- the Badge -- is
                      * a part of its own.
                      */}
                    {settingsFields.slice(0, firstHeadedFieldIndex).map(renderSettingsField)}
                    {selectedStructureWidgetMeta.translatesOwnText
                      ? renderPhiInspectorSwitchRow({
                        key: "translate-text",
                        label: "Translate text",
                        checked: !hasPhiFlag(currentDraft?.flags ?? 0, PhiCmsFlags.NoTranslate),
                        disabled: isPreviewMode,
                        ...(onTranslateChange ? { onChange: onTranslateChange } : {}),
                      })
                      : null}
                    {settingsFields.slice(firstHeadedFieldIndex).map(renderSettingsField)}
                  </div>
                ),
              },
              {
                key: "geometry",
                title: geometryLabels?.title ?? "Geometry",
                children: (
                  <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                    <PhiGeometryControl
                      mode="control"
                      disabled={isPreviewMode}
                      showSticky={false}
                      showOffsetTop={false}
                      showViewport={false}
                      value={geometryValue}
                      onChange={(geometry) => onGeometryChange?.(geometry)}
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
                    disabled={isPreviewMode || !onGeometryChange}
                    value={geometryValue.viewportFlags}
                    labels={geometryLabels?.viewport}
                    onChange={(viewportFlags) =>
                      onGeometryChange?.({
                        ...geometryValue,
                        viewportFlags,
                      })
                    }
                  />
                ),
              },
              {
                key: "surface",
                title: surfaceLabels?.section ?? "Surface",
                children: (
                  <PhiSurfaceControl
                    disabled={isPreviewMode}
                    value={currentBlockConfig.surface ?? null}
                    onChange={(surface) => onSurfaceChange?.(surface)}
                    labels={surfaceLabels?.parts}
                    backgroundLabels={backgroundLabels}
                    borderLabels={borderLabels}
                    colorPickerLabels={colorPickerLabels}
                    renderMediaPicker={renderMediaPicker}
                  />
                ),
              },
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
