import { isPhiCmsAreaKey, type PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";

/**
 * Which Areas an installed Module may serve, as `phis module` writes it into the generated projection.
 *
 * The answer comes from the package's own `package.json#phis.modules[].eligibleAreas`, and only from
 * there: a generator that loads no Module can read that file, and it has to know the Areas before any
 * code runs, because it writes one Client projection per Area and a package's Client door belongs only
 * in the ones its Modules serve. An installed Module's definition therefore names no Area. The
 * projection reads the placement and completes the definition with it, so everything downstream -- the
 * catalog, the Builder's Modules page, the Area cut -- reads `eligibleAreas` exactly as it does for a
 * first-party Module.
 */
export type PhiSiteModulePlacement = {
  moduleId: PhiRuntimeModuleId;
  eligibleAreas: readonly PhiCmsAreaKey[];
};

/**
 * The placements by Module, refused where they cannot be meant.
 *
 * They are generated, so a fault here is a package whose declaration changed after the projection was
 * written, or a projection edited by hand. Either way the Site must not build on a guess.
 */
export function readPhiSiteModulePlacements(
  placements: readonly PhiSiteModulePlacement[],
): ReadonlyMap<PhiRuntimeModuleId, readonly PhiCmsAreaKey[]> {
  const byModuleId = new Map<PhiRuntimeModuleId, readonly PhiCmsAreaKey[]>();
  for (const placement of placements) {
    if (byModuleId.has(placement.moduleId)) {
      throw new Error(`Module "${placement.moduleId}" is placed twice.`);
    }
    if (placement.eligibleAreas.length === 0) {
      throw new Error(`Module "${placement.moduleId}" is placed in no Area and could never be used.`);
    }
    if (
      new Set(placement.eligibleAreas).size !== placement.eligibleAreas.length ||
      placement.eligibleAreas.some((area) => !isPhiCmsAreaKey(area))
    ) {
      throw new Error(
        `Module "${placement.moduleId}" is placed in Areas that are not unique canonical keys.`,
      );
    }
    byModuleId.set(placement.moduleId, placement.eligibleAreas);
  }
  return byModuleId;
}

/** The placement of one Module, which the projection must have been written with. */
export function requirePhiSiteModulePlacement(
  placements: ReadonlyMap<PhiRuntimeModuleId, readonly PhiCmsAreaKey[]>,
  moduleId: PhiRuntimeModuleId,
): readonly PhiCmsAreaKey[] {
  const eligibleAreas = placements.get(moduleId);
  if (!eligibleAreas) {
    throw new Error(
      `Module "${moduleId}" is installed but not placed. Its package.json#phis does not declare it, ` +
      "or the projection predates the package: run `phis module sync` once the package is installed.",
    );
  }
  return eligibleAreas;
}
