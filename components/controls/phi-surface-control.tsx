"use client";

import { PhiBackgroundControl, type PhiBackgroundControlProps } from "./phi-background-control";
import { PhiBorderControl } from "./phi-border-control";
import { PhiFlexControl } from "./phi-flex-control";
import { PhiSegmentedControl } from "./phi-segmented-control";
import { PhiShadowControl } from "./phi-shadow-control";
import { PhiTypographyControl } from "./phi-typography-control";
import type { PhiBackgroundWidgetLabels } from "../widgets/label-types/background";
import type { PhiBorderWidgetLabels } from "../widgets/label-types/border";
import type { PhiColorPickerLabels } from "../widgets/label-types/color-picker";
import type { PhiPickerPlacement } from "./phi-picker-control-contract";
import {
  PHI_CMS_BORDER_SOURCES,
  resolvePhiCmsBorderSource,
  type PhiCmsBorderSource,
} from "../../types/cms-border-source";
import type { PhiBackgroundFilter } from "../../types/layout-style";
import { PHI_SURFACE_TONES, type PhiSurface, type PhiSurfaceTone } from "../../types/surface";

export type PhiSurfaceControlLabels = {
  background: string;
  border: string;
  shadow: string;
  tone: string;
  tones: Record<PhiSurfaceTone, string>;
};

const PHI_SURFACE_CONTROL_DEFAULT_LABELS: PhiSurfaceControlLabels = {
  background: "Background",
  border: "Border",
  shadow: "Shadow",
  tone: "Mode",
  tones: {
    inherit: "Page",
    light: "Light",
    dark: "Dark",
    inverse: "Inverse",
  },
};

/** Read only where the Border labels have not arrived; the words themselves live in their label set. */
const PHI_BORDER_SOURCE_FALLBACK_LABELS: Record<PhiCmsBorderSource, string> = {
  none: "None",
  theme: "Theme",
  custom: "Custom",
};

export type PhiSurfaceControlProps = {
  value?: PhiSurface | null;
  /** The whole next Surface, or `null` once nothing is left in it. */
  onChange?: (next: PhiSurface | null) => void;
  disabled?: boolean;
  /** The headings of the three parts. */
  labels?: PhiSurfaceControlLabels;
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  colorPickerPlacement?: PhiPickerPlacement;
  /** The Filters the box can render; see `PhiBackgroundControlProps["filters"]`. */
  backgroundFilters?: readonly PhiBackgroundFilter[];
  renderMediaPicker?: PhiBackgroundControlProps["renderMediaPicker"];
};

function withPart(current: PhiSurface, patch: Partial<PhiSurface>): PhiSurface | null {
  const next: Record<string, unknown> = { ...current, ...patch };
  for (const [key, value] of Object.entries(next)) {
    if (value == null) {
      delete next[key];
    }
  }
  return Object.keys(next).length > 0 ? next as PhiSurface : null;
}

/**
 * A Surface (`PhiSurface`) as one Control: its ground, its edge and its depth, each drawn by the Control
 * that owns that part.
 *
 * Every box that has a look is edited with it -- a Region, a Layout, a Widget -- so the three parts read
 * the same everywhere, and each change hands on the whole Surface with the other parts untouched.
 *
 * The mode asks which colours the box and its content are drawn in: the page's (`inherit`), one fixed
 * mode, or the other one than the page's (`inverse`).
 *
 * The edge asks where the line comes from before it asks what the line is: `theme` takes the Site's own
 * line and follows the Theme, and the line's fields appear only under `custom`, the one source that
 * reads them. The question is answered by the same resolver the drawing asks
 * (`resolvePhiCmsBorderSource`), so a configured line reads as `custom` here as it does on the page.
 */
export function PhiSurfaceControl({
  value,
  onChange,
  disabled = false,
  labels = PHI_SURFACE_CONTROL_DEFAULT_LABELS,
  backgroundLabels,
  borderLabels,
  colorPickerLabels,
  colorPickerPlacement = "left",
  backgroundFilters,
  renderMediaPicker,
}: PhiSurfaceControlProps) {
  const current: PhiSurface = value ?? {};
  const isDisabled = disabled || !onChange;
  const patch = (part: Partial<PhiSurface>) => onChange?.(withPart(current, part));
  const borderSource = resolvePhiCmsBorderSource(current.borderSource, current.border);

  return (
    <PhiFlexControl vertical gap="middle" style={{ width: "100%", minWidth: 0 }}>
      <PhiFlexControl vertical gap="small" style={{ width: "100%", minWidth: 0 }}>
        <PhiTypographyControl strong>{labels.background}</PhiTypographyControl>
        <PhiBackgroundControl
          mode="control"
          disabled={isDisabled}
          value={current.background ?? null}
          onChange={(background) => patch({ background })}
          labels={backgroundLabels}
          colorPickerLabels={colorPickerLabels}
          colorPickerPlacement={colorPickerPlacement}
          filters={backgroundFilters}
          renderMediaPicker={renderMediaPicker}
        />
      </PhiFlexControl>
      <PhiFlexControl vertical gap="small" style={{ width: "100%", minWidth: 0 }}>
        <PhiTypographyControl strong>{labels.border}</PhiTypographyControl>
        <PhiSegmentedControl<PhiCmsBorderSource>
          value={borderSource}
          options={PHI_CMS_BORDER_SOURCES.map((source) => ({
            value: source,
            label: borderLabels?.sources?.[source] ?? PHI_BORDER_SOURCE_FALLBACK_LABELS[source],
          }))}
          block
          disabled={isDisabled}
          onChange={(nextSource) => patch({ borderSource: nextSource })}
        />
        {borderSource === "custom" ? (
          <PhiBorderControl
            mode="control"
            disabled={isDisabled}
            value={current.border ?? null}
            onChange={(border) => patch({ border, borderSource: "custom" })}
            labels={borderLabels}
            colorPickerLabels={colorPickerLabels}
            colorPickerPlacement={colorPickerPlacement}
          />
        ) : null}
      </PhiFlexControl>
      <PhiFlexControl vertical gap="small" style={{ width: "100%", minWidth: 0 }}>
        <PhiTypographyControl strong>{labels.tone}</PhiTypographyControl>
        <PhiSegmentedControl<PhiSurfaceTone>
          value={current.tone ?? "inherit"}
          options={PHI_SURFACE_TONES.map((tone) => ({ value: tone, label: labels.tones[tone] }))}
          block
          disabled={isDisabled}
          onChange={(tone) => patch({ tone: tone === "inherit" ? undefined : tone })}
        />
      </PhiFlexControl>
      <PhiFlexControl vertical gap="small" style={{ width: "100%", minWidth: 0 }}>
        <PhiTypographyControl strong>{labels.shadow}</PhiTypographyControl>
        <PhiShadowControl
          mode="control"
          disabled={isDisabled}
          value={current.shadow ?? null}
          onChange={(shadow) => patch({ shadow })}
        />
      </PhiFlexControl>
    </PhiFlexControl>
  );
}
