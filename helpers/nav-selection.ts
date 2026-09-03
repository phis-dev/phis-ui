import { SUPPORTED_CMS_AREAS } from "./locale";
import type { PhiNavItem } from "../components/shell/shell-types";

/**
 * Strips whatever prefixes a CMS path, so two hrefs can be compared for "is this the current page".
 *
 * The locales are passed in rather than known here: which ones a Site has is its own configuration,
 * and a fixed list would silently stop recognising a prefix on any installation that departed from it.
 */
function normalizePhiCmsNavPath(pathname: string, availableLocales: readonly string[]) {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (firstSegment && availableLocales.includes(firstSegment)) {
    return `/${segments.slice(1).join("/")}`;
  }

  if (firstSegment && firstSegment !== "public" && SUPPORTED_CMS_AREAS.includes(firstSegment as (typeof SUPPORTED_CMS_AREAS)[number])) {
    return `/${segments.slice(1).join("/")}`;
  }

  if (firstSegment === "public") {
    return `/${segments.slice(1).join("/")}`;
  }

  return pathname;
}

export function isPhiNavPathActive(
  pathname: string,
  href: string,
  availableLocales: readonly string[],
) {
  const target = href.replace(/\/+$/, "") || "/";
  const current = normalizePhiCmsNavPath(pathname || "/", availableLocales).replace(/\/+$/, "") || "/";
  const normalizedTarget = normalizePhiCmsNavPath(target, availableLocales).replace(/\/+$/, "") || "/";
  if (normalizedTarget === "/") {
    return current === "/";
  }
  return current === normalizedTarget || current.startsWith(`${normalizedTarget}/`);
}

export function collectPhiSelectedNavKeys(
  pathname: string,
  items: PhiNavItem[],
  availableLocales: readonly string[],
) {
  const selected = new Set<string>();

  function visit(item: PhiNavItem): boolean {
    const children = item.children ?? [];
    const childMatch = children.some(visit);
    const selfMatch = children.length === 0 && item.href
      ? isPhiNavPathActive(pathname, item.href, availableLocales)
      : false;
    if (selfMatch || childMatch) {
      selected.add(item.key);
      return true;
    }
    return false;
  }

  items.forEach(visit);
  return Array.from(selected);
}
