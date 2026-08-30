"use client";

import { Typography } from "antd";

import { PhiGeometryControl } from "../../../../components/controls/phi-geometry-control";
import { PhiViewportVisibilityControl } from "../../../../components/controls/phi-viewport-visibility-control";
import type { PhiGeometryWidgetLabels } from "../../../../components/widgets/label-types/geometry";
import type { PhiSignalsWidgetLabels } from "../../../../components/widgets/label-types/signals";
import type { PhiColorPickerLabels } from "../../../../components/widgets/label-types/color-picker";
import type { PhiDeveloperBuilderMode, PhiDeveloperBuilderNodeKind } from "../developer-workspace-types";
import type { PhiCmsContentWidgetNode } from "../../../../types/cms";
import type { PhiCmsGeometryWidgetConfig } from "../../../../components/widgets/config/geometry";
import type { PhiRenderableBlockBase } from "../../../../types";
import type { PhiRuntimeModuleDataProviderDescriptor } from "../../../../types/cms-plugins";
import type { PhiCalendarAdapterDescriptor } from "../../../../types/calendar";
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
  resolvePhiInspectorDimensionValue,
  type PhiInspectorWidgetReferenceOption,
} from "./inspector-config-field";

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
  geometryLabels?: PhiGeometryWidgetLabels;
  signalsLabels?: PhiSignalsWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  dataProviderDescriptors?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors?: readonly PhiCalendarAdapterDescriptor[];
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
  geometryLabels,
  signalsLabels,
  colorPickerLabels,
  dataProviderDescriptors = [],
  calendarAdapterDescriptors = [],
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
        routeScope: signalRouteScope,
      })
    : [];
  const signalCapabilities = resolvePhiSignalEndpointCapabilities(signalEndpoints);
  const settingsFields = (selectedStructureWidgetMeta?.fields ?? []).filter(
    (field) => isPhiInspectorConfigFieldVisible(field, currentWidgetSettingsConfigRecord),
  );
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
        <Typography.Text type="secondary">Select a widget to edit its geometry.</Typography.Text>
      ) : (
        <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
          <PhiInspectorSectionContent
            sectionKey={section ?? "settings"}
            sections={[
              {
                key: "settings",
                title: "Settings",
                children: selectedStructureWidgetMeta == null ? (
                  <Typography.Text type="danger">
                    Widget metadata for {selectedStructureNodeKey ?? selectedStructureNodeTitle ?? "this widget"} is not available from the active Canvas modules.
                  </Typography.Text>
                ) : settingsFields.length === 0 ? (
                  <Typography.Text type="secondary">
                    This widget does not declare configurable settings.
                  </Typography.Text>
                ) : (
                  <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
                    {settingsFields.map((field) =>
                      renderPhiInspectorConfigField({
                        field,
                        value: readPhiInspectorConfigPathValue(currentWidgetSettingsConfigRecord, field.key),
                        defaultValue: readPhiInspectorConfigPathValue(widgetDefaultConfigRecord, field.key),
                        config: currentWidgetSettingsConfigRecord,
                        defaultConfig: widgetDefaultConfigRecord,
                        disabled: isPreviewMode,
                        widgetReferenceOptions,
                        colorPickerLabels,
                        dataProviderDescriptors,
                        calendarAdapterDescriptors,
                        onChange: (next) => {
                          const patch = buildPhiInspectorConfigPathPatch(currentWidgetSettingsConfigRecord, next);
                          onConfigChange?.(patch);
                        },
                      }),
                    )}
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
