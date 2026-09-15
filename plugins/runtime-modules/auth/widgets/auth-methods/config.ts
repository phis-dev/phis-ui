import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";

/**
 * The sign-in methods that are not a password, as the Site has them configured.
 *
 * Each one is a round trip to somebody else's login page and back, so none of it is a form: there is
 * nothing to fill in and nothing to submit. It stands beside the password form as its own Widget, and
 * a Site with no external provider configured simply does not place anything.
 */
export type PhiCmsAuthMethodsWidgetConfig = Record<string, never>;

export function parsePhiAuthMethodsWidgetConfig(): PhiCmsAuthMethodsWidgetConfig {
  return {};
}

export const PHI_AUTH_METHODS_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("auth-methods"),
  typeKey: "auth-methods",
  title: "Sign-in Methods",
  description: "The external identity providers this Site is configured to accept.",
  category: "account",
  tags: ["auth", "login", "oauth"],
  icon: "antd:login",
  slotSizePolicy: "fill-inline",
  fields: [],
  defaultConfig: {},
  parseConfig: parsePhiAuthMethodsWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsAuthMethodsWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "slotSizePolicy"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
