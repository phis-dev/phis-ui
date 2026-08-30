import {
  PHI_BUILDER_AREA_KEYS,
  resolvePhiBuilderAreaAsCmsArea,
  type PhiBuilderAreaKey,
} from "../constants/cms-areas";
import type { PhiTreeOption } from "../types/tree";
import type { PhiCmsPresetSource } from "../types/cms-module-descriptors";
import {
  createPhiPageReference,
  readPhiPageReference,
  type PhiPageReference,
} from "../types/references";

export type PhiPresetPageNode = {
  key: string;
  title: string;
  storagePath?: string;
  sourcePreset?: PhiCmsPresetSource;
  pageScopeId?: number;
  reference?: PhiPageReference;
  tombstoned?: boolean;
  pathLocked?: boolean;
  pathOwnershipReason?: string;
  children?: PhiPresetPageNode[];
};

export type PhiBuilderModulePresetPagesByArea = Record<
  PhiBuilderPageCatalogArea,
  PhiPresetPageNode[]
>;

export function createEmptyPhiBuilderModulePresetPagesByArea(): PhiBuilderModulePresetPagesByArea {
  return PHI_BUILDER_AREA_KEYS.reduce<PhiBuilderModulePresetPagesByArea>(
    (current, area) => ({ ...current, [area]: [] }),
    {} as PhiBuilderModulePresetPagesByArea,
  );
}

export function mapPhiPresetPageNodesToTreeOptions(nodes: readonly PhiPresetPageNode[]): PhiTreeOption[] {
  return nodes.map((node) => ({
    value: node.key,
    label: node.title,
    children: node.children ? mapPhiPresetPageNodesToTreeOptions(node.children) : undefined,
  }));
}

export type PhiBuilderPageCatalogArea = PhiBuilderAreaKey;

function findPagePathSegments(
  pages: PhiPresetPageNode[],
  targetKey: string,
  prefix: string[] = [],
): string[] | null {
  for (const page of pages) {
    const currentPath = [...prefix, page.key];
    if (page.key === targetKey) {
      return currentPath;
    }

    const childPath = page.children
      ? findPagePathSegments(page.children, targetKey, currentPath)
      : null;
    if (childPath) {
      return childPath;
    }
  }

  return null;
}

function findPageNodePath(
  pages: PhiPresetPageNode[],
  targetKey: string,
  prefix: PhiPresetPageNode[] = [],
): PhiPresetPageNode[] | null {
  for (const page of pages) {
    const currentPath = [...prefix, page];
    if (page.key === targetKey) {
      return currentPath;
    }

    const childPath = page.children
      ? findPageNodePath(page.children, targetKey, currentPath)
      : null;
    if (childPath) {
      return childPath;
    }
  }

  return null;
}

function collectPageKeys(
  pages: PhiPresetPageNode[],
  keys = new Set<string>(),
) {
  for (const page of pages) {
    keys.add(page.key);
    if (page.children) {
      collectPageKeys(page.children, keys);
    }
  }

  return keys;
}

export function mergePhiBuilderPageCatalogNodes(
  presetPages: PhiPresetPageNode[],
  customPages: PhiPresetPageNode[] | null | undefined,
) {
  if (!customPages?.length) {
    return presetPages;
  }

  const existingKeys = collectPageKeys(presetPages);
  const nextCustomPages = customPages.filter((page) => !existingKeys.has(page.key));

  return nextCustomPages.length > 0 ? [...presetPages, ...nextCustomPages] : presetPages;
}

export function resolvePagePath(
  area: PhiBuilderPageCatalogArea,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  const pathSegments = findPagePathSegments([...pages], pageKey) ?? [pageKey];
  return `/${area}/${pathSegments.join("/")}`;
}

export function resolvePageNodePath(
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  return findPageNodePath([...pages], pageKey);
}

export function resolvePhiBuilderActivePageKey(
  requestedPageKey: string | null | undefined,
  pages: readonly PhiPresetPageNode[],
) {
  const normalizedPageKey = requestedPageKey?.trim() ?? "";
  if (normalizedPageKey && findPageNodePath([...pages], normalizedPageKey)) {
    return normalizedPageKey;
  }

  return pages[0]?.key ?? null;
}

