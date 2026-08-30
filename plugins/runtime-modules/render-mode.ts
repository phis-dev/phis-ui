import type { PhiRuntimeModuleRenderPolicies } from "../../types/cms-plugins";

export type PhiRuntimeTreeRenderMode = "live" | "preview" | "editor";
export type PhiRuntimeWidgetImplementationMode = "runtime" | "preview";

export function readPhiRuntimeTreeRenderMode(
  config: Record<string, unknown>,
): PhiRuntimeTreeRenderMode {
  return config.renderMode === "preview" || config.renderMode === "editor"
    ? config.renderMode
    : "live";
}

export function resolvePhiRuntimeWidgetImplementationMode(
  policies: PhiRuntimeModuleRenderPolicies,
  renderMode: PhiRuntimeTreeRenderMode,
): PhiRuntimeWidgetImplementationMode | null {
  if (renderMode === "live") {
    return policies.runtime === "custom" ? "runtime" : null;
  }
  if (renderMode === "preview") {
    return policies.preview === "runtimeReadOnly" ? "runtime" : "preview";
  }
  if (policies.authoring !== "usePreview") {
    return null;
  }
  return policies.preview === "runtimeReadOnly" ? "runtime" : "preview";
}
