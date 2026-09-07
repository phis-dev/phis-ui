import type { PhiRuntimeModuleDefinition, PhiRuntimeModuleId } from "../../../types";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import {
  isPhiRuntimeAreaBaseModuleId,
  resolvePhiRuntimeAreaDefinition,
} from "../area-definitions";
import { assertPhiRuntimeModuleIdsAllowedForArea } from "../settings";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";
import { builderWorkspaceStore, getPhiDeveloperBuilderStateSnapshot } from "./developer-workspace-store";
import {
  capturePhiBuilderModulesHistoryState,
  createPhiBuilderHistoryContext,
  phiBuilderHistory,
} from "./history";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";

function serializeRuntimeModuleIds(moduleIds: readonly PhiRuntimeModuleId[] | null | undefined) {
  return JSON.stringify(moduleIds ?? []);
}

export function areRuntimeModuleIdsEqual(
  left: readonly PhiRuntimeModuleId[] | null | undefined,
  right: readonly PhiRuntimeModuleId[] | null | undefined,
) {
  return serializeRuntimeModuleIds(left) === serializeRuntimeModuleIds(right);
}

/**
 * Turns an arbitrary set of ids a viewer picked into the Area's persistable selection.
 *
 * Every id has to name an installed Module, and a Base Module id from a different Area is refused
 * outright -- selecting one would silently activate a foreign Area's own required Module. The Platform
 * Module and this Area's own Base Module are never taken from the input at all: they are implicit, and
 * `resolvePhiRuntimeModuleIdsForArea` adds them back regardless of what was asked for.
 */
export function normalizeRuntimeModuleSelection(
  selectedIds: readonly string[],
  area: PhiDeveloperBuilderArea,
  definitions: readonly PhiRuntimeModuleDefinition[],
): PhiRuntimeModuleId[] {
  const definitionsById = new Map(definitions.map((definition) => [definition.moduleId, definition] as const));
  const selectedIdSet = new Set(selectedIds);
  const invalidIds = selectedIds.filter((moduleId) => !definitionsById.has(moduleId as PhiRuntimeModuleId));
  if (invalidIds.length > 0) {
    throw new Error(`Unknown runtime module "${invalidIds[0]}".`);
  }
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const baseModuleId = resolvePhiRuntimeAreaDefinition(cmsArea).baseModuleId;
  const foreignBaseModuleId = selectedIds.find((moduleId) =>
    isPhiRuntimeAreaBaseModuleId(moduleId) && moduleId !== baseModuleId,
  );
  if (foreignBaseModuleId) {
    throw new Error(
      `Base module "${foreignBaseModuleId}" does not belong to Area "${cmsArea}".`,
    );
  }

  const moduleIds = definitions
    .filter((definition) =>
      definition.kind === "module" &&
      definition.moduleId !== baseModuleId &&
      selectedIdSet.has(definition.moduleId),
    )
    .map((definition) => definition.moduleId);
  /*
   * The write refuses where the read drops.
   *
   * Reading a stored selection tolerates a Module this build cannot serve -- an Area may not go down
   * over one -- but writing one may not: a selection leaving the Builder has to be one this build can
   * stand behind, which is also what keeps an unresolvable id from being written back after it was
   * dropped on the way in.
   */
  assertPhiRuntimeModuleIdsAllowedForArea(area, moduleIds, definitions);
  return moduleIds;
}

/**
 * Applies a new Module selection to one or more Areas: validates each Area's list, patches the
 * catalog, and records the whole gesture as ONE history entry -- the one place all of this happens,
 * so a Switch cell in the Modules table and the legacy `runtimeModules` signal channel stay in
 * perfect step rather than each growing its own copy of "what does changing this actually mean."
 *
 * One entry per gesture is the point of taking a list: the module-wide switch changes several Areas
 * at once, and recording those as separate entries would make undo restore exactly the partial state
 * the switch exists to avoid. Areas whose normalized list already matches what is live are dropped;
 * if nothing remains, nothing is recorded.
 */
export function applyPhiBuilderRuntimeModuleSelectionChanges(
  changes: ReadonlyArray<{ area: PhiDeveloperBuilderArea; selectedIds: readonly string[] }>,
  defaultArea: PhiDeveloperBuilderArea,
) {
  const current = getPhiDeveloperBuilderStateSnapshot(defaultArea);
  const effective: Array<{ area: PhiDeveloperBuilderArea; moduleIds: PhiRuntimeModuleId[] }> = [];
  for (const change of changes) {
    const currentModuleIds = current.runtimeModuleIdsByArea?.[change.area] ?? [];
    const nextModuleIds = normalizeRuntimeModuleSelection(
      change.selectedIds,
      change.area,
      current.runtimeModuleDefinitions,
    );
    if (!areRuntimeModuleIdsEqual(currentModuleIds, nextModuleIds)) {
      effective.push({ area: change.area, moduleIds: nextModuleIds });
    }
  }
  if (effective.length === 0) {
    return;
  }

  const changedAreas = effective.map(({ area }) => area);
  const historyBefore = capturePhiBuilderModulesHistoryState(
    getPhiDeveloperBuilderStateSnapshot(defaultArea),
    changedAreas,
  );
  phiWorkspaceCatalogStore.patch(defaultArea, (catalog) => ({
    ...catalog,
    runtimeModuleIdsByArea: {
      ...(catalog.runtimeModuleIdsByArea ?? {}),
      ...Object.fromEntries(effective.map(({ area, moduleIds }) => [area, moduleIds])),
    },
  }));
  markPhiBuilderModuleAreasDirty(changedAreas, defaultArea);
  phiBuilderHistory.record(
    createPhiBuilderHistoryContext({ workspace: "modules", area: defaultArea }),
    {
      label: "Change runtime modules",
      before: historyBefore,
      after: capturePhiBuilderModulesHistoryState(
        getPhiDeveloperBuilderStateSnapshot(defaultArea),
        changedAreas,
      ),
    },
  );
}

export function applyPhiBuilderRuntimeModuleSelectionChange(
  area: PhiDeveloperBuilderArea,
  selectedIds: readonly string[],
  defaultArea: PhiDeveloperBuilderArea,
) {
  applyPhiBuilderRuntimeModuleSelectionChanges([{ area, selectedIds }], defaultArea);
  return getPhiDeveloperBuilderStateSnapshot(defaultArea).runtimeModuleIdsByArea?.[area] ?? [];
}

/**
 * The Areas whose Module selection has unsaved edits, kept as Builder tool state so the Modules
 * workspace commands know which Areas a site-wide save or publish has to reach. Undo does not clear
 * an Area from here -- a save of an unchanged selection is a no-op draft, while a missed Area would
 * silently publish stale state.
 */
export function markPhiBuilderModuleAreasDirty(
  areas: readonly PhiDeveloperBuilderArea[],
  defaultArea: PhiDeveloperBuilderArea,
) {
  builderWorkspaceStore.patch(defaultArea, (tool) => {
    const next = new Set(tool.modulesDirtyAreas ?? []);
    for (const area of areas) {
      next.add(area);
    }
    return next.size === (tool.modulesDirtyAreas ?? []).length
      ? tool
      : { ...tool, modulesDirtyAreas: [...next] };
  });
}

export function clearPhiBuilderModuleAreasDirty(defaultArea: PhiDeveloperBuilderArea) {
  builderWorkspaceStore.patch(defaultArea, (tool) =>
    (tool.modulesDirtyAreas?.length ?? 0) === 0 ? tool : { ...tool, modulesDirtyAreas: [] });
}
