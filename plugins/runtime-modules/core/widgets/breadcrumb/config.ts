import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsBreadcrumbWidgetConfig = PhiCmsWidgetConfigBase & {
  rootLabel?: string;
  showArea?: boolean;
  showPath?: boolean;
  pathLabel?: string;
  separator?: string;
  align?: "flex-start" | "center" | "flex-end";
  justify?: "flex-start" | "center" | "space-between" | "flex-end";
};

export function parsePhiCmsBreadcrumbWidgetConfig(
  rawConfig: Record<string, unknown> | null | undefined,
): PhiCmsBreadcrumbWidgetConfig {
  return (rawConfig ?? {}) as PhiCmsBreadcrumbWidgetConfig;
}

export const PHI_BREADCRUMB_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("breadcrumb"),
  typeKey: "breadcrumb",
  title: "Breadcrumb",
  description: "Generic breadcrumb trail for page and header contexts.",
  category: "navigation",
  iconFamily: "navigation",
  fields: [
    { key: "rootLabel", type: "string", label: "Root Label" },
    { key: "showArea", type: "boolean", label: "Show Area" },
    { key: "showPath", type: "boolean", label: "Show Path" },
    { key: "pathLabel", type: "string", label: "Path Label" },
    { key: "separator", type: "string", label: "Separator" },
  ],
  parseConfig: parsePhiCmsBreadcrumbWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsBreadcrumbWidgetConfig>,
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

export const PHI_BREADCRUMB_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Breadcrumb;
