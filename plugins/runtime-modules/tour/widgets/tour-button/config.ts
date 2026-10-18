import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiThemeModeSwitchSize } from "../../../../../types/core-widget-placements";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import { PHI_COMPACT_CONTROL_PRESENTATION_FIELDS } from "../../../../../components/widgets/config/control-signal-config";

/**
 * The button that starts the shown Page's Tour, placed by the Site in a Shell -- by convention in the
 * middle of `header_top` (design/TOURS.md).
 *
 * Like the Theme mode switch, it is a round icon button with nothing to wire: it asks the Tour Controller
 * of its Area, the one address that answers for Tours, and it hides itself on a Page that has none.
 */
export type PhiTourButtonWidgetConfig = PhiCmsWidgetConfigBase & {
  controlSize?: PhiThemeModeSwitchSize;
};

function parsePhiTourButtonWidgetConfig(config: Record<string, unknown>): PhiTourButtonWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    controlSize: config.controlSize === "small" || config.controlSize === "medium" ? config.controlSize : "small",
  };
}

export const PHI_TOUR_BUTTON_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("tour-button"),
  typeKey: "tour-button",
  title: "Tour button",
  description: "Starts the Tour of the shown Page; hidden on a Page that has none.",
  category: "navigation",
  iconFamily: "navigation",
  slotSizePolicy: "intrinsic",
  /*
   * No signal surface: the Tour Controller is the one address that answers for Tours, and this Widget
   * knows it the way the Theme mode switch knows the Core Runtime Controller.
   */
  fields: [
    ...PHI_COMPACT_CONTROL_PRESENTATION_FIELDS,
  ],
  defaultConfig: {},
  parseConfig: parsePhiTourButtonWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiTourButtonWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
