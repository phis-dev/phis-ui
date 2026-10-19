import {
  PHI_CMS_REGION_PAGE_SCOPE_MODES,
  PHI_CMS_REGION_REVEAL_MODES,
  PhiCmsRegionPageScopeEntryFlag,
  type PhiCmsRegionConfig,
  type PhiCmsRegionKey,
  type PhiCmsRegionPageScope,
  type PhiCmsRegionPageScopeEntry,
  type PhiCmsRegionReveal,
  type PhiCmsResolvedRegionPageScope,
} from "../types/cms-presets";
import { readPhiLinkTarget, type PhiPageReference, type PhiResolvedLinkTargets } from "../types/references";
import { isPhiCmsShellOwnedRegion } from "./cms-region-keys";
import { hasPhiFlag } from "./flags";
import { stripLocaleAndAreaFromPathname } from "./locale";

/*
 * Which Pages a Shell Region stands on, and how `header_top` comes into view (SHELL.md "Region
 * visibility per Page").
 *
 * The scope is stated by reference and resolved by the server for each render, with the render's own
 * batch of link targets; the browser compares the visitor's path against what came out. The comparison
 * stays in the browser because the Shell is a Next Layout, and a Layout of a dynamic Area is not rendered
 * again when the visitor follows a link inside it: a rule decided on the server would hold the first
 * Page's answer for every Page after it.
 */

/**
 * The Region's Page scope as stored, or null where it stands on every Page. Only a Shell Region has one:
 * a Page-owned Region belongs to a single Page already.
 */
export function readPhiCmsRegionPageScope(
  regionKey: PhiCmsRegionKey,
  config: PhiCmsRegionConfig | null | undefined,
): PhiCmsRegionPageScope | null {
  if (!isPhiCmsShellOwnedRegion(regionKey)) {
    return null;
  }
  const scope = config?.pageScope;
  if (scope == null || !PHI_CMS_REGION_PAGE_SCOPE_MODES.includes(scope.mode) || scope.mode === "all") {
    return null;
  }
  if (scope.mode === "root") {
    return { mode: "root" };
  }
  return { mode: scope.mode, entries: readPhiCmsRegionPageScopeEntries(scope.entries) };
}

/** The entries a stored scope names, each read whole; an entry that names nothing is dropped. */
export function readPhiCmsRegionPageScopeEntries(value: unknown): PhiCmsRegionPageScopeEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry): PhiCmsRegionPageScopeEntry[] => {
    if (entry == null || typeof entry !== "object") {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const target = readPhiLinkTarget(record.pageLinkTarget);
    if (target?.kind === "page") {
      const flags = typeof record.flags === "number" ? record.flags : 0;
      return [{ pageLinkTarget: target, ...(flags === 0 ? {} : { flags }) }];
    }
    const folder = typeof record.folder === "string" ? normalizePhiCmsRegionScopePath(record.folder) : null;
    return folder == null ? [] : [{ folder }];
  });
}

/** The Pages a scope names by reference, for the render that resolves them. */
export function collectPhiCmsRegionPageScopeReferences(scope: PhiCmsRegionPageScope | null): PhiPageReference[] {
  return (scope?.entries ?? []).flatMap((entry) =>
    "pageLinkTarget" in entry && entry.pageLinkTarget.kind === "page" ? [entry.pageLinkTarget.reference] : []);
}

/**
 * The scope as the browser asks it, with every reference turned into the address it leads to now.
 *
 * A reference that does not resolve -- a Page deleted, a Module switched off -- drops out on its own.
 * A list with nothing left in it is no rule at all, and the Region stands on every Page: an author who
 * named Pages that are gone did not ask for a Region on no Page, and could not find it again if it were.
 */
export function resolvePhiCmsRegionPageScope(
  scope: PhiCmsRegionPageScope | null,
  links: PhiResolvedLinkTargets | null,
  availableLocales: readonly string[],
): PhiCmsResolvedRegionPageScope | null {
  if (scope == null || scope.mode === "all") {
    return null;
  }
  if (scope.mode === "root") {
    return { mode: "root" };
  }
  const paths: string[] = [];
  const prefixes: string[] = [];
  for (const entry of scope.entries ?? []) {
    if ("folder" in entry) {
      prefixes.push(entry.folder);
      continue;
    }
    if (entry.pageLinkTarget.kind !== "page") {
      continue;
    }
    const href = links?.get(entry.pageLinkTarget.reference);
    const path = href == null
      ? null
      : normalizePhiCmsRegionScopePath(stripLocaleAndAreaFromPathname(href, { availableLocales: [...availableLocales] }));
    if (path == null) {
      continue;
    }
    (hasPhiFlag(entry.flags, PhiCmsRegionPageScopeEntryFlag.Subtree) ? prefixes : paths).push(path);
  }
  return paths.length === 0 && prefixes.length === 0 ? null : { mode: scope.mode, paths, prefixes };
}

/** An address inside the Area as it is compared: one leading slash, no trailing one. */
function normalizePhiCmsRegionScopePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }
  return `/${trimmed.split("/").filter(Boolean).join("/")}`;
}

/** Whether the Region stands on the Page at `pagePath`, an address inside the Area. */
export function phiCmsRegionPageScopeIncludes(scope: PhiCmsResolvedRegionPageScope | null, pagePath: string) {
  if (scope == null) {
    return true;
  }
  const page = normalizePhiCmsRegionScopePath(pagePath) ?? "/";
  if (scope.mode === "root") {
    return page === "/";
  }
  const matched =
    scope.paths.includes(page) ||
    scope.prefixes.some((prefix) => prefix === "/" || page === prefix || page.startsWith(`${prefix}/`));
  return scope.mode === "include" ? matched : !matched;
}

/**
 * How the Region comes into view. Only `header_top` reveals: it is the one band above the sticky Header
 * that can leave without taking the Navigation with it.
 */
export function readPhiCmsRegionReveal(
  regionKey: PhiCmsRegionKey,
  config: PhiCmsRegionConfig | null | undefined,
): PhiCmsRegionReveal {
  const reveal = config?.reveal;
  return regionKey === "header_top" && reveal != null && PHI_CMS_REGION_REVEAL_MODES.includes(reveal)
    ? reveal
    : "always";
}
