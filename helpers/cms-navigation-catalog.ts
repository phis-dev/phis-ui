import {
  isPhiCmsAreaKey,
  resolvePhiCmsAreaAsBuilderArea,
  type PhiBuilderAreaKey,
  type PhiCmsAreaKey,
} from "../constants/cms-areas";
import { readPhiCmsNavigationTargetPath } from "../helpers/navigation-target";
import { resolvePhiCmsNavigationOverlay } from "../plugins/runtime-modules/descriptor-compiler";
import type {
  PhiCmsPresetIdentity,
  PhiCmsNavigationFolder,
  PhiCmsNavigationOverlay,
  PhiCmsResolvedNavigationItem,
  PhiCmsResolvedNavigationSurface,
  PhiRuntimeModuleId,
} from "../types/cms-module-descriptors";
import type { PhiCmsInstanceId } from "../types/cms-instance-id";
import { resolvePhiBuilderNavigationTargetPath } from "./cms-paths";
import type { PhiPresetPageNode } from "./cms-page-catalog";

export type PhiBuilderNavigationItem = {
  id: PhiCmsInstanceId;
  source: "module" | "custom";
  ownerModuleId: PhiRuntimeModuleId | null;
  kind: "link" | "container" | "separator";
  label: string;
  href: string | null;
  targetReference?: string | null;
  /** The Area the reference resolves in, where it is not this Navigation's own. */
  targetArea?: PhiCmsAreaKey | null;
  targetDeleted?: boolean;
  icon?: string | null;
  external?: boolean;
  newTab?: boolean;
  hidden: boolean;
  /** A Module link's Page, so a container's folder address can lead to it by reference. */
  targetPreset?: PhiCmsPresetIdentity;
  /** A container's folder address and what it leads to. */
  folder?: PhiCmsNavigationFolder | null;
  children: PhiBuilderNavigationItem[];
};

export type PhiBuilderNavigationTree = {
  key: string;
  label: string | null;
  items: PhiBuilderNavigationItem[];
  descriptorSurface: PhiCmsResolvedNavigationSurface;
  diagnostics: readonly string[];
  draftAllocation: {
    revisionId: number;
    nextNodeSequence: number;
  } | null;
};

export type PhiBuilderNavigationPresetFamily = "header" | "sidebar" | "footer" | "quicklinks";

export function normalizePhiBuilderNavigationKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function normalizePhiBuilderNavigationLocalKey(value: string | null | undefined) {
  const normalized = normalizePhiBuilderNavigationKey(value);
  return /^[a-z0-9](?:[a-z0-9/_-]*[a-z0-9])?$/.test(normalized) ? normalized : null;
}

export function formatPhiBuilderNavigationScopeKey(area: PhiCmsAreaKey, key: string | null | undefined) {
  const normalizedKey = normalizePhiBuilderNavigationLocalKey(key);
  const scopedKey = normalizedKey ? `${area}:${normalizedKey}` : "";
  return scopedKey.length <= 64 ? scopedKey : "";
}

export function parsePhiBuilderNavigationScopeKey(value: string | null | undefined) {
  const normalized = normalizePhiBuilderNavigationKey(value);
  const separatorIndex = normalized.indexOf(":");
  if (
    separatorIndex <= 0 ||
    separatorIndex >= normalized.length - 1 ||
    normalized.indexOf(":", separatorIndex + 1) !== -1
  ) {
    return null;
  }
  const area = normalized.slice(0, separatorIndex);
  const key = normalized.slice(separatorIndex + 1);
  if (
    !area ||
    !key ||
    normalized.length > 64 ||
    !isPhiCmsAreaKey(area) ||
    normalizePhiBuilderNavigationLocalKey(key) !== key
  ) {
    return null;
  }
  return { area, key };
}

export function requirePhiBuilderNavigationScopeKey(value: string | null | undefined) {
  const parsed = parsePhiBuilderNavigationScopeKey(value);
  if (!parsed) {
    throw new Error("Navigation key must be formatted as area:key.");
  }
  return formatPhiBuilderNavigationScopeKey(parsed.area, parsed.key);
}

