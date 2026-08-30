import {
  resolvePhiBuilderAreaAsCmsArea,
  type PhiBuilderAreaKey,
} from "../../../constants/cms-areas";
import {
  formatPhiBuilderNavigationScopeKey,
  getPhiBuilderNavigationDefaultScopeKey,
  parsePhiBuilderNavigationScopeKey,
} from "../../../helpers/cms-navigation-catalog";
import type { PhiBuilderPageCatalogArea } from "../../../helpers/cms-page-catalog";
import { PHI_BUILDER_NAVIGATION_DND_SOURCE_PAGE } from "../../../constants/builder-navigation-dnd";
import { createPhiPageUri, readPhiInternalReference, type PhiPageReference } from "../../../types/references";

export function resolvePhiBuilderNavigationWidgetNavKey(
  configuredNavKey: string | null | undefined,
  searchValue: string | null,
  area: PhiBuilderAreaKey,
) {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const configured = parsePhiBuilderNavigationScopeKey(configuredNavKey);
  if (configured?.area === cmsArea) {
    return formatPhiBuilderNavigationScopeKey(configured.area, configured.key);
  }

  const parsed = parsePhiBuilderNavigationScopeKey(searchValue);
  if (parsed?.area === cmsArea) {
    return formatPhiBuilderNavigationScopeKey(parsed.area, parsed.key);
  }

  return (
    getPhiBuilderNavigationDefaultScopeKey(cmsArea) ??
    formatPhiBuilderNavigationScopeKey("public", "header")
  );
}

export function buildPhiBuilderNavigationPageDragSourceKey(
  area: PhiBuilderPageCatalogArea,
  reference: PhiPageReference,
) {
  return `${PHI_BUILDER_NAVIGATION_DND_SOURCE_PAGE}:${area}:${createPhiPageUri(reference)}`;
}

export function parsePhiBuilderNavigationPageDragSourceKey(sourceKey: string | null | undefined) {
  if (!sourceKey?.startsWith(`${PHI_BUILDER_NAVIGATION_DND_SOURCE_PAGE}:`)) {
    return null;
  }
  const prefix = `${PHI_BUILDER_NAVIGATION_DND_SOURCE_PAGE}:`;
  const remainder = sourceKey.slice(prefix.length);
  const separator = remainder.indexOf(":");
  if (separator <= 0) return null;
  const area = remainder.slice(0, separator);
  const reference = remainder.slice(separator + 1);
  const parsed = readPhiInternalReference(reference);
  return area && parsed?.kind === "page"
    ? { area: area as PhiBuilderPageCatalogArea, reference }
    : null;
}
