import "server-only";

import { applyPhiPresetTreesCurrentContent } from "../../../server-helpers/cms-bound-content";
import { cache } from "react";
import { cookies } from "next/headers";

import { PHI_BUILDER_AREA_KEYS } from "../../../constants/cms-areas";
import type {
  PhiCmsAreaModulesSelection,
  PhiCmsTreeControllerSettings,
  PhiResolvedCmsAreaPresetTree,
  PhiResolvedCmsPageTree,
} from "../../../types/cms";
import type {
  PhiCmsAreaShellPresetBinding,
  PhiCmsPresetIdentity,
  PhiCmsPresetSource,
} from "../../../types/cms-module-descriptors";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../../../types";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { getExactSiteArea, getSiteAreaStructures } from "../../../gateway/site-area";
import {
  listPhiAlwaysActiveRuntimeModuleIds,
  readPhiRuntimeModuleIdsForArea,
} from "../../../plugins/runtime-modules/settings";
import {
  buildPhiAreaShellPresetConfig,
  readPhiAreaSelectionRuntimeModuleIds,
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
import type { PhiWorkspaceAreaShellState } from "../../../components/workspace/catalog-state";
import { buildPhiProjectedBuilderRegionDrafts } from "./draft-background-assets.server";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import {
  instantiatePhiCmsAreaShellPreset,
  listPhiCmsAreaShellProviders,
  resolvePhiCmsAreaBaseShellPresetBinding,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
} from "../../../plugins/runtime-modules/descriptor-compiler";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
} from "../../../helpers/cms-scope-search-params";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { createPhiModuleMediaLoader } from "../../../gateway/server-module-media";

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
  const states = await loadPhiBuilderAreaStoredStates(
    runtime.site.key,
    runtime.locale.current,
    readPhiServerApiCredentials().apiBaseUrl,
    readPhiServerApiCredentials().internalToken,
    runtimeModuleCatalog,
  );
  const installed = (await Promise.all(PHI_BUILDER_AREA_KEYS.map(async (area) => {
    const binding = states.get(area)?.shellBinding ?? null;
    if (!binding) {
      return null;
    }
    const tree = await instantiatePhiCmsAreaShellPreset({
      binding,
      catalog,
      siteId: runtime.site.id,
      path: resolveStructureAreaPath(area),
      runtime,
      loadModuleMedia: createPhiModuleMediaLoader(runtime.site.key),
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

function readRuntimeModulesConfig(
  selection: PhiCmsAreaModulesSelection | null,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): PhiBuilderAreaModulesConfig {
  const reading = readPhiRuntimeModuleIdsForArea(
    area,
    readPhiAreaSelectionRuntimeModuleIds(selection, area),
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
    publicRoutePaths: readPhiAreaPublicRoutePaths(selection?.config),
  };
}

function toPresetIdentityKey(source: PhiCmsPresetIdentity) {
  return `${source.ownerModuleId}\u001f${source.presetKey}`;
}

/** The Areas' structures and selections, as the Builder reads them once per request. */
type PhiBuilderAreaStoredState = {
  /** The selection the Builder edits: the open Module draft, else what is published, else none. */
  modules: PhiCmsAreaModulesSelection | null;
  /** Whether that selection is an open Module draft rather than what is published. */
  modulesDraftOpen: boolean;
  /**
   * The one structure the Area stores, whatever shell it stands on: its open draft, else what is
   * published. Null when the Area stores none.
   */
  stored: {
    sourcePreset: PhiCmsPresetSource;
    draft: PhiResolvedCmsAreaPresetTree | null;
    published: PhiResolvedCmsAreaPresetTree | null;
  } | null;
  /** The shell the Area takes under `modules`: the active provider's, else the base Module's. */
  shellBinding: PhiCmsAreaShellPresetBinding | null;
  /** The stored structure where it stands on `shellBinding`; both halves null otherwise. */
  draft: PhiResolvedCmsAreaPresetTree | null;
  published: PhiResolvedCmsAreaPresetTree | null;
};

/** As many identities as Core answers in one structures read. */
const PHI_BUILDER_AREA_STRUCTURES_READ_LIMIT = 16;

/**
 * The Area's effective shell under a selection, as the Builder sees it.
 *
 * The selection the Builder holds -- the open Module draft first -- with the Modules every Area runs
 * anyway, so a Module that brings its own shell applies here as soon as it is selected, before the
 * selection is published.
 */
function resolveBuilderAreaShellBinding(
  area: PhiDeveloperBuilderArea,
  selection: PhiCmsAreaModulesSelection | null,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const definitions = [...runtimeModuleCatalog.values()].map((entry) => entry.definition);
  const activeModuleIds = new Set([
    ...readRuntimeModulesConfig(selection, area, runtimeModuleCatalog).moduleIds,
    ...listPhiAlwaysActiveRuntimeModuleIds(cmsArea, definitions),
  ]);
  return resolvePhiCmsAreaShellPresetBinding(catalog, cmsArea, activeModuleIds);
}

/**
 * What the Site stores about every Area: per Area its Module selection and its one structure. One
 * request for all of them, once per request.
 *
 * The Builder needs every Area on every view -- the Modules page edits their selections together, and
 * the Area switch carries the next Area's selection -- and read them with a draft read and, where no
 * draft was open, a published read per Area: eleven of a Builder view's seventeen Core calls
 * (AUDIT-2026-10-13, PM3). Keyed by the values the request turns on and never by an object, and read
 * whole, so the Shell drafts, the Area config and the Module selection all come from one answer. The
 * cookie header is read inside, where it is one value per request anyway.
 *
 * A structure answers only under the identity it is stored under, and an Area of `shellProviders:
 * "module"` may stand on the base shell or on any Module's: so each Area is asked under every shell it
 * could take, in the same request, and whichever answers is the one it stores. That is also how the
 * Builder learns a structure stands on a shell the Area no longer takes.
 */
const loadPhiBuilderAreaStoredStates = cache(async function loadPhiBuilderAreaStoredStates(
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<ReadonlyMap<PhiDeveloperBuilderArea, PhiBuilderAreaStoredState>> {
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const requests = PHI_BUILDER_AREA_KEYS.flatMap((area) => {
    const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
    const base = resolvePhiCmsAreaBaseShellPresetBinding(catalog, cmsArea);
    if (!base) {
      throw new Error(`Builder target Area "${area}" has no shell preset binding.`);
    }
    return [base, ...listPhiCmsAreaShellProviders(catalog, cmsArea)].map(({ descriptor }) => ({
      area,
      ownerModuleId: descriptor.ownerModuleId,
      presetKey: descriptor.presetKey,
    }));
  });
  const cookieHeader = (await cookies()).toString();
  const chunks: (typeof requests)[] = [];
  for (let index = 0; index < requests.length; index += PHI_BUILDER_AREA_STRUCTURES_READ_LIMIT) {
    chunks.push(requests.slice(index, index + PHI_BUILDER_AREA_STRUCTURES_READ_LIMIT));
  }
  // A failed read is not "never asked": answering with the preset default would let the Builder show and
  // save it over what the Area actually stores.
  const answers = (await Promise.all(chunks.map((areas) => getSiteAreaStructures({
    apiBaseUrl,
    internalToken,
    siteKey,
    locale,
    cookieHeader,
    areas,
  })))).flat();
  const states = new Map<PhiDeveloperBuilderArea, PhiBuilderAreaStoredState>();
  for (const area of PHI_BUILDER_AREA_KEYS) {
    const entries = answers.filter((answer) => answer.area === area);
    if (entries.length === 0) {
      throw new Error(`The builder structure read did not answer for area "${area}".`);
    }
    const { modules } = entries[0]!;
    const selection = modules.draft ?? modules.published;
    const answered = entries.find((entry) => entry.draft != null || entry.published != null) ?? null;
    const storedPayload = answered?.draft ?? answered?.published ?? null;
    const stored = answered && storedPayload
      ? {
          sourcePreset: storedPayload.sourcePreset,
          draft: answered.draft?.preset ?? null,
          published: answered.draft ? null : answered.published?.preset ?? null,
        }
      : null;
    const shellBinding = resolveBuilderAreaShellBinding(area, selection, runtimeModuleCatalog);
    const standsOnShell = stored != null && shellBinding != null &&
      toPresetIdentityKey(stored.sourcePreset) === toPresetIdentityKey(shellBinding.descriptor);
    states.set(area, {
      modules: selection,
      modulesDraftOpen: modules.draft != null,
      stored,
      shellBinding,
      draft: standsOnShell ? stored!.draft : null,
      published: standsOnShell ? stored!.published : null,
    });
  }
  return states;
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
  const states = await loadPhiBuilderAreaStoredStates(siteKey, locale, apiBaseUrl, internalToken, runtimeModuleCatalog);
  return PHI_BUILDER_AREA_KEYS.filter((area) => states.get(area)?.stored?.draft != null);
}

async function loadPhiBuilderAreaStructure(
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderAreaStoredState> {
  const state = (
    await loadPhiBuilderAreaStoredStates(siteKey, locale, apiBaseUrl, internalToken, runtimeModuleCatalog)
  ).get(area);
  if (!state) {
    throw new Error(`The builder structure read did not answer for area "${area}".`);
  }
  return state;
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
 * published; then what the effective shell proposes (`PhiCmsAreaShellPresetDescriptor.settings`), which
 * is what a visitor is served while nothing is stored on that shell. The dialog shows that proposal as
 * the current answer, so the first save writes it rather than losing it. A shell that proposes nothing
 * answers null: the Area was never asked, and phis-ui's defaults stand.
 *
 * Read once and read whole, because everything the Shell says about itself arrives in the same
 * revision: the root route and the two SEO answers are one fetch, not one each.
 */
async function buildPhiBuilderAreaPresetConfig(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Record<string, unknown> | null> {
  const { draft, published, shellBinding } = await loadPhiBuilderAreaStructure(
    runtime.site.key,
    runtime.locale.current,
    readPhiServerApiCredentials().apiBaseUrl,
    readPhiServerApiCredentials().internalToken,
    area,
    runtimeModuleCatalog,
  );
  const stored = draft ?? published;
  if (stored) {
    return stored.preset.config ?? null;
  }
  const proposed = buildPhiAreaShellPresetConfig(shellBinding?.descriptor.settings);
  return Object.keys(proposed).length > 0 ? proposed : null;
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
 * What an Area's Module selection says, as the Builder sees it: the open Module draft, then what is
 * published, then the default list the Area ships with. Both answers come from one load because they are
 * one config -- reading the assigned Public addresses separately could read a different revision than
 * the Module selection it belongs to.
 */
const buildRuntimeModulesConfigForArea = cache(async function buildRuntimeModulesConfigForArea(
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderAreaModulesConfig> {
  const { modules } = await loadPhiBuilderAreaStructure(
    siteKey,
    locale,
    apiBaseUrl,
    internalToken,
    area,
    runtimeModuleCatalog,
  );
  return readRuntimeModulesConfig(modules, area, runtimeModuleCatalog);
});

export function buildPhiBuilderRuntimeModulesConfigForArea(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  return buildRuntimeModulesConfigForArea(
    runtime.site.key,
    runtime.locale.current,
    readPhiServerApiCredentials().apiBaseUrl,
    readPhiServerApiCredentials().internalToken,
    area,
    runtimeModuleCatalog,
  );
}

/**
 * The Modules the published Area answers with, as opposed to the draft the Builder edits.
 *
 * Without a published selection the Area's default list decides, which is what a visitor is served in
 * that case too. Read for the collision dialog, which has to say whether an address it asks to move
 * already stands on the live Site. The structures read answers the published selection only where no
 * Module draft is open; with one open, the live read says what is published.
 */
export const buildPhiBuilderPublishedRuntimeModuleIdsForArea = cache(async function buildPhiBuilderPublishedRuntimeModuleIdsForArea(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiRuntimeModuleId[]> {
  const { apiBaseUrl, internalToken } = readPhiServerApiCredentials();
  const state = await loadPhiBuilderAreaStructure(
    runtime.site.key,
    runtime.locale.current,
    apiBaseUrl,
    internalToken,
    area,
    runtimeModuleCatalog,
  );
  const published = state.modulesDraftOpen
    ? (await getExactSiteArea({
        apiBaseUrl,
        internalToken,
        siteKey: runtime.site.key,
        path: resolveStructureAreaPath(area),
        locale: runtime.locale.current,
      }))?.modules ?? null
    : state.modules;
  return readRuntimeModulesConfig(published, area, runtimeModuleCatalog).moduleIds;
});

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
 * structure draft, else what is published, else the code-owned Shell. Carried into every structure save,
 * which states the tree whole.
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

/**
 * The shell every Area takes, as the identity a structure save, a draft read and a Revisions scope name:
 * the shell of the one Module that brings one and is selected there, else the base Module's.
 */
export async function buildPhiBuilderAreaPresetSourcesByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Partial<Record<PhiDeveloperBuilderArea, PhiCmsPresetSource>>> {
  const states = await loadPhiBuilderAreaStoredStates(
    runtime.site.key,
    runtime.locale.current,
    readPhiServerApiCredentials().apiBaseUrl,
    readPhiServerApiCredentials().internalToken,
    runtimeModuleCatalog,
  );
  const sources: Partial<Record<PhiDeveloperBuilderArea, PhiCmsPresetSource>> = {};
  for (const area of PHI_BUILDER_AREA_KEYS) {
    const descriptor = states.get(area)?.shellBinding?.descriptor;
    if (descriptor) {
      sources[area] = {
        ownerModuleId: descriptor.ownerModuleId,
        presetKey: descriptor.presetKey,
        sourcePresetVersion: descriptor.shellPresetVersion,
      };
    }
  }
  return sources;
}

/**
 * Per Area, which Modules bring a shell for it and which shell its stored structure stands on.
 *
 * The first is what the Modules table refuses a second provider by; the second is what it warns about
 * when a provider is switched on over a stored structure of another shell, and what "Clear Area" and a
 * refused structure save name.
 */
export async function buildPhiBuilderAreaShellsByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<Partial<Record<PhiDeveloperBuilderArea, PhiWorkspaceAreaShellState>>> {
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const states = await loadPhiBuilderAreaStoredStates(
    runtime.site.key,
    runtime.locale.current,
    readPhiServerApiCredentials().apiBaseUrl,
    readPhiServerApiCredentials().internalToken,
    runtimeModuleCatalog,
  );
  const shells: Partial<Record<PhiDeveloperBuilderArea, PhiWorkspaceAreaShellState>> = {};
  for (const area of PHI_BUILDER_AREA_KEYS) {
    const stored = states.get(area)?.stored?.sourcePreset ?? null;
    shells[area] = {
      providerModuleIds: listPhiCmsAreaShellProviders(catalog, resolvePhiBuilderAreaAsCmsArea(area))
        .map((binding) => binding.moduleId),
      storedSource: stored ? { ownerModuleId: stored.ownerModuleId, presetKey: stored.presetKey } : null,
    };
  }
  return shells;
}
