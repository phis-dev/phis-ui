import "server-only";

import { PHI_BUILDER_AREA_KEYS, type PhiBuilderAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../../../types";
import { resolvePhiCmsDescriptorCatalog } from "../../../plugins/runtime-modules/descriptor-compiler";
import type {
  PhiBuilderModulePresetPagesByArea,
  PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import type { PhiCmsPresetSource } from "../../../types/cms-module-descriptors";

function humanizePageKey(value: string) {
  const label = value.replace(/[-_]+/g, " ").trim();
  return label ? label.replace(/\b\w/g, (letter) => letter.toUpperCase()) : value;
}

function resolveBuilderArea(area: string): PhiBuilderAreaKey | null {
  if (area === "public") {
    return "public";
  }
  return (PHI_BUILDER_AREA_KEYS as readonly string[]).includes(area)
    ? area as PhiBuilderAreaKey
    : null;
}

function insertPageTarget(
  roots: PhiPresetPageNode[],
  target: { path: string; pageKey: string; title: string; ownerModuleId: PhiRuntimeModuleId; presetKey: string; presetVersion: number },
) {
  const sourcePreset = {
    ownerModuleId: target.ownerModuleId,
    presetKey: target.presetKey,
    sourcePresetVersion: target.presetVersion,
  } as const;
  const segments = target.path.split("/").filter(Boolean);
  if (segments.length === 0) {
    roots.push({
      key: target.pageKey,
      title: target.title,
      storagePath: target.path,
      sourcePreset,
    });
    return;
  }

  let siblings = roots;
  for (const segment of segments.slice(0, -1)) {
    let group = siblings.find((node) => node.key === segment);
    if (!group) {
      group = { key: segment, title: humanizePageKey(segment), children: [] };
      siblings.push(group);
    }
    group.children ??= [];
    siblings = group.children;
  }

  siblings.push({
    key: target.pageKey,
    title: target.title,
    storagePath: target.path,
    sourcePreset,
  });
}

export function buildPhiBuilderModulePresetPagesByArea(
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): PhiBuilderModulePresetPagesByArea {
  const pagesByArea = PHI_BUILDER_AREA_KEYS.reduce<PhiBuilderModulePresetPagesByArea>(
    (current, area) => ({ ...current, [area]: [] }),
    {} as PhiBuilderModulePresetPagesByArea,
  );
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);

  for (const patterns of catalog.routesByArea.values()) {
    for (const { descriptor } of patterns) {
      const owner = runtimeModuleCatalog.get(descriptor.ownerModuleId);
      if (!owner) {
        continue;
      }

      const area = resolveBuilderArea(descriptor.area);
      if (!area) {
        continue;
      }
      insertPageTarget(pagesByArea[area], descriptor);
    }
  }

  return pagesByArea;
}

export function buildPhiBuilderAreaPresetSourcesByArea(
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  const sources: Partial<Record<PhiBuilderAreaKey, PhiCmsPresetSource>> = {};
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);

  for (const { descriptor } of catalog.areaShellByArea.values()) {
    const area = resolveBuilderArea(descriptor.area);
    if (!area) {
      continue;
    }
    sources[area] = {
      ownerModuleId: descriptor.ownerModuleId,
      presetKey: descriptor.presetKey,
      sourcePresetVersion: descriptor.shellPresetVersion,
    };
  }

  return sources;
}
