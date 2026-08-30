import { isPhiCmsAreaKey, type PhiCmsAreaKey } from "../constants/cms-areas";
import { readPhiCmsNavigationTargetPath } from "../helpers/navigation-target";
import { resolvePhiCmsNavigationOverlay } from "../plugins/runtime-modules/descriptor-compiler";
import type {
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
  targetDeleted?: boolean;
  icon?: string | null;
  external?: boolean;
  newTab?: boolean;
  hidden: boolean;
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

export function countPhiBuilderNavigationItems(items: PhiBuilderNavigationItem[]): number {
  return items.reduce((total, item) => total + 1 + countPhiBuilderNavigationItems(item.children), 0);
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
): PhiBuilderNavigationItem {
  const customItem = customItems.get(item.id);
  const customTarget = customItem?.target;
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
      targetDeleted: customTarget.deleted === true,
    } : {}),
    icon: item.icon ?? null,
    ...(customTarget?.kind === "external" ? { external: true } : {}),
    ...(customItem?.newTab === true ? { newTab: true } : {}),
    hidden: tombstones.has(item.id),
    children: item.children.map((child) => materializeNavigationItem(child, tombstones, customItems)),
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
  const { surface } = editorResolution;
  return {
    key: surface.navKey,
    label: surface.label.defaultMessage,
    items: surface.items.map((item) => materializeNavigationItem(item, tombstones, customItems)),
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

export function resolvePhiBuilderNavigationPageTargets(
  area: PhiCmsAreaKey,
  items: readonly PhiBuilderNavigationItem[],
  pages: readonly PhiPresetPageNode[],
): PhiBuilderNavigationItem[] {
  const pageByReference = new Map<string, PhiPresetPageNode>();
  const collect = (nodes: readonly PhiPresetPageNode[]) => {
    for (const node of nodes) {
      if (node.reference) pageByReference.set(node.reference, node);
      if (node.children) collect(node.children);
    }
  };
  collect(pages);
  return items.map((item) => {
    const page = item.targetReference ? pageByReference.get(item.targetReference) : null;
    return {
      ...item,
      ...(item.targetReference ? {
        href: page && page.tombstoned !== true
          ? resolvePhiBuilderNavigationTargetPath(area, page.key, pages)
          : null,
        targetDeleted: page == null || page.tombstoned === true,
      } : {}),
      children: resolvePhiBuilderNavigationPageTargets(area, item.children, pages),
    };
  });
}
