import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { parsePhiPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";

export const PHI_AUTH_LOGOUT_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("auth-logout"),
  typeKey: "auth-logout",
  title: "Logout",
  description: "Revokes the current session through the Core Auth endpoint.",
  category: "account",
  tags: ["auth", "logout", "session"],
  icon: "antd:logout",
  fields: [],
  parseConfig: parsePhiPaddingOnlyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "fields"
  | "parseConfig"
>;
