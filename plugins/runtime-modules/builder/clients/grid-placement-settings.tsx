"use client";

import { useState } from "react";

import { PhiSelectControl } from "../../../../components/controls/phi-select-control";
import { PhiSliderControl } from "../../../../components/controls/phi-slider-control";
import { PhiDividerControl } from "../../../../components/controls/phi-divider-control";
import {
  PHI_GRID_COLUMN_COUNTS,
  PHI_GRID_LAYOUT_PROFILES,
  resolvePhiGridColumns,
  type PhiGridColumnCount,
  type PhiGridLayoutProfile,
} from "../../../../components/layouts/phi-grid-contract";
import type { PhiCmsGridLayoutSlotPlacementConfig } from "../../../../types/cms-config";
import type { PhiResponsiveValue } from "../../../../types/responsive";
import {
  PHI_INSPECTOR_WIDGET_DEFAULT_LABELS,
  type PhiInspectorWidgetLabels,
} from "../../../../components/widgets/label-types/inspector";
import { renderPhiInspectorSettingsRow } from "./inspector-config-field";

const PHI_GRID_COLUMN_OPTIONS = PHI_GRID_COLUMN_COUNTS.map((count) => ({
  value: String(count),
  label: String(count),
}));

function readResponsiveCount(value: unknown): PhiResponsiveValue<number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const read = (profile: PhiGridLayoutProfile) =>
    typeof record[profile] === "number" ? record[profile] as number : undefined;
  return { compact: read("compact"), medium: read("medium"), wide: read("wide") };
}

function readSlotPlacements(value: unknown): PhiCmsGridLayoutSlotPlacementConfig[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.slotIndex !== "number") return [];
    return [{
      slotIndex: record.slotIndex,
      span: readResponsiveCount(record.span),
      offset: readResponsiveCount(record.offset),
    }];
  });
}

