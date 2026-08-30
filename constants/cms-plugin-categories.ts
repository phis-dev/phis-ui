export const PHI_CMS_PLUGIN_CATEGORIES = [
  "content",
  "navigation",
  "form",
  "data",
  "media",
  "commerce",
  "account",
  "configuration",
  "structure",
  "workspace",
  "developer",
  "other",
] as const;

export type PhiCmsPluginCategory = (typeof PHI_CMS_PLUGIN_CATEGORIES)[number];

const PHI_CMS_PLUGIN_CATEGORY_SET = new Set<string>(PHI_CMS_PLUGIN_CATEGORIES);

export function isPhiCmsPluginCategory(value: unknown): value is PhiCmsPluginCategory {
  return typeof value === "string" && PHI_CMS_PLUGIN_CATEGORY_SET.has(value);
}