export function resolvePhiBuilderPagePresetSource(
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  return findPageNodePath([...pages], pageKey)?.at(-1)?.sourcePreset ?? null;
}

export function normalizePhiBuilderCmsCatalogPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withoutLeading = trimmed.replace(/^\/+/, "");
  const withoutTrailing = withoutLeading.replace(/\/+$/, "");
  return withoutTrailing ? `/${withoutTrailing}` : "/";
}

function titleizePathSegment(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ") || "Page";
}

function collectPresetStoragePaths(
  area: PhiBuilderPageCatalogArea,
  pages: readonly PhiPresetPageNode[],
) {
  const storagePaths = new Set<string>();
  const visit = (nodes: PhiPresetPageNode[]) => {
    for (const node of nodes) {
      storagePaths.add(normalizePhiBuilderCmsCatalogPath(
        resolvePhiBuilderCmsStoragePathForCatalog(area, node.key, pages),
      ));
      if (node.children) {
        visit(node.children);
      }
    }
  };

  visit([...pages]);
  return storagePaths;
}

export function resolvePhiBuilderCmsStoragePathForCatalog(
  area: PhiBuilderPageCatalogArea,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  const node = findPageNodePath([...pages], pageKey)?.at(-1);
  if (!node) {
    throw new Error(`Page "${area}:${pageKey}" is not present in the active Builder Page catalog.`);
  }
  if (node?.storagePath) {
    return normalizePhiBuilderCmsCatalogPath(node.storagePath);
  }
  const rawPath = resolvePagePath(area, pageKey, pages);

  const withoutAreaPrefix = rawPath.replace(new RegExp(`^/${area}(?=/|$)`), "") || "/";

  if (pageKey === "home") {
    return "/";
  }

  return withoutAreaPrefix;
}

export function resolvePhiBuilderPageKeyFromStoragePath(
  area: PhiBuilderPageCatalogArea,
  path: string,
  pages: readonly PhiPresetPageNode[],
) {
  const normalizedPath = normalizePhiBuilderCmsCatalogPath(path);
  const visit = (nodes: readonly PhiPresetPageNode[]): string | null => {
    for (const node of nodes) {
      if (
        normalizePhiBuilderCmsCatalogPath(
          resolvePhiBuilderCmsStoragePathForCatalog(area, node.key, pages),
        ) === normalizedPath
      ) {
        return node.key;
      }
      const childKey = node.children ? visit(node.children) : null;
      if (childKey) {
        return childKey;
      }
    }
    return null;
  };

  const presetKey = visit(pages);
  if (presetKey) {
    return presetKey;
  }

  if (normalizedPath === "/") {
    return "home";
  }

  return normalizedPath.replace(/^\/+/, "");
}

function insertCatalogPath(nodes: PhiPresetPageNode[], path: string) {
  const normalizedPath = normalizePhiBuilderCmsCatalogPath(path);
  const segments = normalizedPath === "/" ? ["home"] : normalizedPath.split("/").filter(Boolean);
  let currentNodes = nodes;
  let cumulativeKey = "";

  segments.forEach((segment, index) => {
    cumulativeKey = cumulativeKey ? `${cumulativeKey}/${segment}` : segment;
    let node = currentNodes.find((candidate) => candidate.key === cumulativeKey);

    if (!node) {
      node = {
        key: cumulativeKey,
        title: titleizePathSegment(segment),
      };
      currentNodes.push(node);
      currentNodes.sort((left, right) => left.title.localeCompare(right.title));
    }

    if (index < segments.length - 1) {
      node.children = node.children ?? [];
      currentNodes = node.children;
    } else {
      node.storagePath = normalizedPath;
    }
  });
}

export type PhiBuilderPersistedPageCatalogEntry = {
  id: number;
  reference: PhiPageReference;
  path: string | null;
  ownerModuleId?: string | null;
  presetKey?: string | null;
  publishedRevisionId?: number | null;
  workingDraftRevisionId?: number | null;
  tombstoned: boolean;
};

function annotatePageCatalogNode(
  nodes: PhiPresetPageNode[],
  predicate: (node: PhiPresetPageNode) => boolean,
  patch: Partial<PhiPresetPageNode>,
): boolean {
  for (const node of nodes) {
    if (predicate(node)) {
      Object.assign(node, patch);
      return true;
    }
    if (node.children && annotatePageCatalogNode(node.children, predicate, patch)) return true;
  }
  return false;
}

