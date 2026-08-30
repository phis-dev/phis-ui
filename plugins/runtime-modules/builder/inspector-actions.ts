import { readPhiShadow, type PhiShadow } from "../../../types/layout-style";

export type PhiBuilderInspectorAction =
  | { kind: "patchSelectedRegionDraft"; patch: Record<string, unknown> }
  | { kind: "patchSelectedWidgetConfig"; patch: Record<string, unknown> }
  | { kind: "patchSelectedWidgetGeometry"; geometry: Record<string, unknown> }
  | { kind: "patchSelectedLayoutAnchor"; selectedLayoutAnchor: string }
  | { kind: "patchSelectedLayoutPadding"; padding: Record<string, unknown> | null }
  | { kind: "patchSelectedLayoutBackground"; background: unknown }
  | { kind: "patchSelectedLayoutBorder"; border: unknown }
  | { kind: "patchSelectedLayoutShadow"; shadow: PhiShadow }
  | { kind: "patchSelectedLayoutConfig"; key: string; value?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function readPhiBuilderInspectorAction(
  value: unknown,
): PhiBuilderInspectorAction | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
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

  if (value.kind === "patchSelectedLayoutAnchor") {
    return typeof value.selectedLayoutAnchor === "string"
      ? { kind: value.kind, selectedLayoutAnchor: value.selectedLayoutAnchor }
      : null;
  }

  if (value.kind === "patchSelectedLayoutPadding") {
    const padding = value.padding == null ? null : readRecord(value.padding);
    return value.padding == null || padding ? { kind: value.kind, padding } : null;
  }

  if (value.kind === "patchSelectedLayoutBackground") {
    return { kind: value.kind, background: value.background };
  }

  if (value.kind === "patchSelectedLayoutBorder") {
    return { kind: value.kind, border: value.border };
  }

  if (value.kind === "patchSelectedLayoutShadow") {
    return {
      kind: value.kind,
      shadow: readPhiShadow(value.shadow) ?? "none",
    };
  }

  if (value.kind === "patchSelectedLayoutConfig") {
    return typeof value.key === "string"
      ? { kind: value.kind, key: value.key, value: value.value }
      : null;
  }

  return null;
}
