import "server-only";

import { PHI_BUILDER_AREA_KEYS, type PhiBuilderAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleCatalog } from "../../../types";
import { resolvePhiCmsDescriptorCatalog } from "../../../plugins/runtime-modules/descriptor-compiler";
import type { PhiBuilderModulePresetPagesByArea } from "../../../helpers/cms-page-catalog";
import type { PhiCmsPresetSource } from "../../../types/cms-module-descriptors";
import type { PhiPublicRouteClaim } from "../../../helpers/public-route-claims";
import { insertPhiPresetPageTarget } from "../../../helpers/cms-preset-page-tree";

function resolveBuilderArea(area: string): PhiBuilderAreaKey | null {
  if (area === "public") {
    return "public";
  }
  return (PHI_BUILDER_AREA_KEYS as readonly string[]).includes(area)
    ? area as PhiBuilderAreaKey
    : null;
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
      insertPhiPresetPageTarget(pagesByArea[area], descriptor);
    }
  }

  return pagesByArea;
}

/**
 * Every Public address an installed Module would answer on, whether or not it is switched on.
 *
 * The whole installed set, not the active one, because this is what the question at enable time is
 * asked against: a Module that is off still has claims, and they become real the moment somebody flips
 * its switch. Which of them currently answer is decided elsewhere, from the active set.
 */
export function buildPhiBuilderPublicRouteClaims(
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): PhiPublicRouteClaim[] {
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const claims: PhiPublicRouteClaim[] = [];

  for (const { descriptor } of catalog.routesByArea.get("public") ?? []) {
    claims.push({
      ownerModuleId: descriptor.ownerModuleId,
      presetKey: descriptor.presetKey,
      title: descriptor.title,
      declaredPath: descriptor.path,
    });
  }

  return claims;
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
