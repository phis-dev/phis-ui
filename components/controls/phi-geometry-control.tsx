"use client";

import { Divider, Flex, Space, Typography } from "antd";

import type { PhiRenderableBlockSize } from "../../types/renderable-block";
import {
  normalizePhiGeometryWidgetConfig,
  type PhiCmsGeometryWidgetConfig,
} from "../widgets/config/geometry";
import {
  PHI_GEOMETRY_WIDGET_DEFAULT_LABELS,
  type PhiGeometryWidgetLabels,
} from "../widgets/label-types/geometry";
import { PhiDimensionControl } from "./phi-dimension-control";
import { PhiLengthControl } from "./phi-length-control";
import { PhiNumberControl } from "./phi-number-control";
import { PhiViewportVisibilityControl } from "./phi-viewport-visibility-control";
import { PhiSwitchControl } from "./phi-switch-control";
import type { PhiWidgetControlMode } from "../../types/widget-ui";

export type PhiGeometryControlProps = {
  value?: PhiCmsGeometryWidgetConfig | null;
  config?: PhiCmsGeometryWidgetConfig | null;
  disabled?: boolean;
  mode?: PhiWidgetControlMode;
  showSticky?: boolean;
  showOffsetTop?: boolean;
  showViewport?: boolean;
  labels?: PhiGeometryWidgetLabels;
  onChange?: (value: PhiCmsGeometryWidgetConfig) => void;
};

function readSizeFromGeometryConfig(config: PhiCmsGeometryWidgetConfig): PhiRenderableBlockSize {
  return {
    width: config.size?.width ?? null,
    height: config.size?.height ?? null,
  };
}

function readConstraintSizeFromGeometryConfig(
  config: PhiCmsGeometryWidgetConfig,
  kind: "min" | "max",
): PhiRenderableBlockSize {
  return kind === "min"
    ? {
        width: config.minSize?.width ?? null,
        height: config.minSize?.height ?? null,
      }
    : {
        width: config.maxSize?.width ?? null,
        height: config.maxSize?.height ?? null,
  };
}

function formatSizeValue(size: PhiRenderableBlockSize | null | undefined) {
  const width = size?.width;
  const height = size?.height;

  if (width == null && height == null) {
    return "Auto";
  }

  const widthLabel = width == null ? "auto" : String(width);
  const heightLabel = height == null ? "auto" : String(height);
  return `${widthLabel} × ${heightLabel}`;
}

