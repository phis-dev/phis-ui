import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiBuilderChromeControlsWidgetConfig } from "./server";

export type { PhiBuilderChromeControlsWidgetConfig } from "./server";

function parsePhiBuilderChromeControlsWidgetConfig(value: unknown): PhiBuilderChromeControlsWidgetConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const rawEditorPreviewDisabled = (value as { editorPreviewDisabled?: unknown }).editorPreviewDisabled;
  const rawActionsDisabled = (value as { actionsDisabled?: unknown }).actionsDisabled;
  const rawDebugDisabled = (value as { debugDisabled?: unknown }).debugDisabled;

  return {
    ...(typeof rawEditorPreviewDisabled === "boolean" ? { editorPreviewDisabled: rawEditorPreviewDisabled } : {}),
    ...(typeof rawActionsDisabled === "boolean" ? { actionsDisabled: rawActionsDisabled } : {}),
    ...(typeof rawDebugDisabled === "boolean" ? { debugDisabled: rawDebugDisabled } : {}),
  };
}

export const PHI_BUILDER_CHROME_CONTROLS_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("builder-chrome-controls"),
  typeKey: "builder-chrome-controls",
  title: "Builder Chrome Controls",
  description: "Page-scoped signal widget to disable builder chrome controls.",
  category: "workspace",
  iconFamily: "builder",
  slotSizePolicy: "fill",
  fields: [
    { key: "editorPreviewDisabled", type: "boolean", label: "Disable Editor/Preview" },
    { key: "actionsDisabled", type: "boolean", label: "Disable Actions" },
    { key: "debugDisabled", type: "boolean", label: "Disable Debug" },
  ],
  parseConfig: parsePhiBuilderChromeControlsWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiBuilderChromeControlsWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "fields"
  | "parseConfig"
>;
