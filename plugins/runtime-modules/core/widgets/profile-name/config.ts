import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { parsePhiPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";

export const PHI_PROFILE_NAME_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("profile-name"),
  typeKey: "profile-name",
  title: "Profile name",
  description: "Authenticated profile name editor.",
  category: "account",
  fields: [],
  parseConfig: parsePhiPaddingOnlyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "fields" | "parseConfig"
>;

export const PHI_PROFILE_NAME_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.ProfileName;
