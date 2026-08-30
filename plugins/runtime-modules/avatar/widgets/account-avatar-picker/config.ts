import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { parsePhiPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";

/**
 * The body of the Avatar Overlay: upload a picture, and bind it.
 *
 * Separate from the display Widget because they live in different trees -- one in the Area Overlay,
 * one wherever the Site puts it -- and because a Widget that both showed and replaced would have to be
 * placed twice to be used once.
 */
export const PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("account-avatar-picker"),
  typeKey: "account-avatar-picker",
  title: "Account avatar picker",
  description: "Uploads a picture into the viewer's own Media Space and binds it as their avatar.",
  category: "account",
  fields: [],
  parseConfig: parsePhiPaddingOnlyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "fields" | "parseConfig"
>;

export const PHI_ACCOUNT_AVATAR_PICKER_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.AccountAvatarPicker;
