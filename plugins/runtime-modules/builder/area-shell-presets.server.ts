import "server-only";

import { applyPhiPresetTreesCurrentContent } from "../../../server-helpers/cms-bound-content";
import { cache } from "react";
import { cookies } from "next/headers";

import { PHI_BUILDER_AREA_KEYS } from "../../../constants/cms-areas";
import type {
  PhiCmsTreeControllerSettings,
  PhiResolvedCmsAreaPresetTree,
  PhiResolvedCmsPageTree,
} from "../../../types/cms";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../../../types";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { getSiteAreaStructures } from "../../../gateway/site-area";
import { readPhiRuntimeModuleIdsForArea } from "../../../plugins/runtime-modules/settings";
import {
  readPhiAreaPresetRuntimeModuleIds,
  readPhiAreaPublicRoutePaths,
  readPhiAreaRootRoute,
  readPhiAreaMeta,
  resolvePhiAreaLandingSelection,
  type PhiAreaLandingSelection,
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
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

/**
 * Every Area's installed Shell as the Builder edits it: with the current content of every node somebody
 * wrote content for. All Areas together and once per request, because the Builder holds the preset
 * drafts of every Area on every view, and the content of their nodes is one read rather than one per
 * Area (AUDIT-2026-10-13, PM12).
 */
const loadInstalledAreaShellPresetTrees = cache(async function loadInstalledAreaShellPresetTrees(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<ReadonlyMap<PhiDeveloperBuilderArea, PhiResolvedCmsPageTree>> {
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const installed = (await Promise.all(PHI_BUILDER_AREA_KEYS.map(async (area) => {
    const binding = resolvePhiCmsAreaShellPresetBinding(catalog, resolvePhiBuilderAreaAsCmsArea(area));
    if (!binding) {
      return null;
    }
    const tree = await instantiatePhiCmsAreaShellPreset({
      binding,
      catalog,
      siteId: runtime.site.id,
      path: resolveStructureAreaPath(area),
      runtime,
    });
    return [area, tree] as const;
  }))).filter((entry) => entry != null);
  const trees = await applyPhiPresetTreesCurrentContent(installed.map(([, tree]) => tree), {
    runtimeModuleCatalog,
    siteKey: runtime.site.key,
    cookieHeader: (await cookies()).toString(),
  });
  return new Map(installed.map(([area], index) => [area, trees[index]!]));
});

async function instantiateAreaShellPresetTree(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiResolvedCmsPageTree | null> {
  return (await loadInstalledAreaShellPresetTrees(runtime, runtimeModuleCatalog)).get(area) ?? null;
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

type PhiBuilderAreaModulesConfig = {
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

/**
 * What the Site stores about every Area's Shell: per Area the open structure draft, else what is
 * published, else nothing. One request for all of them, once per request.
 *
 * The Builder needs every Area on every view -- the Modules page edits their selections together, and
 * the Area switch carries the next Area's selection -- and read them with a draft read and, where no
 * draft was open, a published read per Area: eleven of a Builder view's seventeen Core calls
 * (AUDIT-2026-10-13, PM3). Keyed by the values the request turns on and never by an object, and read
 * whole, so the Shell drafts, the Area config and the Module selection all come from one revision. The
 * cookie header is read inside, where it is one value per request anyway.
 */
const loadPhiBuilderAreaStructures = cache(async function loadPhiBuilderAreaStructures(
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<ReadonlyMap<PhiDeveloperBuilderArea, {
  draft: PhiResolvedCmsAreaPresetTree | null;
  published: PhiResolvedCmsAreaPresetTree | null;
}>> {
  const areas = PHI_BUILDER_AREA_KEYS.map((area) => ({ area, ...resolveAreaPresetSource(area, runtimeModuleCatalog) }));
  const cookieHeader = (await cookies()).toString();
  // A failed read is not "never asked": answering with the preset default would let the Builder show and
  // save it over what the Area actually stores.
  const structures = await getSiteAreaStructures({
    apiBaseUrl,
    internalToken,
    siteKey,
    locale,
    cookieHeader,
    areas: areas.map(({ area, ownerModuleId, presetKey }) => ({ area, ownerModuleId, presetKey })),
  }).catch((error) => {
    throw new Error("Failed to resolve the builder structure of the Areas.", { cause: error });
  });
  return new Map(structures.map((structure, index) => [areas[index]!.area, {
    draft: structure.draft?.preset ?? null,
    published: structure.draft ? null : structure.published?.preset ?? null,
  }]));
});

/**
 * The Areas whose structure has an open draft, from the one read every Builder view makes.
 *
 * For the Builder's Dashboard card (`cards.ts`). Outside a render the read is not shared with anything,
 * and it is still one request for every Area.
 */
export async function readPhiBuilderAreasWithOpenDraft(
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
  { siteKey, locale, apiBaseUrl, internalToken }: {
    siteKey: string;
    locale: string;
    apiBaseUrl: string;
    internalToken: string;
  },
): Promise<PhiDeveloperBuilderArea[]> {
  const structures = await loadPhiBuilderAreaStructures(siteKey, locale, apiBaseUrl, internalToken, runtimeModuleCatalog);
  return PHI_BUILDER_AREA_KEYS.filter((area) => structures.get(area)?.draft != null);
}

async function loadPhiBuilderAreaStructure(
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<{ draft: PhiResolvedCmsAreaPresetTree | null; published: PhiResolvedCmsAreaPresetTree | null }> {
  const structure = (
    await loadPhiBuilderAreaStructures(siteKey, locale, apiBaseUrl, internalToken, runtimeModuleCatalog)
  ).get(area);
  if (!structure) {
    throw new Error(`The builder structure read did not answer for area "${area}".`);
  }
  return structure;
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
  const { draft, published } = await loadPhiBuilderAreaStructure(
    siteKey,
    locale,
    apiBaseUrl,
    internalToken,
    area,
    runtimeModuleCatalog,
  );
  const stored = draft ?? published;
  if (stored) {
    return buildPhiProjectedBuilderRegionDrafts(
      runtime,
      stored,
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
async function buildPhiBuilderAreaPresetConfig(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<string, unknown> | null> {
  const { draft, published } = await loadPhiBuilderAreaStructure(
    runtime.site.key,
    runtime.locale.current,
    readPhiServerApiCredentials().apiBaseUrl,
    readPhiServerApiCredentials().internalToken,
    area,
    runtimeModuleCatalog,
  );
  return (draft ?? published)?.preset.config ?? null;
}

/** What an Area says its `/` resolves to. */
async function buildPhiBuilderAreaRootRoute(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiAreaRootRoute | null> {
  return readPhiAreaRootRoute(
    await buildPhiBuilderAreaPresetConfig(runtime, area, runtimeModuleCatalog),
  );
}

/**
 * Which application for the Area root this Site answered, in the form the route table asks for.
 *
 * The same sentence as the root route above, read for the other half of what it says: the mode decides
 * whether `/` forwards, the selection decides which Module's landing stands there when it does not.
 * The compiler works in identities and the Builder stores references, so the translation happens here
 * rather than at the two call sites that compile a table.
 */
export async function buildPhiBuilderAreaLandingSelection(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiAreaLandingSelection | null> {
  return resolvePhiAreaLandingSelection(
    await buildPhiBuilderAreaRootRoute(runtime, area, runtimeModuleCatalog),
  );
}

/** What an Area says about being found. */
async function buildPhiBuilderAreaMeta(
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
      readPhiServerApiCredentials().apiBaseUrl,
      readPhiServerApiCredentials().internalToken,
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
    readPhiServerApiCredentials().apiBaseUrl,
    readPhiServerApiCredentials().internalToken,
    area,
    runtimeModuleCatalog,
  );
});

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
  const { draft, published } = await loadPhiBuilderAreaStructure(
    siteKey,
    locale,
    apiBaseUrl,
    internalToken,
    area,
    runtimeModuleCatalog,
  );
  const stored = draft ?? published;
  if (stored) {
    return readRuntimeModulesConfigFromStructureTree(stored, area, runtimeModuleCatalog);
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
    readPhiServerApiCredentials().apiBaseUrl,
    readPhiServerApiCredentials().internalToken,
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

/**
 * What every Area's Shell tells its Controllers, from the same chain the drafts come from: the open
 * structure draft, else what is published, else the code-owned Shell. Carried into every structure save
 * and every Module save baseline, which state the tree whole.
 */
export async function buildPhiBuilderAreaControllerSettingsByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<string, PhiCmsTreeControllerSettings>> {
  const areas: readonly PhiDeveloperBuilderArea[] = PHI_BUILDER_AREA_KEYS;
  const entries = await Promise.all(
    areas.map(async (area) => {
      const { draft, published } = await loadPhiBuilderAreaStructure(
        runtime.site.key,
        runtime.locale.current,
        readPhiServerApiCredentials().apiBaseUrl,
        readPhiServerApiCredentials().internalToken,
        area,
        runtimeModuleCatalog,
      );
      const stored = draft ?? published;
      const settings = stored
        ? stored.controllerSettings ?? []
        : (await instantiateAreaShellPresetTree(runtime, area, runtimeModuleCatalog))?.controllerSettings ?? [];
      return [area, settings] as const;
    }),
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