function renderGeometryRow(label: string, content: React.ReactNode) {
  return (
    <Flex align="center" gap={12} wrap={false} style={{ width: "100%" }}>
      <Typography.Text style={{ flex: "0 0 128px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </Typography.Text>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>{content}</div>
    </Flex>
  );
}

export function PhiGeometryControl({
  value,
  config,
  disabled = false,
  mode = "control",
  showSticky = true,
  showOffsetTop = true,
  showViewport = true,
  labels = PHI_GEOMETRY_WIDGET_DEFAULT_LABELS,
  onChange,
}: PhiGeometryControlProps) {
  const currentValue = normalizePhiGeometryWidgetConfig(value ?? config ?? null);
  const isDisabled = disabled || !onChange;
  const currentSize = readSizeFromGeometryConfig(currentValue);
  const currentMinSize = readConstraintSizeFromGeometryConfig(currentValue, "min");
  const currentMaxSize = readConstraintSizeFromGeometryConfig(currentValue, "max");

  function emit(nextValue: PhiCmsGeometryWidgetConfig) {
    onChange?.(nextValue);
  }

  if (mode === "preview") {
    return (
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        {showSticky ? (
          <Flex align="center" justify="space-between" gap={12} wrap="wrap">
            <Typography.Text>{labels.fields.sticky}</Typography.Text>
            <PhiSwitchControl checked={currentValue.sticky ?? false} disabled />
          </Flex>
        ) : null}
        {showOffsetTop
          ? renderGeometryRow(
              labels.fields.offsetTop,
              <Typography.Text type="secondary">
                {currentValue.offsetTop != null
                  ? String(currentValue.offsetTop)
                  : labels.placeholders.auto}
              </Typography.Text>,
            )
          : null}
        {renderGeometryRow(
          labels.fields.size,
          <Typography.Text type="secondary">{formatSizeValue(currentSize)}</Typography.Text>,
        )}
        {renderGeometryRow(
          labels.fields.minSize,
          <Typography.Text type="secondary">{formatSizeValue(currentMinSize)}</Typography.Text>,
        )}
        {renderGeometryRow(
          labels.fields.maxSize,
          <Typography.Text type="secondary">{formatSizeValue(currentMaxSize)}</Typography.Text>,
        )}
        {renderGeometryRow(
          labels.fields.zIndex,
          <Typography.Text type="secondary">{String(currentValue.zIndex ?? 0)}</Typography.Text>,
        )}
        {showViewport
          ? renderGeometryRow(
              labels.fields.viewport,
              <PhiViewportVisibilityControl
                value={currentValue.viewportFlags}
                labels={labels.viewport}
              />,
            )
          : null}
      </Space>
    );
  }

  return (
    <Space orientation="vertical" size={10} style={{ width: "100%" }}>
      {showSticky
        ? renderGeometryRow(
            labels.fields.sticky,
            <PhiSwitchControl
              checked={currentValue.sticky ?? false}
              disabled={isDisabled}
              onChange={(checked) =>
                emit({
                  ...currentValue,
                  sticky: checked,
                })
              }
            />,
          )
        : null}

      {showOffsetTop
        ? renderGeometryRow(
            labels.fields.offsetTop,
            <PhiLengthControl
              value={currentValue.offsetTop}
              placeholder={labels.fields.offsetTop}
              disabled={isDisabled}
              onChange={(nextValue) =>
                emit({
                  ...currentValue,
                  offsetTop: nextValue ?? 0,
                })
              }
              style={{ width: "100%", maxWidth: 120, minWidth: 0 }}
            />,
          )
        : null}

      {showSticky || showOffsetTop ? <Divider dashed size="small" /> : null}

      {renderGeometryRow(
        labels.fields.size,
        <PhiDimensionControl
          value={currentSize}
          disabled={isDisabled}
          onChange={(nextSize) =>
            emit({
              ...currentValue,
              size: nextSize ?? undefined,
            })
          }
        />,
      )}

      {renderGeometryRow(
        labels.fields.minSize,
        <PhiDimensionControl
          value={currentMinSize}
          disabled={isDisabled}
          onChange={(nextSize) =>
            emit({
              ...currentValue,
              minSize: nextSize ?? undefined,
            })
          }
        />,
      )}

      {renderGeometryRow(
        labels.fields.maxSize,
        <PhiDimensionControl
          value={currentMaxSize}
          disabled={isDisabled}
          onChange={(nextSize) =>
            emit({
              ...currentValue,
              maxSize: nextSize ?? undefined,
            })
          }
        />,
      )}

      {renderGeometryRow(
        labels.fields.zIndex,
        <PhiNumberControl
          value={currentValue.zIndex ?? 0}
          step={1}
          precision={0}
          disabled={isDisabled}
          onChange={(nextValue) =>
            emit({
              ...currentValue,
              zIndex: nextValue ?? 0,
            })
          }
          style={{ width: "100%", maxWidth: 120, minWidth: 0 }}
        />,
      )}

      {showViewport
        ? renderGeometryRow(
            labels.fields.viewport,
            <PhiViewportVisibilityControl
              value={currentValue.viewportFlags}
              disabled={isDisabled}
              labels={labels.viewport}
              onChange={(viewportFlags) =>
                emit({
                  ...currentValue,
                  viewportFlags,
                })
              }
            />,
          )
        : null}
    </Space>
  );
}
