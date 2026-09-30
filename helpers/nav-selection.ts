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
  let offset = 0;

  /*
   * A CMS path can carry both prefixes, locale first and Area second (`/de/admin/users`), so each is
   * stripped in that order rather than whichever comes first alone. `public` is an Area like the
   * others here: its prefix says nothing about which page is meant.
   */
  if (availableLocales.includes(segments[offset]?.toLowerCase() ?? "")) {
    offset += 1;
  }

  const areaSegment = segments[offset]?.toLowerCase();

  if (SUPPORTED_CMS_AREAS.includes(areaSegment as (typeof SUPPORTED_CMS_AREAS)[number])) {
    offset += 1;
  }

  return offset === 0 ? pathname : `/${segments.slice(offset).join("/")}`;
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
