import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { parsePhiPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";

export const PHI_PROFILE_LOCALE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("profile-locale"),
  typeKey: "profile-locale",
  title: "Profile language",
  description: "Authenticated profile language selector.",
  category: "account",
  fields: [],
  parseConfig: parsePhiPaddingOnlyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "fields" | "parseConfig"
>;

export const PHI_PROFILE_LOCALE_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.ProfileLocale;
