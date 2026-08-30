import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../../plugins/runtime-modules/builder/ids";
import {
  readBoolean,
  readNumber,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsQuickLinksWidgetConfig = PhiCmsWidgetConfigBase & {
  navKey?: string;
  title?: string;
  columns?: 1 | 2 | 3;
  separator?: boolean;
};

export function parsePhiCmsQuickLinksWidgetConfig(config: Record<string, unknown>): PhiCmsQuickLinksWidgetConfig {
  const columns = readNumber(config.columns) ??
    (readString(config.columns) ? Number(config.columns) : undefined);

  return {
    ...readRenderableBlockConfig(config),
    navKey: readString(config.navKey),
    title: readString(config.title),
    columns: columns === 1 || columns === 3 ? columns : 2,
    separator: readBoolean(config.separator) ?? true,
  };
}

export const PHI_QUICK_LINKS_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("quick-links"),
  typeKey: "quick-links",
  title: "Quick Links",
  description: "Navigation link list rendered from a selected navigation key.",
  category: "navigation",
  iconFamily: "navigation",
  slotSizePolicy: "fill-inline",
  fields: [
    {
      key: "navKey",
      type: "choice",
      label: "Navigation",
      presentation: "select",
      optionsProvider: {
        providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderNavigationSets,
        loadMode: "hybrid",
        search: { enabled: true, minChars: 1 },
        params: {
          value: "scopeKey",
        },
      },
      placeholder: "Select an Area navigation surface",
    },
    { key: "title", type: "string", label: "Title" },
    {
      key: "columns",
      type: "choice",
      label: "Columns",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
      ],
    },
    { key: "separator", type: "boolean", label: "Separator" },
  ],
  parseConfig: parsePhiCmsQuickLinksWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsQuickLinksWidgetConfig>,
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

export const PHI_QUICK_LINKS_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.QuickLinks;
