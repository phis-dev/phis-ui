import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { parsePhiEmptyWidgetConfig } from "../../../../../components/widgets/config/helpers";

export const PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("profile-overview"),
  typeKey: "profile-overview",
  slotSizePolicy: "intrinsic",
  title: "Profile overview",
  description: "Authenticated profile overview with site preferences.",
  category: "account",
  fields: [],
  parseConfig: parsePhiEmptyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<Record<string, never>>,
  "kind" | "pluginKey" | "typeKey" | "slotSizePolicy" | "title" | "description" | "category" | "fields" | "parseConfig"
>;

export const PHI_PROFILE_OVERVIEW_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.ProfileOverview;
