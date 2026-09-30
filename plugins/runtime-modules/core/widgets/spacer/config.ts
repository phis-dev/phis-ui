import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/** A Spacer has no settings of its own; what it takes is the block's: size, anchor, effects. */
export type PhiSpacerWidgetConfig = PhiCmsWidgetConfigBase;

export const PHI_SPACER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("spacer"),
  typeKey: "spacer",
  title: "Spacer",
  description: "Fills the remaining available space in the current slot.",
  category: "structure",
  icon: "antd:column-width-outlined",
  iconFamily: "layout",
  slotSizePolicy: "fill",
  fields: [],
  parseConfig: (config: Record<string, unknown>): PhiSpacerWidgetConfig => readRenderableBlockConfig(config),
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSpacerWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "fields"
  | "parseConfig"
>;
