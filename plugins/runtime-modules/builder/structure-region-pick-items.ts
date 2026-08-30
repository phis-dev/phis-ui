import { buildPhiCmsLayoutNamespacedTypeKey } from "../../../constants/cms-layout-types";
import type { PhiStructureRegionPickItem } from "./widgets/structure-region/config";
import type { PhiBuilderPluginMeta } from "../../../types/builder";
import { resolvePhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";

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
        icon: meta.icon ?? null,
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
      icon: meta.icon ?? null,
      defaultAnchor: null,
      defaultConfig: meta.defaultConfig ?? null,
    });
  }

  return items;
}
