import { readPhiSurface, type PhiSurface } from "../../../types/surface";
import { isPhiRecord } from "../../../helpers/is-record";

export type PhiBuilderInspectorAction =
  | { kind: "patchSelectedRegionDraft"; patch: Record<string, unknown> }
  | { kind: "patchSelectedWidgetConfig"; patch: Record<string, unknown> }
  | { kind: "patchSelectedWidgetGeometry"; geometry: Record<string, unknown> }
  /** The selected Widget's whole Surface; `null` takes it away. */
  | { kind: "patchSelectedWidgetSurface"; surface: PhiSurface | null }
  | { kind: "setSelectedWidgetTranslate"; translate: boolean }
  | { kind: "patchSelectedLayoutAnchor"; selectedLayoutAnchor: string }
  | { kind: "patchSelectedLayoutPadding"; padding: Record<string, unknown> | null }
  /** The selected Layout's whole Surface; `null` takes it away. */
  | { kind: "patchSelectedLayoutSurface"; surface: PhiSurface | null }
  | { kind: "patchSelectedLayoutConfig"; key: string; value?: unknown };

function readRecord(value: unknown): Record<string, unknown> | null {
  return isPhiRecord(value) ? value : null;
}

export function readPhiBuilderInspectorAction(
  value: unknown,
): PhiBuilderInspectorAction | null {
  if (!isPhiRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  if (value.kind === "patchSelectedRegionDraft") {
    const patch = readRecord(value.patch);
    return patch ? { kind: value.kind, patch } : null;
  }

  if (value.kind === "patchSelectedWidgetConfig") {
    const patch = readRecord(value.patch);
    return patch ? { kind: value.kind, patch } : null;
  }

  if (value.kind === "patchSelectedWidgetGeometry") {
    const geometry = readRecord(value.geometry);
    return geometry ? { kind: value.kind, geometry } : null;
  }

  if (value.kind === "patchSelectedWidgetSurface") {
    return { kind: value.kind, surface: readPhiSurface(value.surface) };
  }

  if (value.kind === "setSelectedWidgetTranslate") {
    return typeof value.translate === "boolean" ? { kind: value.kind, translate: value.translate } : null;
  }

  if (value.kind === "patchSelectedLayoutAnchor") {
    return typeof value.selectedLayoutAnchor === "string"
      ? { kind: value.kind, selectedLayoutAnchor: value.selectedLayoutAnchor }
      : null;
  }

  if (value.kind === "patchSelectedLayoutPadding") {
    const padding = value.padding == null ? null : readRecord(value.padding);
    return value.padding == null || padding ? { kind: value.kind, padding } : null;
  }

  if (value.kind === "patchSelectedLayoutSurface") {
    return { kind: value.kind, surface: readPhiSurface(value.surface) };
  }

  if (value.kind === "patchSelectedLayoutConfig") {
    return typeof value.key === "string"
      ? { kind: value.kind, key: value.key, value: value.value }
      : null;
  }

  return null;
}
