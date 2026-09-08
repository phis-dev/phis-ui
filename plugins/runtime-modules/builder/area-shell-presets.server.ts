import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { PHI_BUILDER_AREA_KEYS } from "../../../constants/cms-areas";
import type { PhiResolvedCmsAreaPresetTree, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../../../types";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { getCurrentSiteAreaDraft, getExactSiteArea } from "../../../gateway/site-area";
import { readPhiRuntimeModuleIdsForArea } from "../../../plugins/runtime-modules/settings";
import {
  readPhiAreaPresetRuntimeModuleIds,
  readPhiAreaPublicRoutePaths,
  readPhiAreaRootRoute,
  readPhiAreaMeta,
  type PhiAreaRootRoute,
  type PhiAreaMeta,
  type PhiPublicRoutePathAssignment,
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
      null,
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

export type PhiBuilderAreaModulesConfig = {
  moduleIds: PhiRuntimeModuleId[];
  /**
   * Stored ids this build cannot serve, kept so the Builder can show them.
   *
   * Dropping them silently would make Pages disappear with no way to find out why, and the next save
   * would write the selection without them -- which is right, but has to be something somebody sees
   * happening rather than something that happens to them.
   */
  unresolvedModuleIds: PhiRuntimeModuleId[];
  publicRoutePaths: PhiPublicRoutePathAssignment[];
};

function readRuntimeModulesConfigFromStructureTree(
  tree: PhiResolvedCmsPageTree | PhiResolvedCmsAreaPresetTree | null | undefined,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): PhiBuilderAreaModulesConfig {
  const presetTree = tree && "preset" in tree ? tree : null;
  const reading = readPhiRuntimeModuleIdsForArea(
    area,
    readPhiAreaPresetRuntimeModuleIds(presetTree, area),
    [...runtimeModuleCatalog.values()].map((entry) => entry.definition),
  );
  if (reading.unresolved.length > 0) {
    console.warn(
      "[phi-builder] Stored Module selection names Modules this build cannot serve.",
      { area, unresolved: reading.unresolved },
    );
  }
  return {
    moduleIds: reading.moduleIds,
    unresolvedModuleIds: reading.unresolved.map((entry) => entry.moduleId),
    publicRoutePaths: readPhiAreaPublicRoutePaths(presetTree?.preset.config),
  };
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
      null,
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
      null,
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
    null,
    PHI_BUILDER_SHELL_REGION_KEYS,
  );
});

/**
 * The config an Area currently states about its Shell, from the same three sources the drafts come from.
 *
 * An open structure draft first, because that is what the Builder is looking at; then what is
 * published; then nothing, which is the Area saying it has never been asked and letting the code-owned
 * preset answer. The installed preset is deliberately not consulted: it carries no config, and reading
 * a value out of it would put a stored-looking answer in front of a Builder who never stored one.
 *
 * Read once and read whole, because everything the Shell says about itself arrives in the same
 * revision: the root route and the two SEO answers are one fetch, not one each.
 */
const buildPhiBuilderAreaPresetConfig = cache(async function buildPhiBuilderAreaPresetConfig(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<string, unknown> | null> {
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
    return draftPreset.preset.preset.config ?? null;
  }
  const resolvedPreset = await getExactSiteArea(request).catch(() => null);
  return resolvedPreset?.preset ? resolvedPreset.preset.preset.config ?? null : null;
});

