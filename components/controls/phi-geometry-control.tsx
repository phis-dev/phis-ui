"use client";

import { Divider, Flex, Typography } from "antd";

import type {
  PhiRenderableBlockResponsiveSize,
  PhiRenderableBlockSize,
  PhiResponsiveLength,
} from "../../types/renderable-block";
import {
  normalizePhiGeometryWidgetConfig,
  type PhiCmsGeometryWidgetConfig,
} from "../widgets/config/geometry";
import {
  PHI_GEOMETRY_WIDGET_DEFAULT_LABELS,
  type PhiGeometryWidgetLabels,
} from "../widgets/label-types/geometry";
import { PhiDimensionControl } from "./phi-dimension-control";
import { PhiFlexControl } from "./phi-flex-control";
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

/**
 * The base length of a stored one, and the way back.
 *
 * A stored length may name a value per profile (`PhiResponsiveLength`). This Control edits one value,
 * so it shows the base -- `compact`, the answer a narrow room gets -- and writes back into that entry
 * alone, leaving `medium` and `wide` where the author put them. Editing a profile value is the
 * Control's own step, designed in design/RESPONSIVE_BLOCK_GEOMETRY.md; until it exists, the rule here
 * is that this Control never silently flattens what it cannot show.
 */
function readBaseLength(value: PhiResponsiveLength | undefined) {
  return typeof value === "object" && value !== null ? value.compact ?? null : value ?? null;
}

function writeBaseLength(
  stored: PhiResponsiveLength | undefined,
  next: number | string | null | undefined,
): PhiResponsiveLength {
  if (typeof stored === "object" && stored !== null) {
    return next == null ? { ...stored, compact: undefined } : { ...stored, compact: next };
  }

  return next ?? null;
}

function readBasePair(pair: PhiRenderableBlockResponsiveSize | undefined): PhiRenderableBlockSize {
  return {
    width: readBaseLength(pair?.width),
    height: readBaseLength(pair?.height),
  };
}

function writeBasePair(
  stored: PhiRenderableBlockResponsiveSize | undefined,
  next: PhiRenderableBlockSize | null | undefined,
): PhiRenderableBlockResponsiveSize | undefined {
  const width = writeBaseLength(stored?.width, next?.width);
  const height = writeBaseLength(stored?.height, next?.height);
  return width == null && height == null ? undefined : { width, height };
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
  const currentSize = readBasePair(currentValue.size);
  const currentMinSize = readBasePair(currentValue.minSize);
  const currentMaxSize = readBasePair(currentValue.maxSize);

  function emit(nextValue: PhiCmsGeometryWidgetConfig) {
    onChange?.(nextValue);
  }

  if (mode === "preview") {
    return (
      <PhiFlexControl vertical gap={8} style={{ width: "100%" }}>
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
      </PhiFlexControl>
    );
  }

  return (
    <PhiFlexControl vertical gap={10} style={{ width: "100%" }}>
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
              size: writeBasePair(currentValue.size, nextSize),
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
              minSize: writeBasePair(currentValue.minSize, nextSize),
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
              maxSize: writeBasePair(currentValue.maxSize, nextSize),
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
    </PhiFlexControl>
  );
}
