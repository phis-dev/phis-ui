"use client";

import type { PhiBuilderPageCatalogArea } from "../../../helpers/cms-page-catalog";
import { resolvePhiBuilderCatalogApiArea } from "../../../helpers/cms-page-catalog";

/**
 * What a Module draws on this Site's published pages, per Area.
 *
 * Asked when a Module is about to be switched off. The blocks are not deleted by that -- they stay in
 * their pages and stop being drawn -- but a page losing a third of its content without anyone saying
 * so is exactly the kind of quiet damage the Builder exists to prevent.
 */
export type PhiBuilderModuleBlockUsageEntry = {
  kind: "page" | "area";
  pageScopeId: number | null;
  path: string | null;
  ownerModuleId: string | null;
  presetKey: string | null;
  blocks: number;
};

export async function loadPhiBuilderModuleBlockUsage(
  area: PhiBuilderPageCatalogArea,
  moduleId: string,
): Promise<PhiBuilderModuleBlockUsageEntry[]> {
  const url = new URL("/api/site/cms/module-usage", window.location.origin);
  url.searchParams.set("area", resolvePhiBuilderCatalogApiArea(area));
  url.searchParams.set("moduleId", moduleId);
  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  const body = (await response.json().catch(() => null)) as
    | { usage?: PhiBuilderModuleBlockUsageEntry[]; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "Failed to read Module usage.");
  }
  return Array.isArray(body?.usage) ? body.usage : [];
}
