/*
 * The Layout type keys and the rule that namespaces them, apart from the slot tables and the registry.
 *
 * The shared Client manifest keys its loaders by `PhiCmsLayoutType`, so this file is on every page; the
 * registry and the slot definitions are what the server resolves Layouts with, and they stay out of the
 * browser by living in `cms-layout-types.ts`.
 */
export function buildPhiCmsLayoutTypeKey(
  pluginKey: string,
  typeKey: string,
) {
  return `${pluginKey}/${typeKey}`;
}

function defineLayoutType(
  pluginKey: string,
  typeKey: string,
) {
  return buildPhiCmsLayoutTypeKey(pluginKey, typeKey);
}

const PHI_CMS_LAYOUT_PLUGIN_KEY_BASE = "@phis/ui/modules";

/** Same rule as Widget types: the owning module namespaces the Layout type. */
export const PHI_CMS_LAYOUT_PLUGIN_KEYS = {
  "builder": `${PHI_CMS_LAYOUT_PLUGIN_KEY_BASE}/builder/layouts`,
  "core": `${PHI_CMS_LAYOUT_PLUGIN_KEY_BASE}/core/layouts`,
} as const;

const PHI_CMS_LAYOUT_MODULE_BY_TYPE_KEY: Readonly<Record<string, keyof typeof PHI_CMS_LAYOUT_PLUGIN_KEYS>> = {
  "carousel": "core",
  "collapsible": "core",
  "content": "core",
  "flex": "core",
  "flex-vertical": "core",
  "grid": "core",
  "masonry": "core",
  "page-region": "builder",
  "split-card": "core",
  "stack": "core",
  "structure-region": "builder",
  "three-column": "core",
};

export function resolvePhiCmsLayoutPluginKey(typeKey: string): string {
  const moduleKey = PHI_CMS_LAYOUT_MODULE_BY_TYPE_KEY[typeKey];
  if (!moduleKey) {
    throw new Error(`Unknown CMS layout type key "${typeKey}".`);
  }
  return PHI_CMS_LAYOUT_PLUGIN_KEYS[moduleKey];
}

export const PhiCmsLayoutType = {
  Content: defineLayoutType(resolvePhiCmsLayoutPluginKey("content"), "content"),
  Flex: defineLayoutType(resolvePhiCmsLayoutPluginKey("flex"), "flex"),
  FlexVertical: defineLayoutType(resolvePhiCmsLayoutPluginKey("flex-vertical"), "flex-vertical"),
  Stack: defineLayoutType(resolvePhiCmsLayoutPluginKey("stack"), "stack"),
  Carousel: defineLayoutType(resolvePhiCmsLayoutPluginKey("carousel"), "carousel"),
  Collapsible: defineLayoutType(resolvePhiCmsLayoutPluginKey("collapsible"), "collapsible"),
  Masonry: defineLayoutType(resolvePhiCmsLayoutPluginKey("masonry"), "masonry"),
  Grid: defineLayoutType(resolvePhiCmsLayoutPluginKey("grid"), "grid"),
  SplitCard: defineLayoutType(resolvePhiCmsLayoutPluginKey("split-card"), "split-card"),
  ThreeColumn: defineLayoutType(resolvePhiCmsLayoutPluginKey("three-column"), "three-column"),
  StructureRegion: defineLayoutType(resolvePhiCmsLayoutPluginKey("structure-region"), "structure-region"),
  PageRegion: defineLayoutType(resolvePhiCmsLayoutPluginKey("page-region"), "page-region"),
} as const;
