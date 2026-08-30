"server-only";

import {
  isPhiCmsNavigationOverlayTarget,
  readPhiCmsNavigationTargetPath,
} from "../../helpers/navigation-target";
import { createPhiPresetCmsInstanceId } from "../../types/cms-instance-id";
import {
  createGlobalTranslator,
  createSiteTranslator,
  PHI_TR_CTX_WEB_UI_LABEL,
} from "../../gateway/tr";
import {
  resolvePhiCmsNavigationOverlay,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsRoutePresetByIdentity,
} from "../../plugins/runtime-modules/descriptor-compiler";
import { phiRuntime } from "../../server-helpers/phi-runtime";
import { getPhiRequestNavigationContext } from "../../server-helpers/request-runtime";
import type {
  PhiCmsNavigationOverlay,
  PhiCmsResolvedNavigationItem,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type { PhiBlockRuntime } from "../../types";
import type { PhiNavItem } from "../shell/shell-types";
import { readPhiPageReference } from "../../types/references";
import { canPhiViewerAccess } from "../../types/access";

function collectNavigationLabels(
  items: readonly PhiCmsResolvedNavigationItem[],
  labels = new Set<string>(),
) {
  for (const item of items) {
    labels.add(item.label.defaultMessage);
    collectNavigationLabels(item.children, labels);
  }
  return labels;
}

function omitDeletedNavigationTargets(
  items: readonly PhiCmsResolvedNavigationItem[],
  deletedIds: ReadonlySet<string>,
): PhiCmsResolvedNavigationItem[] {
  return items.flatMap((item) => deletedIds.has(item.id) ? [] : [{
    ...item,
    children: omitDeletedNavigationTargets(item.children, deletedIds),
  }]);
}

function mapResolvedNavigationItem(
  item: PhiCmsResolvedNavigationItem,
  translatedLabels: ReadonlyMap<string, string>,
): PhiNavItem {
  return {
    key: item.id,
    label: translatedLabels.get(item.label.defaultMessage) ?? item.label.defaultMessage,
    ...(readPhiCmsNavigationTargetPath(item.target) ? { href: readPhiCmsNavigationTargetPath(item.target)! } : {}),
    ...(isPhiCmsNavigationOverlayTarget(item.target)
      ? {
        overlayInstanceId: createPhiPresetCmsInstanceId({
          domain: "area",
          ownerModuleId: item.target.ownerModuleId,
          presetKey: item.target.presetKey,
          nodeKey: item.target.nodeKey,
        }),
      }
      : {}),
    ...(item.target?.kind === "custom" && item.target.external === true ? { external: true } : {}),
    ...(item.target?.kind === "custom" && item.target.newTab === true ? { newTab: true } : {}),
    ...(item.kind === "separator" ? { separator: true } : {}),
    ...(item.icon ? { icon: item.icon.includes(":") ? item.icon : `antd:${item.icon}` } : {}),
    ...(item.children.length > 0
      ? { children: item.children.map((child) => mapResolvedNavigationItem(child, translatedLabels)) }
      : {}),
  };
}

export async function resolvePhiDescriptorNavigationItems(
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer">,
  navKey: string,
  overlay: PhiCmsNavigationOverlay | null = null,
): Promise<PhiNavItem[] | null> {
  const normalizedNavKey = navKey.trim().toLowerCase();
  if (!normalizedNavKey.startsWith(`${runtime.area}:`)) {
    return null;
  }

  const { catalog, activeModuleIds } = getPhiRequestNavigationContext(runtime.area);
  const descriptorSurface = resolvePhiCmsActiveNavigationSurfaces({
    catalog,
    area: runtime.area,
    activeModuleIds,
    viewer: runtime.viewer,
  }).find((candidate) => candidate.navKey === normalizedNavKey);
  if (!descriptorSurface && !overlay) {
    return null;
  }
  const projectedOverlay = overlay ? {
    ...overlay,
    customItems: overlay.customItems.map((item) => {
      if (item.target?.kind !== "page" || item.target.resolvedPath || item.target.deleted === true) return item;
      const reference = readPhiPageReference(item.target.reference);
      if (!reference || reference.target.kind !== "module") return item;
      const route = resolvePhiCmsRoutePresetByIdentity(
        catalog,
        reference.target.ownerModuleId as PhiRuntimeModuleId,
        reference.target.presetKey,
      );
      const available = route != null && route.area === runtime.area &&
        activeModuleIds.has(route.ownerModuleId) && canPhiViewerAccess(runtime.viewer, route.accessPolicy);
      return {
        ...item,
        target: {
          ...item.target,
          resolvedPath: available ? route.path : null,
          deleted: !available,
        },
      };
    }),
  } : null;
  const resolution = resolvePhiCmsNavigationOverlay(
    descriptorSurface ?? {
      area: runtime.area,
      navKey: normalizedNavKey as `${typeof runtime.area}:${string}`,
      label: { defaultMessage: overlay?.label ?? normalizedNavKey.split(":").slice(1).join(":") },
      items: [],
    },
    projectedOverlay,
  );
  const deletedIds = new Set((projectedOverlay?.customItems ?? []).flatMap((item) =>
    item.target?.kind === "page" && item.target.deleted === true ? [item.id] : [],
  ));
  const surface = deletedIds.size > 0
    ? { ...resolution.surface, items: omitDeletedNavigationTargets(resolution.surface.items, deletedIds) }
    : resolution.surface;
  if (resolution.diagnostics.length > 0) {
    console.warn("[phi-navigation] Ignored dormant or invalid navigation overlay entries.", {
      navKey: surface.navKey,
      diagnostics: resolution.diagnostics,
    });
  }

  const rt = phiRuntime(runtime);
  const labels = [...collectNavigationLabels(surface.items)];
  const translator = runtime.area === "builder"
    ? createGlobalTranslator({
        apiBaseUrl: rt.apiBaseUrl,
        internalToken: rt.internalToken,
        locale: runtime.locale.current,
      })
    : createSiteTranslator({
        apiBaseUrl: rt.apiBaseUrl,
        internalToken: rt.internalToken,
        siteKey: rt.siteKey,
        locale: runtime.locale.current,
      });
  const translated = labels.length
    ? await translator.trBulk(labels, PHI_TR_CTX_WEB_UI_LABEL).catch(() => labels)
    : [];
  const translatedLabels = new Map(
    labels.map((source, index) => [source, translated[index] ?? source] as const),
  );

  return surface.items.map((item) => mapResolvedNavigationItem(item, translatedLabels));
}
