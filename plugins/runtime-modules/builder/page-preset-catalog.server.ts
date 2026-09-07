import "server-only";

import { PHI_BUILDER_AREA_KEYS, type PhiBuilderAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../../../types";
import { resolvePhiCmsDescriptorCatalog } from "../../../plugins/runtime-modules/descriptor-compiler";
import type {
  PhiBuilderModulePresetPagesByArea,
  PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import type { PhiCmsPresetSource } from "../../../types/cms-module-descriptors";
import { createPhiPresetCmsPageId } from "../../../types/cms-instance-id";
import { buildPhiRuntimeModulePackageRoutePrefix } from "../../../helpers/runtime-module-route-path";
import type { PhiPublicRouteClaim } from "../../../helpers/public-route-claims";

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
  target: {
    path: string;
    area: string;
    title: string;
    ownerModuleId: PhiRuntimeModuleId;
    presetKey: string;
    presetVersion: number;
    landingPage?: true;
  },
) {
  const sourcePreset = {
    ownerModuleId: target.ownerModuleId,
    presetKey: target.presetKey,
    sourcePresetVersion: target.presetVersion,
  } as const;
  const pageId = createPhiPresetCmsPageId({
    ownerModuleId: target.ownerModuleId,
    presetKey: target.presetKey,
  });
  /*
   * The package namespace is an addressing device, not structure a person authored.
   *
   * Every Page of a Module outside Public answers under `/<scope>/<package>`, so leaving those segments
   * in would bury every Page two folders deep under the same two words and say nothing about how the
   * Pages relate. The tree shows what the Module arranged below its namespace; the address keeps it.
   */
  const namespace = target.area === "public"
    ? ""
    : buildPhiRuntimeModulePackageRoutePrefix(target.ownerModuleId);
  const treePath = namespace && target.path.startsWith(`${namespace}/`)
    ? target.path.slice(namespace.length)
    : target.path;
  const segments = treePath.split("/").filter(Boolean);
  if (segments.length === 0) {
    roots.push({
      key: pageId,
      title: target.title,
      storagePath: target.path,
      catalogPath: treePath,
      sourcePreset,
      ...(target.landingPage ? { landingPage: true as const } : {}),
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
    key: pageId,
    title: target.title,
    storagePath: target.path,
    catalogPath: treePath,
    sourcePreset,
    ...(target.landingPage ? { landingPage: true as const } : {}),
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
