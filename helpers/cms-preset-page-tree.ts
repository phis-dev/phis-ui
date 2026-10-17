import type { PhiPresetPageNode } from "./cms-page-catalog";
import type { PhiCmsActiveRouteTable } from "../types/cms-module-descriptors";
import type { PhiRuntimeModuleId } from "../types";
import { createPhiPresetCmsPageId } from "../types/cms-instance-id";
import { buildPhiRuntimeModulePackageRoutePrefix } from "./runtime-module-route-path";

function humanizePageKey(value: string) {
  const label = value.replace(/[-_]+/g, " ").trim();
  return label ? label.replace(/\b\w/g, (letter) => letter.toUpperCase()) : value;
}

/**
 * Puts one Module route into a Page tree, under the folders its path names.
 *
 * Shared by the Builder's catalog of every installed route and by the list of the Pages an Area answers
 * on today, which a link picker offers (`gateway/page-references-route.ts`).
 */
export function insertPhiPresetPageTarget(
  roots: PhiPresetPageNode[],
  target: {
    path: string;
    area: string;
    title: string;
    ownerModuleId: PhiRuntimeModuleId;
    presetKey: string;
    presetVersion: number;
    defaultPageFlags?: number;
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
      ...(target.defaultPageFlags ? { defaultPageFlags: target.defaultPageFlags } : {}),
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
    ...(target.defaultPageFlags ? { defaultPageFlags: target.defaultPageFlags } : {}),
    ...(target.landingPage ? { landingPage: true as const } : {}),
  });
}

/**
 * The Module Pages one Area answers on today, as catalog nodes.
 *
 * The routes that answer, not every one that was declared: this is what a link may point at, so a Page
 * of a Module the Area has switched off is not offered, and of two routes claiming one address only the
 * one the table lets answer is. A route with a parameter is left out -- `/news/:id` is a family of Pages,
 * and a link names one -- which reading the exact paths does by itself.
 */
export function buildPhiAreaActivePresetPages(routeTable: PhiCmsActiveRouteTable): PhiPresetPageNode[] {
  const roots: PhiPresetPageNode[] = [];
  for (const descriptor of routeTable.exactByPath.values()) {
    insertPhiPresetPageTarget(roots, descriptor);
  }
  return roots;
}
