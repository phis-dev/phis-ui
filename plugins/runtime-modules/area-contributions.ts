import { isPhiCmsAreaKey, type PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleCatalogEntry, PhiRuntimeModuleId } from "../../types/cms-plugins";
import type { PhiCmsAreaDefinition } from "../../types/cms-module-descriptors";
import { createPhiRuntimeModuleCatalog } from "./contracts";

export type PhiRuntimeModuleServerAreaContribution = {
  moduleId: PhiRuntimeModuleId;
  catalogEntry: PhiRuntimeModuleCatalogEntry;
};

/** The Area a navigation injection addresses, which it states as the prefix of its `navKey`. */
function readPhiRuntimeModuleNavigationArea(navKey: `${PhiCmsAreaKey}:${string}`) {
  const area = navKey.split(":")[0];
  if (!isPhiCmsAreaKey(area)) {
    throw new Error(`Navigation key "${navKey}" names no Area.`);
  }
  return area;
}

/**
 * Every descriptor that addresses an Area, with the Area it addresses.
 *
 * Four of the nine things a contribution carries name an Area themselves; the rest -- Widgets,
 * Layouts, Forms, Themes, the UI provider -- know none and reach every Area the Module does.
 */
function readPhiRuntimeModuleAreaAddressedDescriptors(entry: PhiRuntimeModuleCatalogEntry) {
  return [
    ...(entry.routes ?? []).map((descriptor) => ({ label: `route "${descriptor.presetKey}"`, area: descriptor.area })),
    ...(entry.areaShells ?? []).map((descriptor) => ({ label: `shell "${descriptor.presetKey}"`, area: descriptor.area })),
    ...(entry.areaOverlays ?? []).map((descriptor) => ({ label: `overlay "${descriptor.presetKey}"`, area: descriptor.area })),
    ...(entry.navigation ?? []).map((descriptor) => ({
      label: `navigation "${descriptor.item.itemKey}"`,
      area: readPhiRuntimeModuleNavigationArea(descriptor.navKey),
    })),
  ];
}

export function definePhiRuntimeModuleServerAreaContribution(
  contribution: PhiRuntimeModuleServerAreaContribution,
): PhiRuntimeModuleServerAreaContribution {
  if (contribution.catalogEntry.definition.moduleId !== contribution.moduleId) {
    throw new Error(`Area contribution module id mismatch for "${contribution.moduleId}".`);
  }
  /*
   * A descriptor for an Area the Module was never admitted to is a mistake in the package, not a
   * candidate to drop. The cut below is a filter and says nothing; this is where it is said, once,
   * where the contribution is composed and the author can still see which descriptor it was.
   */
  const { eligibleAreas } = contribution.catalogEntry.definition;
  for (const descriptor of readPhiRuntimeModuleAreaAddressedDescriptors(contribution.catalogEntry)) {
    if (!eligibleAreas.includes(descriptor.area)) {
      throw new Error(
        `${contribution.moduleId}: ${descriptor.label} addresses Area "${descriptor.area}", ` +
        "which the Module is not eligible for.",
      );
    }
  }
  return contribution;
}

/**
 * One Module's contribution, reduced to what it addresses to one Area.
 *
 * `eligibleAreas` says only where a Module may appear. What it brings addresses itself, and an Area
 * receives exactly the descriptors that name it -- so the Marketplace can offer its Collection in the
 * public Area without its `app` Page arriving there too.
 *
 * Everything without an Area passes through untouched. A Widget has to reach every Area its Module
 * does; where it behaves differently is a question about who is asking, answered by its access
 * policy, not by where the page happens to stand.
 */
export function cutPhiRuntimeModuleServerAreaContribution(
  contribution: PhiRuntimeModuleServerAreaContribution,
  area: PhiCmsAreaKey,
): PhiRuntimeModuleServerAreaContribution {
  const entry = contribution.catalogEntry;
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: contribution.moduleId,
    catalogEntry: {
      ...entry,
      ...(entry.routes ? { routes: entry.routes.filter((descriptor) => descriptor.area === area) } : {}),
      ...(entry.areaShells ? { areaShells: entry.areaShells.filter((descriptor) => descriptor.area === area) } : {}),
      ...(entry.areaOverlays
        ? { areaOverlays: entry.areaOverlays.filter((descriptor) => descriptor.area === area) }
        : {}),
      ...(entry.navigation
        ? {
          navigation: entry.navigation.filter(
            (descriptor) => readPhiRuntimeModuleNavigationArea(descriptor.navKey) === area,
          ),
        }
        : {}),
    },
  });
}

