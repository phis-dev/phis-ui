import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { createPhiConfigReader } from "../../../../../components/widgets/config/strict-config-reader";

/**
 * How the title stands.
 *
 * `heading` is the Page's own heading: its one `h1`, on the type scale, wrapping, centred. `label` is the
 * title as a caption in a bar -- the Shell's header -- where a heading would give the page a second `h1`
 * and the bar a line break.
 */
export const PHI_PAGE_TITLE_WIDGET_DISPLAYS = ["heading", "label"] as const;
export type PhiPageTitleWidgetDisplay = (typeof PHI_PAGE_TITLE_WIDGET_DISPLAYS)[number];

export type PhiPageTitleWidgetConfig = {
  display: PhiPageTitleWidgetDisplay;
};

function parsePhiPageTitleWidgetConfig(config: Record<string, unknown>): PhiPageTitleWidgetConfig {
  const reader = createPhiConfigReader(config);
  return { display: reader.oneOf("display", PHI_PAGE_TITLE_WIDGET_DISPLAYS) ?? "heading" };
}

export const PHI_PAGE_TITLE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("page-title"),
  typeKey: "page-title",
  slotSizePolicy: "intrinsic",
  title: "Page title",
  category: "content",
  description: "Displays the current localized CMS page title from runtime metadata.",
  iconFamily: "basic",
  fields: [
    {
      key: "display",
      type: "choice",
      label: "Shows as",
      options: [
        { value: "heading", label: "Page heading" },
        { value: "label", label: "Caption" },
      ],
    },
  ],
  defaultConfig: { display: "heading" },
  parseConfig: parsePhiPageTitleWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiPageTitleWidgetConfig>,
  | "kind" | "pluginKey" | "typeKey" | "slotSizePolicy" | "title" | "description" | "category" | "iconFamily"
  | "fields" | "defaultConfig" | "parseConfig"
>;