/** A responsive count with the profiles that say nothing left out, or nothing at all. */
function compactResponsive(value: PhiResponsiveValue<number>): PhiResponsiveValue<number> | undefined {
  const entries = Object.entries(value).filter(([, count]) => count != null);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export type PhiGridPlacementSettingsProps = {
  /** The Grid's own config; what it does not state comes from `defaultConfig`. */
  config: Record<string, unknown>;
  defaultConfig: Record<string, unknown> | null;
  /** The slots that hold something: only they can be wider or indented. */
  occupiedSlotIndices: readonly number[];
  labels?: PhiInspectorWidgetLabels["grid"];
  /**
   * A Grid's: where one slot stands in its row. A Masonry has columns and no rows, so its slots have
   * nowhere else to stand and it only asks for the count.
   */
  withDistribution?: boolean;
  disabled?: boolean;
  onConfigChange?: (key: "columns" | "slotPlacements", value: unknown) => void;
};

/**
 * A Grid's or a Masonry's columns in the Inspector.
 *
 * First how many slots a row holds at each width, which is all most Grids need; then, for one slot at
 * a time, whether it is wider than one column or indented. Both in the Grid's columns -- "two columns",
 * not a span of 12 in 24 tracks the author had to divide by hand.
 */
export function PhiGridPlacementSettings({
  config,
  defaultConfig,
  occupiedSlotIndices,
  labels = PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.grid,
  withDistribution = true,
  disabled = false,
  onConfigChange,
}: PhiGridPlacementSettingsProps) {
  const isDisabled = disabled || !onConfigChange;
  const statedColumns = readResponsiveCount(config.columns);
  const columns = resolvePhiGridColumns({
    ...readResponsiveCount(defaultConfig?.columns),
    ...compactResponsive(statedColumns ?? {}),
  });
  const slotPlacements = readSlotPlacements(config.slotPlacements ?? defaultConfig?.slotPlacements);
  const [selectedSlotOverride, setSelectedSlotOverride] = useState<number | null>(null);
  const selectedSlotIndex =
    selectedSlotOverride != null && occupiedSlotIndices.includes(selectedSlotOverride)
      ? selectedSlotOverride
      : occupiedSlotIndices[0] ?? null;
  const selectedPlacement = slotPlacements.find((entry) => entry.slotIndex === selectedSlotIndex) ?? null;

  const changeColumns = (profile: PhiGridLayoutProfile, count: PhiGridColumnCount) => {
    onConfigChange?.("columns", { ...columns, [profile]: count });
  };

  /* One column without an indent is the plain slot, so it is stated by saying nothing. */
  const changePlacement = (profile: PhiGridLayoutProfile, span: number, offset: number) => {
    if (selectedSlotIndex == null) return;
    const next: PhiCmsGridLayoutSlotPlacementConfig = {
      slotIndex: selectedSlotIndex,
      span: compactResponsive({ ...selectedPlacement?.span, [profile]: span === 1 ? undefined : span }),
      offset: compactResponsive({ ...selectedPlacement?.offset, [profile]: offset === 0 ? undefined : offset }),
    };
    const others = slotPlacements.filter((entry) => entry.slotIndex !== selectedSlotIndex);
    const nextPlacements = next.span == null && next.offset == null ? others : [...others, next];
    onConfigChange?.(
      "slotPlacements",
      nextPlacements.length > 0
        ? nextPlacements
            .map((entry) => Object.fromEntries(Object.entries(entry).filter(([, value]) => value != null)))
            .sort((left, right) => (left.slotIndex as number) - (right.slotIndex as number))
        : null,
    );
  };

  return (
    <>
      <PhiDividerControl titlePlacement="start" style={{ marginBlock: 0 }}>
        {withDistribution ? labels.columns : labels.masonryColumns}
      </PhiDividerControl>
      {PHI_GRID_LAYOUT_PROFILES.map((profile) =>
        renderPhiInspectorSettingsRow(
          labels.profiles[profile],
          <PhiSelectControl
            options={PHI_GRID_COLUMN_OPTIONS}
            value={String(columns[profile])}
            disabled={isDisabled}
            style={{ width: "100%" }}
            onChange={(next) => changeColumns(profile, Number(next) as PhiGridColumnCount)}
          />,
          `grid-columns-${profile}`,
        ))}
      {!withDistribution || selectedSlotIndex == null ? null : (
        <>
          <PhiDividerControl titlePlacement="start" style={{ marginBlock: 0 }}>{labels.distribution}</PhiDividerControl>
          {renderPhiInspectorSettingsRow(
            labels.slot,
            <PhiSelectControl
              options={occupiedSlotIndices.map((slotIndex) => ({
                value: String(slotIndex),
                label: `${labels.slot} ${slotIndex + 1}`,
              }))}
              value={String(selectedSlotIndex)}
              disabled={disabled}
              style={{ width: "100%" }}
              onChange={(next) => setSelectedSlotOverride(Number(next))}
            />,
            "grid-slot",
          )}
          {/*
            * Where the slot stands in its row, as a range over the 24 tracks that snaps to the row's
            * column edges: the handles are its first and last edge, and dragging the bar between them
            * indents it without changing its width. A row of one column leaves nothing to choose.
            */}
          {PHI_GRID_LAYOUT_PROFILES.filter((profile) => columns[profile] > 1).map((profile) => {
            const rowColumns = columns[profile];
            const tracks = 24 / rowColumns;
            const span = Math.min(rowColumns, selectedPlacement?.span?.[profile] ?? 1);
            const offset = Math.min(rowColumns - span, selectedPlacement?.offset?.[profile] ?? 0);
            return renderPhiInspectorSettingsRow(
              labels.profiles[profile],
              <PhiSliderControl
                range
                ariaLabel={labels.profiles[profile]}
                min={0}
                max={24}
                step={tracks}
                dots
                tooltipMode="hidden"
                value={[offset * tracks, (offset + span) * tracks]}
                disabled={isDisabled}
                style={{ width: "100%" }}
                onChange={([start, end]) => changePlacement(profile, (end - start) / tracks, start / tracks)}
              />,
              `grid-slot-${profile}`,
            );
          })}
        </>
      )}
    </>
  );
}
