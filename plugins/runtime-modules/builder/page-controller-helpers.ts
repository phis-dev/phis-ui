import {
  normalizePhiBuilderCmsCatalogPath,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { resolvePhiBuilderCmsStoragePath } from "../../../helpers/cms-paths";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";
import {
  normalizePhiCascaderValue,
  type PhiCascaderOption,
} from "../../../components/controls/phi-cascader-control";

export function findPhiDeveloperBuilderPageNode(
  nodes: PhiPresetPageNode[],
  pageKey: string,
): PhiPresetPageNode | null {
  for (const node of nodes) {
    if (node.key === pageKey) {
      return node;
    }

    const child = findPhiDeveloperBuilderPageNode(node.children ?? [], pageKey);
    if (child) {
      return child;
    }
  }

  return null;
}

export function collectPhiDeveloperBuilderPageKeys(
  nodes: PhiPresetPageNode[],
  keys = new Set<string>(),
) {
  for (const node of nodes) {
    keys.add(node.key);
    if (node.children) {
      collectPhiDeveloperBuilderPageKeys(node.children, keys);
    }
  }

  return keys;
}

export function collectPhiDeveloperBuilderPagePathOptions(
  area: PhiDeveloperBuilderArea,
  nodes: PhiPresetPageNode[],
  paths = new Map<string, PhiCascaderOption>(),
) {
  for (const node of nodes) {
    const path = normalizePhiBuilderCmsCatalogPath(
      resolvePhiBuilderCmsStoragePath(area, node.key, nodes),
    );
    paths.set(path, {
      value: path,
      label: node.title,
    });
    if (node.children) {
      collectPhiDeveloperBuilderPagePathOptions(area, node.children, paths);
    }
  }

  return Array.from(paths.values()).sort((left, right) => left.value.localeCompare(right.value));
}

export function collectPhiDeveloperBuilderPageStoragePaths(
  area: PhiDeveloperBuilderArea,
  nodes: PhiPresetPageNode[],
) {
  return new Set(collectPhiDeveloperBuilderPagePathOptions(area, nodes).map((option) => option.value));
}

export function slugifyPhiDeveloperBuilderPagePath(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveUniquePhiDeveloperBuilderPagePath(
  basePath: string,
  existingPaths: Set<string>,
) {
  const normalizedBasePath = normalizePhiCascaderValue(basePath, { normalize: "path" });
  const withoutLeadingSlash = normalizedBasePath.replace(/^\/+/, "");
  const baseSegment = withoutLeadingSlash || "page";
  let candidate = normalizedBasePath === "/" ? "/page" : normalizedBasePath;
  let suffix = 2;

  while (existingPaths.has(candidate)) {
    candidate = `/${baseSegment}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
