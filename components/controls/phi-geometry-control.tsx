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
import { useState } from "react";

import { PhiDimensionControl } from "./phi-dimension-control";
import { PhiSegmentedControl } from "./phi-segmented-control";
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
  /**
   * Offer a value per profile for size, minimum and maximum (design/RESPONSIVE_BLOCK_GEOMETRY.md). Off
   * for a Region, whose own geometry is not a slot child's and answers at one value.
   */
  showProfiles?: boolean;
  labels?: PhiGeometryWidgetLabels;
  onChange?: (value: PhiCmsGeometryWidgetConfig) => void;
};

/** The three rooms a length may answer differently, narrow first -- the order the Control asks in. */
export const PHI_GEOMETRY_PROFILES = ["compact", "medium", "wide"] as const;

export type PhiGeometryProfile = (typeof PHI_GEOMETRY_PROFILES)[number];

type PhiStoredLength = number | string;

function isProfileLength(value: PhiResponsiveLength | undefined): value is Exclude<PhiResponsiveLength, PhiStoredLength | null> {
  return typeof value === "object" && value !== null;
}

/**
 * The value a stored length states at one profile, and what it falls back to there.
 *
 * `stated` is the entry the author wrote for that profile -- for a plain length, the length at
 * `compact` and nothing at the other two. `inherited` is what applies when the entry is empty: the
 * cascade runs upward from `compact` (`medium` falls back to it, `wide` to `medium`), the reading
 * `resolvePhiRenderableBlockGeometry` makes, so the Control shows the value that stands there as the
 * placeholder rather than an empty field that looks like "auto".
 */
export function readPhiGeometryProfileLength(
  value: PhiResponsiveLength | undefined,
  profile: PhiGeometryProfile,
): { stated: PhiStoredLength | null; inherited: PhiStoredLength | null } {
  if (!isProfileLength(value)) {
    const plain = value ?? null;
    return profile === "compact" ? { stated: plain, inherited: null } : { stated: null, inherited: plain };
  }

  const stated = value[profile] ?? null;
  const inherited =
    profile === "compact"
      ? null
      : profile === "medium"
        ? value.compact ?? null
        : value.medium ?? value.compact ?? null;
  return { stated, inherited };
}

/**
 * One profile's entry written into a stored length, the other two left where the author put them.
 *
 * The stored form stays the smallest one that means the same: a length that names only `compact` is
 * the plain length -- the same at every profile, byte for byte what a config without profiles holds --
 * and one that names nothing is nothing.
 */
export function writePhiGeometryProfileLength(
  stored: PhiResponsiveLength | undefined,
  profile: PhiGeometryProfile,
  next: PhiStoredLength | null | undefined,
): PhiResponsiveLength {
  const entries: Partial<Record<PhiGeometryProfile, PhiStoredLength>> = isProfileLength(stored)
    ? { ...stored }
    : stored == null
      ? {}
      : { compact: stored };

  if (next == null) {
    delete entries[profile];
  } else {
    entries[profile] = next;
  }

  const named = PHI_GEOMETRY_PROFILES.filter((key) => entries[key] != null);
  if (named.length === 0) {
    return null;
  }
  if (named.length === 1 && named[0] === "compact") {
    return entries.compact ?? null;
  }
  return Object.fromEntries(named.map((key) => [key, entries[key]]));
}

function readProfilePair(pair: PhiRenderableBlockResponsiveSize | undefined, profile: PhiGeometryProfile) {
  const width = readPhiGeometryProfileLength(pair?.width, profile);
  const height = readPhiGeometryProfileLength(pair?.height, profile);
  return {
    value: { width: width.stated, height: height.stated } satisfies PhiRenderableBlockSize,
    inherited: { width: width.inherited, height: height.inherited } satisfies PhiRenderableBlockSize,
  };
}

function writeProfilePair(
  stored: PhiRenderableBlockResponsiveSize | undefined,
  profile: PhiGeometryProfile,
  next: PhiRenderableBlockSize | null | undefined,
): PhiRenderableBlockResponsiveSize | undefined {
  const width = writePhiGeometryProfileLength(stored?.width, profile, next?.width);
  const height = writePhiGeometryProfileLength(stored?.height, profile, next?.height);
  return width == null && height == null ? undefined : { width, height };
}