export function cutPhiRuntimeModuleServerAreaContributions(
  contributions: readonly PhiRuntimeModuleServerAreaContribution[],
  area: PhiCmsAreaKey,
) {
  return contributions.map((contribution) => cutPhiRuntimeModuleServerAreaContribution(contribution, area));
}

function mergeUnique<T>(
  current: readonly T[] | undefined,
  additions: readonly T[] | undefined,
  readKey: (value: T) => string,
) {
  const values = [...(current ?? [])];
  const keys = new Set(values.map(readKey));
  for (const value of additions ?? []) {
    const key = readKey(value);
    if (!keys.has(key)) {
      keys.add(key);
      values.push(value);
    }
  }
  return values;
}

export function mergePhiRuntimeModuleServerAreaContributions(
  contributions: readonly PhiRuntimeModuleServerAreaContribution[],
) {
  const result = new Map<PhiRuntimeModuleId, PhiRuntimeModuleServerAreaContribution>();
  for (const contribution of contributions) {
    const current = result.get(contribution.moduleId);
    if (!current) {
      result.set(contribution.moduleId, contribution);
      continue;
    }
    result.set(contribution.moduleId, definePhiRuntimeModuleServerAreaContribution({
      moduleId: contribution.moduleId,
      catalogEntry: {
        ...current.catalogEntry,
        widgets: mergeUnique(
          current.catalogEntry.widgets,
          contribution.catalogEntry.widgets,
          (entry) => `${entry.definition.pluginKey}/${entry.definition.typeKey}`,
        ),
        layouts: mergeUnique(
          current.catalogEntry.layouts,
          contribution.catalogEntry.layouts,
          (entry) => `${entry.definition.pluginKey}/${entry.definition.typeKey}`,
        ),
        forms: mergeUnique(
          current.catalogEntry.forms,
          contribution.catalogEntry.forms,
          (entry) => entry.formId,
        ),
        areaShells: mergeUnique(
          current.catalogEntry.areaShells,
          contribution.catalogEntry.areaShells,
          (entry) => `${entry.ownerModuleId}/${entry.presetKey}/${entry.area}`,
        ),
        areaOverlays: mergeUnique(
          current.catalogEntry.areaOverlays,
          contribution.catalogEntry.areaOverlays,
          (entry) => `${entry.ownerModuleId}/${entry.presetKey}/${entry.area}`,
        ),
        routes: mergeUnique(
          current.catalogEntry.routes,
          contribution.catalogEntry.routes,
          (entry) => `${entry.ownerModuleId}/${entry.presetKey}/${entry.area}`,
        ),
        /*
         * Navigation merges like the rest now that the pieces arrive Area-cut. Before the cut every
         * Area held the same object and the spread above carried it along, which looked like it
         * worked -- the first Area seen would have decided for all of them.
         */
        navigation: mergeUnique(
          current.catalogEntry.navigation,
          contribution.catalogEntry.navigation,
          (entry) => `${entry.navKey}/${entry.item.itemKey}`,
        ),
        themes: mergeUnique(
          current.catalogEntry.themes,
          contribution.catalogEntry.themes,
          (entry) => `${entry.ownerModuleId}/${entry.presetKey}/${entry.themeKey}`,
        ),
      },
    }));
  }
  return [...result.values()];
}

function assertPhiRuntimeModuleServerAreaContributions(
  contributions: readonly PhiRuntimeModuleServerAreaContribution[],
) {
  const moduleIds = new Set<PhiRuntimeModuleId>();
  for (const contribution of contributions) {
    if (moduleIds.has(contribution.moduleId)) {
      throw new Error(`Duplicate Area contribution for runtime module "${contribution.moduleId}".`);
    }
    moduleIds.add(contribution.moduleId);
    if (contribution.catalogEntry.definition.moduleId !== contribution.moduleId) {
      throw new Error(`Area contribution catalog mismatch for runtime module "${contribution.moduleId}".`);
    }
  }
}

/**
 * `area` names the one Area this catalog is for, and every contribution is cut to it. The Builder
 * omits it: it edits the other Areas rather than being one, so it holds all of them uncut.
 */
export function createPhiRuntimeModuleCatalogFromAreaContributions(
  contributions: readonly PhiRuntimeModuleServerAreaContribution[],
  areaDefinitions: readonly PhiCmsAreaDefinition[],
  area?: PhiCmsAreaKey,
): PhiRuntimeModuleCatalog {
  assertPhiRuntimeModuleServerAreaContributions(contributions);
  const placed = area ? cutPhiRuntimeModuleServerAreaContributions(contributions, area) : contributions;
  return createPhiRuntimeModuleCatalog(
    placed.map((contribution) => contribution.catalogEntry),
    areaDefinitions,
  );
}
