import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleCatalogEntry, PhiRuntimeModuleId } from "../../types/cms-plugins";
import type { PhiCmsAreaDefinition } from "../../types/cms-module-descriptors";
import { createPhiRuntimeModuleCatalog } from "./contracts";

export type PhiRuntimeModuleServerAreaContribution = {
  moduleId: PhiRuntimeModuleId;
  catalogEntry: PhiRuntimeModuleCatalogEntry;
};

export function definePhiRuntimeModuleServerAreaContribution(
  contribution: PhiRuntimeModuleServerAreaContribution,
): PhiRuntimeModuleServerAreaContribution {
  if (contribution.catalogEntry.definition.moduleId !== contribution.moduleId) {
    throw new Error(`Area contribution module id mismatch for "${contribution.moduleId}".`);
  }
  return contribution;
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

export function createPhiRuntimeModuleCatalogFromAreaContributions(
  contributions: readonly PhiRuntimeModuleServerAreaContribution[],
  areaDefinitions: readonly PhiCmsAreaDefinition[],
): PhiRuntimeModuleCatalog {
  assertPhiRuntimeModuleServerAreaContributions(contributions);
  return createPhiRuntimeModuleCatalog(
    contributions.map((contribution) => contribution.catalogEntry),
    areaDefinitions,
  );
}