/** What an Area says its `/` resolves to. */
export async function buildPhiBuilderAreaRootRoute(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiAreaRootRoute | null> {
  return readPhiAreaRootRoute(
    await buildPhiBuilderAreaPresetConfig(runtime, area, runtimeModuleCatalog),
  );
}

/** What an Area says about the head of its Pages. */
export async function buildPhiBuilderAreaMeta(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiAreaMeta | null> {
  return readPhiAreaMeta(
    await buildPhiBuilderAreaPresetConfig(runtime, area, runtimeModuleCatalog),
  );
}

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

/**
 * What an Area's Modules namespace says, as the Builder sees it: the draft first, then what is
 * published, then the preset the code ships. Both answers come from one load because they are one
 * config -- reading the assigned Public addresses separately would fetch the Area a second time and,
 * worse, could read a different revision than the Module selection it belongs to.
 */
const buildRuntimeModulesConfigForArea = cache(async function buildRuntimeModulesConfigForArea(
  runtime: PhiBlockRuntime,
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderAreaModulesConfig> {
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
    return readRuntimeModulesConfigFromStructureTree(draftPreset.preset, area, runtimeModuleCatalog);
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
    return readRuntimeModulesConfigFromStructureTree(resolvedPreset.preset, area, runtimeModuleCatalog);
  }

  return readRuntimeModulesConfigFromStructureTree(
    await instantiateAreaShellPresetTree(runtime, area, runtimeModuleCatalog),
    area,
    runtimeModuleCatalog,
  );
});

export function buildPhiBuilderRuntimeModulesConfigForArea(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  return buildRuntimeModulesConfigForArea(
    runtime,
    runtime.site.key,
    runtime.locale.current,
    runtime.phis.apiBaseUrl,
    runtime.phis.internalToken,
    area,
    runtimeModuleCatalog,
  );
}

export async function buildPhiBuilderRuntimeModuleIdsForArea(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  return (await buildPhiBuilderRuntimeModulesConfigForArea(runtime, area, runtimeModuleCatalog)).moduleIds;
}

export async function buildPhiBuilderStructureRuntimeModuleIdsByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>> {
  const areas: readonly PhiDeveloperBuilderArea[] = PHI_BUILDER_AREA_KEYS;
  const entries = await Promise.all(
    areas.map(async (area) => [
      area,
      await buildPhiBuilderRuntimeModuleIdsForArea(runtime, area, runtimeModuleCatalog),
    ] as const),
  );

  return Object.fromEntries(entries) as Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>;
}

/**
 * The Modules a Site names that this build cannot serve, by Area.
 *
 * Read from the same config as the selection beside it, so the two always describe one revision.
 */
export async function buildPhiBuilderUnresolvedRuntimeModuleIdsByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>> {
  const areas: readonly PhiDeveloperBuilderArea[] = PHI_BUILDER_AREA_KEYS;
  const entries = await Promise.all(
    areas.map(async (area) => [
      area,
      (await buildPhiBuilderRuntimeModulesConfigForArea(runtime, area, runtimeModuleCatalog))
        .unresolvedModuleIds,
    ] as const),
  );
  return Object.fromEntries(entries) as Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>;
}

/**
 * The Public addresses this Site assigned, as the Builder's draft sees them.
 *
 * Only Public is asked, because only Public has an address space two Modules can contest. The Builder
 * needs the same list the reader uses: it is what says whether a path a Module proposes is free, and
 * it is what the collision dialog writes back.
 */
export function buildPhiBuilderPublicRoutePaths(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  return buildPhiBuilderRuntimeModulesConfigForArea(runtime, "public", runtimeModuleCatalog)
    .then((config) => config.publicRoutePaths);
}

/**
 * What every Area states about its root, not only the one /shells is editing.
 *
 * /pages needs it too: while `/` forwards it is not offered there, because the forward lives in the
 * root preset's tree and a stored revision would replace it -- authoring the root Page would switch
 * the forward off without anyone touching the Select. One value, read once, handed to every workspace
 * like the Public addresses beside it.
 */
export async function buildPhiBuilderAreaRootRoutesByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<string, PhiAreaRootRoute | null>> {
  const areas: readonly PhiDeveloperBuilderArea[] = PHI_BUILDER_AREA_KEYS;
  const entries = await Promise.all(
    areas.map(async (area) => [
      area,
      await buildPhiBuilderAreaRootRoute(runtime, area, runtimeModuleCatalog),
    ] as const),
  );
  return Object.fromEntries(entries);
}

/** What every Area states about being found, handed to the workspace beside the root routes. */
export async function buildPhiBuilderAreaMetaByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<string, PhiAreaMeta | null>> {
  const areas: readonly PhiDeveloperBuilderArea[] = PHI_BUILDER_AREA_KEYS;
  const entries = await Promise.all(
    areas.map(async (area) => [
      area,
      await buildPhiBuilderAreaMeta(runtime, area, runtimeModuleCatalog),
    ] as const),
  );
  return Object.fromEntries(entries);
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
