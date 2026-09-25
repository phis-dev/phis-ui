import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { parsePhiPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";

export const PHI_AUTH_SECURITY_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("auth-security"),
  typeKey: "auth-security",
  slotSizePolicy: "intrinsic",
  title: "Account Security",
  description: "Authenticated self-service for factors, identities, recovery, and sessions.",
  category: "account",
  tags: ["auth", "security", "totp", "sessions"],
  icon: "antd:safety-certificate",
  fields: [],
  parseConfig: parsePhiPaddingOnlyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "slotSizePolicy"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "fields"
  | "parseConfig"
>;
