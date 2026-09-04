import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { PHI_BUILDER_AREA_KEYS } from "../../../constants/cms-areas";
import type { PhiResolvedCmsAreaPresetTree, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../../../types";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { getCurrentSiteAreaDraft, getExactSiteArea } from "../../../gateway/site-area";
import { resolvePhiRuntimeModuleIdsForArea } from "../../../plugins/runtime-modules/settings";
import {
  readPhiAreaPresetRuntimeModuleIds,
  readPhiAreaRootRoute,
  type PhiAreaRootRoute,
} from "../../../helpers/cms-area-config";
import type { PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";
import { PHI_BUILDER_SHELL_REGION_KEYS } from "./region-keys";
import { buildPhiProjectedBuilderRegionDrafts } from "./draft-background-assets.server";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import {
  instantiatePhiCmsAreaShellPreset,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
} from "../../../plugins/runtime-modules/descriptor-compiler";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
} from "../../../helpers/cms-scope-search-params";

async function instantiateAreaShellPresetTree(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiResolvedCmsPageTree | null> {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const binding = resolvePhiCmsAreaShellPresetBinding(catalog, cmsArea);
  if (!binding) {
    return null;
  }
  const path = resolveStructureAreaPath(area);
  return instantiatePhiCmsAreaShellPreset({
    binding,
    catalog,
    siteId: runtime.site.id,
    path,
    runtime,
  });
}

function resolveAreaPresetSource(
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  const binding = resolvePhiCmsAreaShellPresetBinding(
    resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog),
    resolvePhiBuilderAreaAsCmsArea(area),
  );
  if (!binding) {
    throw new Error(`Builder target Area "${area}" has no shell preset binding.`);
  }
  return {
    ownerModuleId: binding.descriptor.ownerModuleId,
    presetKey: binding.descriptor.presetKey,
  };
}

function buildInstalledShellDraftsForArea(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  return instantiateAreaShellPresetTree(runtime, area, runtimeModuleCatalog).then((installedTree) => {
    if (!installedTree) {
      return {};
    }

    return buildPhiProjectedBuilderRegionDrafts(
      runtime,
      installedTree,
      area,
      "home",
      PHI_BUILDER_SHELL_REGION_KEYS,
    );
  });
}

function resolveStructureAreaPath(area: PhiDeveloperBuilderArea) {
  switch (area) {
    case "app":
      return "/app";
    case "admin":
      return "/admin";
    case "builder":
      return "/builder";
    case "editor":
      return "/editor";
    case "accounting":
      return "/accounting";
    case "public":
    default:
      return "/";
  }
}

function readRuntimeModuleIdsFromStructureTree(
  tree: PhiResolvedCmsPageTree | PhiResolvedCmsAreaPresetTree | null | undefined,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): PhiRuntimeModuleId[] {
  const optionalModuleIds = resolvePhiRuntimeModuleIdsForArea(
    area,
    readPhiAreaPresetRuntimeModuleIds(
      tree && "preset" in tree ? tree : null,
      area,
    ),
    [...runtimeModuleCatalog.values()].map((entry) => entry.definition),
  );
  return optionalModuleIds;
}

const buildShellDraftsForArea = cache(async function buildShellDraftsForArea(
  runtime: PhiBlockRuntime,
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<string, PhiDeveloperBuilderRegionDraft>> {
  const path = resolveStructureAreaPath(area);
  const sourcePreset = resolveAreaPresetSource(area, runtimeModuleCatalog);
  const cookieHeader = (await cookies()).toString();
  const draftPreset = await getCurrentSiteAreaDraft({
    apiBaseUrl,
    internalToken,
    siteKey,
    area,
    path,
    locale,
    cookieHeader,
    sourcePreset,
  }).catch((error) => {
    throw new Error(
      `Failed to resolve builder structure draft for area "${area}" at "${path}".`,
      { cause: error },
    );
  });

  if (draftPreset?.preset) {
    return buildPhiProjectedBuilderRegionDrafts(
      runtime,
      draftPreset.preset,
      area,
      "home",
      PHI_BUILDER_SHELL_REGION_KEYS,
    );
  }

  const resolvedPreset = await getExactSiteArea({
    apiBaseUrl,
    internalToken,
    siteKey,
    path,
    locale,
    cookieHeader,
    sourcePreset,
  }).catch((error) => {
    throw new Error(
      `Failed to resolve builder structure shell for area "${area}" at "${path}".`,
      { cause: error },
    );
  });

  if (resolvedPreset?.preset) {
    return buildPhiProjectedBuilderRegionDrafts(
      runtime,
      resolvedPreset.preset,
      area,
      "home",
      PHI_BUILDER_SHELL_REGION_KEYS,
    );
  }

  const installedTree = await instantiateAreaShellPresetTree(runtime, area, runtimeModuleCatalog);
  if (!installedTree) {
    return {};
  }

  return buildPhiProjectedBuilderRegionDrafts(
      runtime,
    installedTree,
    area,
    "home",
    PHI_BUILDER_SHELL_REGION_KEYS,
  );
});

/**
 * The root route an Area currently states, from the same three sources the shell drafts come from.
 *
 * An open structure draft first, because that is what the Builder is looking at; then what is
 * published; then nothing, which is the Area saying it has never been asked and letting the code-owned
 * preset answer. The installed preset is deliberately not consulted: it carries no config, and reading
 * a value out of it would put a stored-looking answer in front of a Builder who never stored one.
 */
export const buildPhiBuilderAreaRootRoute = cache(async function buildPhiBuilderAreaRootRoute(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiAreaRootRoute | null> {
  const path = resolveStructureAreaPath(area);
  const sourcePreset = resolveAreaPresetSource(area, runtimeModuleCatalog);
  const cookieHeader = (await cookies()).toString();
  const request = {
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    siteKey: runtime.site.key,
    path,
    locale: runtime.locale.current,
    cookieHeader,
    sourcePreset,
  };
  const draftPreset = await getCurrentSiteAreaDraft({ ...request, area }).catch(() => null);
  if (draftPreset?.preset) {
    return readPhiAreaRootRoute(draftPreset.preset.preset.config);
  }
  const resolvedPreset = await getExactSiteArea(request).catch(() => null);
  return resolvedPreset?.preset ? readPhiAreaRootRoute(resolvedPreset.preset.preset.config) : null;
});

export function resolvePhiBuilderCurrentStructureArea(runtime: PhiBlockRuntime): PhiDeveloperBuilderArea {
  return normalizePhiBuilderAreaSearchParam(runtime.request?.searchParams?.[PHI_BUILDER_AREA_SEARCH_PARAM]) ?? "public";
}

export const buildPhiBuilderCurrentStructureShellDrafts = cache(async function buildPhiBuilderCurrentStructureShellDrafts(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<{
  area: PhiDeveloperBuilderArea;
  drafts: Record<string, PhiDeveloperBuilderRegionDraft>;
}> {
  const area = resolvePhiBuilderCurrentStructureArea(runtime);
  return {
    area,
    drafts: await buildShellDraftsForArea(
      runtime,
      runtime.site.key,
      runtime.locale.current,
      runtime.phis.apiBaseUrl,
      runtime.phis.internalToken,
      area,
      runtimeModuleCatalog,
    ),
  };
});

export const buildPhiBuilderStructureShellDraftsForArea = cache(async function buildPhiBuilderStructureShellDraftsForArea(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  return buildShellDraftsForArea(
    runtime,
    runtime.site.key,
    runtime.locale.current,
    runtime.phis.apiBaseUrl,
    runtime.phis.internalToken,
    area,
    runtimeModuleCatalog,
  );
});

export async function buildPhiBuilderStructureShellDraftsByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<PhiDeveloperBuilderArea, Record<string, PhiDeveloperBuilderRegionDraft>>> {
  const areas: readonly PhiDeveloperBuilderArea[] = PHI_BUILDER_AREA_KEYS;
  const entries = await Promise.all(
    areas.map(async (area) => [
      area,
      await buildShellDraftsForArea(
        runtime,
        runtime.site.key,
        runtime.locale.current,
        runtime.phis.apiBaseUrl,
        runtime.phis.internalToken,
        area,
        runtimeModuleCatalog,
      ),
    ] as const),
  );

  return Object.fromEntries(entries) as Record<PhiDeveloperBuilderArea, Record<string, PhiDeveloperBuilderRegionDraft>>;
}

const buildRuntimeModuleIdsForArea = cache(async function buildRuntimeModuleIdsForArea(
  runtime: PhiBlockRuntime,
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiRuntimeModuleId[]> {
  const path = resolveStructureAreaPath(area);
  const sourcePreset = resolveAreaPresetSource(area, runtimeModuleCatalog);
  const cookieHeader = (await cookies()).toString();
  const draftPreset = await getCurrentSiteAreaDraft({
    apiBaseUrl,
    internalToken,
    siteKey,
    area,
    path,
    locale,
    cookieHeader,
    sourcePreset,
  }).catch((error) => {
    throw new Error(
      `Failed to resolve builder structure draft for area "${area}" at "${path}".`,
      { cause: error },
    );
  });

  if (draftPreset?.preset) {
    return readRuntimeModuleIdsFromStructureTree(draftPreset.preset, area, runtimeModuleCatalog);
  }

  const resolvedPreset = await getExactSiteArea({
    apiBaseUrl,
    internalToken,
    siteKey,
    path,
    locale,
    cookieHeader,
    sourcePreset,
  }).catch((error) => {
    throw new Error(
      `Failed to resolve builder structure shell for area "${area}" at "${path}".`,
      { cause: error },
    );
  });

  if (resolvedPreset?.preset) {
    return readRuntimeModuleIdsFromStructureTree(resolvedPreset.preset, area, runtimeModuleCatalog);
  }

  return readRuntimeModuleIdsFromStructureTree(
    await instantiateAreaShellPresetTree(runtime, area, runtimeModuleCatalog),
    area,
    runtimeModuleCatalog,
  );
});

export function buildPhiBuilderRuntimeModuleIdsForArea(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  return buildRuntimeModuleIdsForArea(
    runtime,
    runtime.site.key,
    runtime.locale.current,
    runtime.phis.apiBaseUrl,
    runtime.phis.internalToken,
    area,
    runtimeModuleCatalog,
  );
}

export async function buildPhiBuilderStructureRuntimeModuleIdsByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>> {
  const areas: readonly PhiDeveloperBuilderArea[] = PHI_BUILDER_AREA_KEYS;
  const entries = await Promise.all(
    areas.map(async (area) => [
      area,
      await buildRuntimeModuleIdsForArea(
        runtime,
        runtime.site.key,
        runtime.locale.current,
        runtime.phis.apiBaseUrl,
        runtime.phis.internalToken,
        area,
        runtimeModuleCatalog,
      ),
    ] as const),
  );

  return Object.fromEntries(entries) as Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>;
}

export async function buildPhiBuilderStructureShellPresetDraftsByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<PhiDeveloperBuilderArea, Record<string, PhiDeveloperBuilderRegionDraft>>> {
  const areas: readonly PhiDeveloperBuilderArea[] = PHI_BUILDER_AREA_KEYS;
  const entries = await Promise.all(
    areas.map(async (area) => [
      area,
      await buildInstalledShellDraftsForArea(runtime, area, runtimeModuleCatalog),
    ] as const),
  );

  return Object.fromEntries(entries) as Record<PhiDeveloperBuilderArea, Record<string, PhiDeveloperBuilderRegionDraft>>;
}
