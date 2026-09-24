import { buildPhiCmsLayoutNamespacedTypeKey } from "../../../constants/cms-layout-types";
import type { PhiStructureRegionPickItem } from "./widgets/structure-region/config";
import type { PhiBuilderPluginMeta } from "../../../types/builder";
import { resolvePhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";

/**
 * The glyph an entry shows: what the plugin set outright, else the one it named.
 *
 * A Layout names its icon with `iconName` -- "stack", "grid", "carousel" -- and never sets `icon`,
 * which is built from an icon *family* and is null for everything that is not a Widget. Reading only
 * `icon` therefore left every Layout without one, and the picker's fallback drew the Flex motif on
 * all twelve.
 */
function resolvePickItemIcon(meta: PhiBuilderPluginMeta) {
  return meta.icon ?? meta.iconKey ?? null;
}

export function buildPhiStructureRegionPickItems(
  builderPlugins: readonly PhiBuilderPluginMeta[],
): PhiStructureRegionPickItem[] {
  const items: PhiStructureRegionPickItem[] = [];

  for (const meta of builderPlugins) {
    if (meta.kind !== "widget") {
      items.push({
        key: buildPhiCmsLayoutNamespacedTypeKey(meta.pluginKey, meta.typeKey),
        kind: "layout",
        origin: meta.pluginKey,
        packageName: meta.pluginKey,
        title: meta.title,
        description: meta.description ?? null,
        category: meta.category ?? null,
        tags: meta.tags ?? null,
        icon: resolvePickItemIcon(meta),
        defaultAnchor: resolvePhiAnchorWidgetPlacement(meta.defaultAnchor),
        defaultConfig: meta.defaultConfig ?? null,
      });
      continue;
    }

    items.push({
      key: `${meta.pluginKey}/${meta.typeKey}`,
      kind: "widget",
      origin: meta.pluginKey,
      packageName: meta.pluginKey,
      title: meta.title,
      description: meta.description ?? null,
      category: meta.category ?? null,
      tags: meta.tags ?? null,
      icon: resolvePickItemIcon(meta),
      requiredRegionOwnership: meta.requiredRegionOwnership ?? null,
      defaultAnchor: null,
      defaultConfig: meta.defaultConfig ?? null,
    });
  }

  return items;
}