function clonePageCatalogNodes(nodes: PhiPresetPageNode[]): PhiPresetPageNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? clonePageCatalogNodes(node.children) : undefined,
  }));
}

export function mergePhiBuilderPageCatalogWithPersistedPages(
  area: PhiBuilderPageCatalogArea,
  presetPages: PhiPresetPageNode[],
  persistedPages: readonly PhiBuilderPersistedPageCatalogEntry[] | null | undefined,
  localPages?: PhiPresetPageNode[] | null,
) {
  const merged = clonePageCatalogNodes(mergePhiBuilderPageCatalogNodes(presetPages, localPages));
  const presetStoragePaths = collectPresetStoragePaths(area, presetPages);

  for (const page of persistedPages ?? []) {
    const parsedReference = readPhiPageReference(page.reference);
    if (!parsedReference || !Number.isSafeInteger(page.id) || page.id <= 0) {
      throw new Error("Persisted Page catalog entry has no valid stable Page identity.");
    }
    if (page.ownerModuleId || page.presetKey) {
      if (!page.ownerModuleId || !page.presetKey) {
        throw new Error("Module Page catalog identity is incomplete.");
      }
      annotatePageCatalogNode(
        merged,
        (node) => node.sourcePreset?.ownerModuleId === page.ownerModuleId &&
          node.sourcePreset?.presetKey === page.presetKey,
        {
          pageScopeId: page.id,
          reference: page.reference,
          tombstoned: page.tombstoned,
          pathLocked: true,
          pathOwnershipReason: `Path is owned by module ${page.ownerModuleId}.`,
        },
      );
      continue;
    }
    if (!page.path) continue;
    const path = normalizePhiBuilderCmsCatalogPath(page.path);
    if (presetStoragePaths.has(path)) {
      continue;
    }
    const patch = {
      pageScopeId: page.id,
      reference: page.reference,
      tombstoned: page.tombstoned,
      pathLocked: false,
    } satisfies Partial<PhiPresetPageNode>;
    if (!annotatePageCatalogNode(
      merged,
      (node) => node.storagePath != null && normalizePhiBuilderCmsCatalogPath(node.storagePath) === path,
      patch,
    )) {
      insertCatalogPath(merged, path);
      annotatePageCatalogNode(
        merged,
        (node) => node.storagePath != null && normalizePhiBuilderCmsCatalogPath(node.storagePath) === path,
        patch,
      );
    }
  }

  const annotateModuleReferences = (nodes: PhiPresetPageNode[]) => {
    for (const node of nodes) {
      if (node.sourcePreset && !node.reference) {
        node.reference = createPhiPageReference({
          kind: "module",
          ownerModuleId: node.sourcePreset.ownerModuleId,
          presetKey: node.sourcePreset.presetKey,
        });
        node.pathLocked = true;
        node.pathOwnershipReason = `Path is owned by module ${node.sourcePreset.ownerModuleId}.`;
      }
      if (node.children) annotateModuleReferences(node.children);
    }
  };
  annotateModuleReferences(merged);

  return merged;
}

/** The page catalog of one Area, with preset, local and persisted pages merged. */
export type PhiBuilderActivePageCatalog = ReturnType<typeof resolvePhiBuilderActivePageCatalog>;

export function resolvePhiBuilderActivePageCatalog(
  area: PhiBuilderPageCatalogArea,
  modulePresetPagesByArea: Partial<Record<PhiBuilderPageCatalogArea, PhiPresetPageNode[]>>,
  localPagesByArea: Partial<Record<PhiBuilderPageCatalogArea, PhiPresetPageNode[]>> | null | undefined,
  persistedPagesByArea?: Partial<
    Record<PhiBuilderPageCatalogArea, PhiBuilderPersistedPageCatalogEntry[]>
  > | null,
) {
  return mergePhiBuilderPageCatalogWithPersistedPages(
    area,
    modulePresetPagesByArea[area] ?? [],
    persistedPagesByArea?.[area],
    localPagesByArea?.[area],
  );
}

export function resolvePhiBuilderCatalogApiArea(area: PhiBuilderPageCatalogArea) {
  return resolvePhiBuilderAreaAsCmsArea(area);
}
