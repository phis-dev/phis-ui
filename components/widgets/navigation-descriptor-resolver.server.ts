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
  resolvePhiCmsRoutePresetByPageId,
} from "../../plugins/runtime-modules/descriptor-compiler";
import { phiRuntime } from "../../server-helpers/phi-runtime";
import { getPhiRequestNavigationContext } from "../../server-helpers/request-runtime";
import type {
  PhiCmsNavigationLabel,
  PhiCmsNavigationOverlay,
  PhiCmsResolvedNavigationItem,
} from "../../types/cms-module-descriptors";
import type { PhiBlockRuntime } from "../../types";
import type { PhiNavItem } from "../shell/shell-types";
import { readPhiPageReference } from "../../types/references";

/**
 * One label's identity for translation: its text and the language it is written in.
 *
 * The same English word is a different message when a Module shipped it than when an operator typed it
 * on a Site whose source language is German, so the two are kept apart all the way to the answer.
 */
function navigationLabelKey(label: PhiCmsNavigationLabel) {
  return `${label.sourceLocale ?? ""}\u0000${label.defaultMessage}`;
}

/** The labels to translate, grouped by source language; `""` is the Site's own. */
function collectNavigationLabels(
  items: readonly PhiCmsResolvedNavigationItem[],
  labels = new Map<string, Set<string>>(),
) {
  for (const item of items) {
    const sourceLocale = item.label.sourceLocale ?? "";
    const group = labels.get(sourceLocale) ?? new Set<string>();
    group.add(item.label.defaultMessage);
    labels.set(sourceLocale, group);
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
    label: translatedLabels.get(navigationLabelKey(item.label)) ?? item.label.defaultMessage,
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
    ...(item.emits?.length ? { emits: item.emits } : {}),
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
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer">,
  navKey: string,
  overlay: PhiCmsNavigationOverlay | null = null,
): Promise<PhiNavItem[] | null> {
  const normalizedNavKey = navKey.trim().toLowerCase();
  if (!normalizedNavKey.startsWith(`${runtime.area}:`)) {
    return null;
  }

  const { catalog, activeModuleIds, routeTable } = getPhiRequestNavigationContext(runtime.area);
  const descriptorSurface = resolvePhiCmsActiveNavigationSurfaces({
    catalog,
    area: runtime.area,
    activeModuleIds,
    routeTable,
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
      /*
       * Whether the address exists and where, which is the Area's active route table and nothing about
       * this reader: the table holds only the routes that answer, on the address this Site gave them.
       *
       * Answered only for a target in this Area. For another Area the answer stops here: the table is
       * this Area's, and which Modules answer in another is a fact the request never read. Reading the
       * catalog's path anyway would point a link at an address that is only served where that Module is
       * switched on -- exactly the guess `REFERENCES.md` forbids. A Site Page in another Area is a
       * different matter and resolves normally; only a Module Page needs the activation nobody here has.
       */
      const targetArea = item.target.area ?? runtime.area;
      const route = targetArea === runtime.area
        ? resolvePhiCmsRoutePresetByPageId(routeTable, reference.target.pageId)?.descriptor ?? null
        : null;
      return {
        ...item,
        target: {
          ...item.target,
          resolvedPath: route?.path ?? null,
          deleted: route == null,
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
  const translatedLabels = new Map<string, string>();
  /*
   * One batch per source language. A Module's label names its language and is translated from it; an
   * operator's names none and is read in the Site's source language, which the server supplies.
   */
  await Promise.all([...collectNavigationLabels(surface.items)].map(async ([sourceLocale, group]) => {
    const labels = [...group];
    const options = {
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      locale: runtime.locale.current,
      ...(sourceLocale ? { sourceLocale } : {}),
    };
    const translator = runtime.area === "builder"
      ? createGlobalTranslator(options)
      : createSiteTranslator({ ...options, siteKey: rt.siteKey });
    const translated = await translator.trBulk(labels, PHI_TR_CTX_WEB_UI_LABEL).catch(() => labels);
    labels.forEach((source, index) => {
      translatedLabels.set(
        navigationLabelKey({ defaultMessage: source, ...(sourceLocale ? { sourceLocale } : {}) }),
        translated[index] ?? source,
      );
    });
  }));

  return surface.items.map((item) => mapResolvedNavigationItem(item, translatedLabels));
}
