import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiAccountWidgetConfig } from "./client";

export function parsePhiAccountWidgetConfig(rawConfig: Record<string, unknown> | null | undefined): PhiAccountWidgetConfig {
  const config = (rawConfig ?? {}) as Record<string, unknown>;
  return {
    variant:
      config.variant === "compact" ||
      config.variant === "icon-only" ||
      config.variant === "full"
        ? config.variant
        : undefined,
    showLabel: typeof config.showLabel === "boolean" ? config.showLabel : undefined,
    showChevron: typeof config.showChevron === "boolean" ? config.showChevron : undefined,
  };
}

export const PHI_ACCOUNT_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("account"),
  typeKey: "account",
  slotSizePolicy: "intrinsic",
  title: "Account",
  description: "Viewer account control with guest and authenticated states.",
  category: "navigation",
  icon: "antd:user-outlined",
  iconFamily: "navigation",
  fields: [],
  parseConfig: parsePhiAccountWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiAccountWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "slotSizePolicy"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "iconFamily"
  | "fields"
  | "parseConfig"
>;
