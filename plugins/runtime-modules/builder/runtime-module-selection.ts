import type { PhiRuntimeModuleDefinition, PhiRuntimeModuleId } from "../../../types";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import {
  isPhiRuntimeAreaBaseModuleId,
  resolvePhiRuntimeAreaDefinition,
} from "../area-definitions";
import { resolvePhiRuntimeModuleIdsForArea } from "../settings";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";
import { getPhiDeveloperBuilderStateSnapshot } from "./developer-workspace-store";
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

  return resolvePhiRuntimeModuleIdsForArea(
    area,
    definitions.filter((definition) =>
      definition.kind === "module" &&
      definition.moduleId !== baseModuleId &&
      selectedIdSet.has(definition.moduleId),
    )
      .map((definition) => definition.moduleId),
    definitions,
  );
}

/**
 * Applies a new Module selection to one Area: validates it, patches the catalog, and records the
 * change in the Area's own Module history -- the one place all of this happens, so a Switch cell in the
 * Modules table and the legacy `runtimeModules` signal channel stay in perfect step rather than each
 * growing its own copy of "what does changing this actually mean."
 *
 * A no-op selection (the normalized list already matches what is live) records nothing: an empty history
 * entry would just be something to undo back into itself.
 */
export function applyPhiBuilderRuntimeModuleSelectionChange(
  area: PhiDeveloperBuilderArea,
  selectedIds: readonly string[],
  defaultArea: PhiDeveloperBuilderArea,
) {
  const current = getPhiDeveloperBuilderStateSnapshot(defaultArea);
  const currentModuleIds = current.runtimeModuleIdsByArea?.[area] ?? [];
  const nextModuleIds = normalizeRuntimeModuleSelection(selectedIds, area, current.runtimeModuleDefinitions);
  if (areRuntimeModuleIdsEqual(currentModuleIds, nextModuleIds)) {
    return nextModuleIds;
  }

  const historyBefore = capturePhiBuilderModulesHistoryState(
    getPhiDeveloperBuilderStateSnapshot(defaultArea),
    area,
  );
  phiWorkspaceCatalogStore.patch(defaultArea, (catalog) => ({
    ...catalog,
    runtimeModuleIdsByArea: {
      ...(catalog.runtimeModuleIdsByArea ?? {}),
      [area]: nextModuleIds,
    },
  }));
  phiBuilderHistory.record(
    createPhiBuilderHistoryContext({ workspace: "modules", area }),
    {
      label: "Change runtime modules",
      before: historyBefore,
      after: capturePhiBuilderModulesHistoryState(getPhiDeveloperBuilderStateSnapshot(defaultArea), area),
    },
  );
  return nextModuleIds;
}
