import { SUPPORTED_CMS_AREAS, SUPPORTED_LOCALES } from "./locale";
import type { PhiNavItem } from "../components/shell/shell-types";

function normalizePhiCmsNavPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (firstSegment && SUPPORTED_LOCALES.includes(firstSegment as (typeof SUPPORTED_LOCALES)[number])) {
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

export function isPhiNavPathActive(pathname: string, href: string) {
  const target = href.replace(/\/+$/, "") || "/";
  const current = normalizePhiCmsNavPath(pathname || "/").replace(/\/+$/, "") || "/";
  const normalizedTarget = normalizePhiCmsNavPath(target).replace(/\/+$/, "") || "/";
  if (normalizedTarget === "/") {
    return current === "/";
  }
  return current === normalizedTarget || current.startsWith(`${normalizedTarget}/`);
}

export function collectPhiSelectedNavKeys(pathname: string, items: PhiNavItem[]) {
  const selected = new Set<string>();

  function visit(item: PhiNavItem): boolean {
    const children = item.children ?? [];
    const childMatch = children.some(visit);
    const selfMatch = children.length === 0 && item.href
      ? isPhiNavPathActive(pathname, item.href)
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