export function getPhiBuilderNavigationDefaultScopeKey(
  area: PhiCmsAreaKey,
  family?: PhiBuilderNavigationPresetFamily | null,
) {
  const resolvedFamily = family ?? (
    area === "app" || area === "admin" || area === "builder" || area === "editor" || area === "accounting"
      ? "sidebar"
      : "header"
  );
  return formatPhiBuilderNavigationScopeKey(area, resolvedFamily);
}

function materializeNavigationItem(
  item: PhiCmsResolvedNavigationItem,
  tombstones: ReadonlySet<string>,
  customItems: ReadonlyMap<string, PhiCmsNavigationOverlay["customItems"][number]>,
  overrides: ReadonlyMap<string, PhiCmsNavigationOverlay["itemOverrides"][number]>,
): PhiBuilderNavigationItem {
  const customItem = customItems.get(item.id);
  const customTarget = customItem?.target;
  const folder = item.kind === "container" ? customItem?.folder ?? overrides.get(item.id)?.folder : undefined;
  return {
    id: item.id,
    source: item.ownerModuleId === null ? "custom" : "module",
    ownerModuleId: item.ownerModuleId,
    kind: item.kind,
    label: item.label.defaultMessage,
    href: customTarget?.kind === "external"
      ? customTarget.href
      : readPhiCmsNavigationTargetPath(item.target),
    ...(customTarget?.kind === "page" ? {
      targetReference: customTarget.reference,
      ...(customTarget.area ? { targetArea: customTarget.area } : {}),
      targetDeleted: customTarget.deleted === true,
    } : {}),
    icon: item.icon ?? null,
    ...(item.target?.kind === "module"
      ? { targetPreset: { ownerModuleId: item.target.ownerModuleId, presetKey: item.target.presetKey } }
      : {}),
    ...(customTarget?.kind === "external" ? { external: true } : {}),
    ...(customItem?.newTab === true ? { newTab: true } : {}),
    hidden: tombstones.has(item.id),
    ...(folder ? { folder } : {}),
    children: item.children.map((child) => materializeNavigationItem(child, tombstones, customItems, overrides)),
  };
}

export function createPhiBuilderCustomNavigationSurface(
  navKey: string,
  label?: string | null,
): PhiCmsResolvedNavigationSurface {
  const parsed = parsePhiBuilderNavigationScopeKey(navKey);
  if (!parsed) {
    throw new Error("Navigation key must be formatted as area:key.");
  }
  return {
    area: parsed.area,
    navKey: formatPhiBuilderNavigationScopeKey(parsed.area, parsed.key) as `${PhiCmsAreaKey}:${string}`,
    label: { defaultMessage: label?.trim() || parsed.key },
    items: [],
  };
}

export function materializePhiBuilderNavigationSurface(
  descriptorSurface: PhiCmsResolvedNavigationSurface,
  overlay: PhiCmsNavigationOverlay | null,
): PhiBuilderNavigationTree {
  const resolution = resolvePhiCmsNavigationOverlay(descriptorSurface, overlay);
  const editorResolution = overlay?.tombstones.length
    ? resolvePhiCmsNavigationOverlay(descriptorSurface, { ...overlay, tombstones: [] })
    : resolution;
  const tombstones = new Set(overlay?.tombstones ?? []);
  const customItems = new Map((overlay?.customItems ?? []).map((item) => [item.id, item] as const));
  const overrides = new Map((overlay?.itemOverrides ?? []).map((item) => [item.id, item] as const));
  const { surface } = editorResolution;
  return {
    key: surface.navKey,
    label: surface.label.defaultMessage,
    items: surface.items.map((item) => materializeNavigationItem(item, tombstones, customItems, overrides)),
    descriptorSurface,
    diagnostics: resolution.diagnostics.map(({ code, id, referenceId }) =>
      `${code}: ${id}${referenceId ? ` -> ${referenceId}` : ""}`,
    ),
    draftAllocation: null,
  };
}