/** Whether any of the three fields names a value at a profile other than `compact`. */
function statesProfiles(value: PhiCmsGeometryWidgetConfig) {
  return [value.size, value.minSize, value.maxSize].some((pair) =>
    isProfileLength(pair?.width) || isProfileLength(pair?.height));
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
  showProfiles = true,
  labels = PHI_GEOMETRY_WIDGET_DEFAULT_LABELS,
  onChange,
}: PhiGeometryControlProps) {
  const currentValue = normalizePhiGeometryWidgetConfig(value ?? config ?? null);
  const isDisabled = disabled || !onChange;
  /*
   * Narrow first: the cascade runs upward from `compact`, so a block that names only `wide` has no
   * stated size below 610 and is `auto` there -- the answer a narrow room gets is the one to set first.
   */
  const [selectedProfile, setSelectedProfile] = useState<PhiGeometryProfile>("compact");
  const profile: PhiGeometryProfile = showProfiles ? selectedProfile : "compact";
  const currentSize = readProfilePair(currentValue.size, profile);
  const currentMinSize = readProfilePair(currentValue.minSize, profile);
  const currentMaxSize = readProfilePair(currentValue.maxSize, profile);
  /* An empty entry above `compact` shows what stands there through the cascade, not a bare "Width". */
  const placeholder = (inherited: number | string | null | undefined) =>
    inherited == null ? undefined : String(inherited);

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
          <Typography.Text type="secondary">{formatSizeValue(readProfilePair(currentValue.size, "compact").value)}{statesProfiles(currentValue) ? " …" : ""}</Typography.Text>,
        )}
        {renderGeometryRow(
          labels.fields.minSize,
          <Typography.Text type="secondary">{formatSizeValue(readProfilePair(currentValue.minSize, "compact").value)}</Typography.Text>,
        )}
        {renderGeometryRow(
          labels.fields.maxSize,
          <Typography.Text type="secondary">{formatSizeValue(readProfilePair(currentValue.maxSize, "compact").value)}</Typography.Text>,
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

      {showProfiles
        ? renderGeometryRow(
            labels.fields.profile,
            <PhiSegmentedControl<PhiGeometryProfile>
              value={selectedProfile}
              size="small"
              block
              options={PHI_GEOMETRY_PROFILES.map((option) => ({
                value: option,
                label: labels.profiles[option],
              }))}
              onChange={(next) => setSelectedProfile(next)}
            />,
          )
        : null}

      {renderGeometryRow(
        labels.fields.size,
        <PhiDimensionControl
          value={currentSize.value}
          widthPlaceholder={placeholder(currentSize.inherited.width)}
          heightPlaceholder={placeholder(currentSize.inherited.height)}
          disabled={isDisabled}
          onChange={(nextSize) =>
            emit({
              ...currentValue,
              size: writeProfilePair(currentValue.size, profile, nextSize),
            })
          }
        />,
      )}

      {renderGeometryRow(
        labels.fields.minSize,
        <PhiDimensionControl
          value={currentMinSize.value}
          widthPlaceholder={placeholder(currentMinSize.inherited.width)}
          heightPlaceholder={placeholder(currentMinSize.inherited.height)}
          disabled={isDisabled}
          onChange={(nextSize) =>
            emit({
              ...currentValue,
              minSize: writeProfilePair(currentValue.minSize, profile, nextSize),
            })
          }
        />,
      )}

      {renderGeometryRow(
        labels.fields.maxSize,
        <PhiDimensionControl
          value={currentMaxSize.value}
          widthPlaceholder={placeholder(currentMaxSize.inherited.width)}
          heightPlaceholder={placeholder(currentMaxSize.inherited.height)}
          disabled={isDisabled}
          onChange={(nextSize) =>
            emit({
              ...currentValue,
              maxSize: writeProfilePair(currentValue.maxSize, profile, nextSize),
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
