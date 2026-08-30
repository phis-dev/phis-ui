import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";

export type PhiDeveloperBuilderPagesHeaderWidgetConfig = {
  mode: "full" | "title" | "selector";
};

function parseDeveloperBuilderPagesHeaderWidgetConfig(value: unknown): PhiDeveloperBuilderPagesHeaderWidgetConfig {
  const mode =
    typeof value === "object" &&
    value != null &&
    ((value as { mode?: unknown }).mode === "title" || (value as { mode?: unknown }).mode === "selector")
      ? (value as { mode: "title" | "selector" }).mode
      : "full";

  return { mode };
}

export const PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("developer-builder-pages-header"),
  typeKey: "developer-builder-pages-header",
  title: "Builder Pages Header",
  description: "Pages header controls for the Builder pages workspace.",
  category: "workspace",
  iconFamily: "builder",
  fields: [
    {
      key: "mode",
      type: "choice",
      label: "Mode",
      options: [
        { value: "full", label: "Full" },
        { value: "title", label: "Title" },
        { value: "selector", label: "Selector" },
      ],
    },
  ],
  parseConfig: parseDeveloperBuilderPagesHeaderWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiDeveloperBuilderPagesHeaderWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "fields"
  | "parseConfig"
>;