export function findPhiBuilderNavigationSurface(
  surfaces: readonly PhiCmsResolvedNavigationSurface[],
  navKey: string,
) {
  const normalized = requirePhiBuilderNavigationScopeKey(navKey);
  return surfaces.find((candidate) => candidate.navKey === normalized) ?? null;
}

export function resolvePhiBuilderNavigationSurface(
  surfaces: readonly PhiCmsResolvedNavigationSurface[],
  navKey: string,
) {
  const normalized = requirePhiBuilderNavigationScopeKey(navKey);
  const surface = findPhiBuilderNavigationSurface(surfaces, normalized);
  if (!surface) {
    throw new Error(`Navigation surface "${normalized}" is not declared by its Area module.`);
  }
  return surface;
}

/**
 * Each link's address, worked out in the Area its target actually lives in.
 *
 * An item may name another Area, and then that Area's catalog is the only one holding its Page and the
 * only one that can prefix its path. Resolving everything against the edited Area is what made a
 * cross-Area link read as unresolvable the moment it was dropped: the reference was right, the catalog
 * looked in was the wrong one, and a Page that is simply absent looks exactly like a Page that is gone.
 *
 * `pagesForArea` rather than one list, because the caller is the only one that can reach another Area's
 * catalog -- and nearly every call asks for the same Area twice, so the cost is a cached lookup.
 */
/**
 * A Page catalog lookup by CMS Area, for a caller that has one keyed by Builder Area.
 *
 * The two lists carry the same names and are still two questions -- the Areas a Site has, and the Areas
 * the Builder can open -- so the translation is stated rather than assumed. An Area the Builder does not
 * open has no catalog to show, and an empty list is the honest answer: a link into it resolves to
 * nothing, which is what the reader sees.
 */
export function createPhiBuilderNavigationPageLookup(
  pageCatalogForArea: (area: PhiBuilderAreaKey) => readonly PhiPresetPageNode[],
) {
  return (area: PhiCmsAreaKey): readonly PhiPresetPageNode[] => {
    const builderArea = resolvePhiCmsAreaAsBuilderArea(area);
    return builderArea ? pageCatalogForArea(builderArea) : [];
  };
}

export function resolvePhiBuilderNavigationPageTargets(
  area: PhiCmsAreaKey,
  items: readonly PhiBuilderNavigationItem[],
  pagesForArea: ((area: PhiCmsAreaKey) => readonly PhiPresetPageNode[]) | readonly PhiPresetPageNode[],
): PhiBuilderNavigationItem[] {
  const readPages = typeof pagesForArea === "function"
    ? pagesForArea
    : () => pagesForArea;
  const byArea = new Map<PhiCmsAreaKey, Map<string, PhiPresetPageNode>>();
  const pageIndex = (targetArea: PhiCmsAreaKey) => {
    const cached = byArea.get(targetArea);
    if (cached) return cached;
    const index = new Map<string, PhiPresetPageNode>();
    const collect = (nodes: readonly PhiPresetPageNode[]) => {
      for (const node of nodes) {
        if (node.reference) index.set(node.reference, node);
        if (node.children) collect(node.children);
      }
    };
    collect(readPages(targetArea));
    byArea.set(targetArea, index);
    return index;
  };

  return items.map((item) => {
    const targetArea = item.targetArea ?? area;
    const page = item.targetReference ? pageIndex(targetArea).get(item.targetReference) : null;
    return {
      ...item,
      ...(item.targetReference ? {
        href: page && page.tombstoned !== true
          ? resolvePhiBuilderNavigationTargetPath(targetArea, page.key, readPages(targetArea))
          : null,
        targetDeleted: page == null || page.tombstoned === true,
      } : {}),
      children: resolvePhiBuilderNavigationPageTargets(area, item.children, pagesForArea),
    };
  });
}
