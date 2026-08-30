import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { parsePhiPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";

/**
 * Shows the signed-in person their own picture and lets them change it.
 *
 * It carries no configuration beyond padding on purpose: whose avatar it shows is never a setting, it
 * is always the viewer's. A Widget that could be pointed at a user id would be a way to read someone
 * else's, and there is no surface that wants that.
 */
export const PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("account-avatar"),
  typeKey: "account-avatar",
  title: "Account avatar",
  description: "The signed-in person's own picture, with a control to change it.",
  category: "account",
  fields: [],
  parseConfig: parsePhiPaddingOnlyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "fields" | "parseConfig"
>;

export const PHI_ACCOUNT_AVATAR_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.AccountAvatar;
