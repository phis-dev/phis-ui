import { isPhiRecord } from "./is-record";

/**
 * Two route sets of one receiver or Controller put together, emits with emits and listens with listens.
 *
 * Used where two sources configure the same Controller: an Area Shell and an Area Overlay composed into
 * one tree (`concatPhiCmsTreeControllerSettings`), or an Area's config with what the shown Page adds
 * (`mergePhiRuntimeControllerConfigOverlay`). A route both name by the same `routeKey` is the same
 * question answered twice: `duplicate: "replace"` lets the addition's answer stand -- the Page speaks
 * over its Area -- and `duplicate: "refuse"` throws, because two composed trees have no order to decide by.
 */
type RouteLike = { routeKey?: unknown };

function readRoutes(value: unknown): readonly RouteLike[] {
  return Array.isArray(value) ? value as RouteLike[] : [];
}

function joinRouteLists(
  base: unknown,
  addition: unknown,
  duplicate: "replace" | "refuse",
  label: string,
) {
  const added = readRoutes(addition);
  const addedKeys = new Set(added.map((route) => route.routeKey).filter((key) => typeof key === "string"));
  const kept = readRoutes(base).filter((route) => {
    if (typeof route.routeKey !== "string" || !addedKeys.has(route.routeKey)) return true;
    if (duplicate === "refuse") {
      throw new Error(`${label} names signal route "${route.routeKey}" twice.`);
    }
    return false;
  });
  return [...kept, ...added];
}

export function joinPhiSignalRouteSets(
  base: unknown,
  addition: unknown,
  options: { duplicate: "replace" | "refuse"; label: string },
): Record<string, unknown> | undefined {
  if (!isPhiRecord(base)) return isPhiRecord(addition) ? addition : undefined;
  if (!isPhiRecord(addition)) return base;
  return {
    ...base,
    ...addition,
    emits: joinRouteLists(base.emits, addition.emits, options.duplicate, options.label),
    listens: joinRouteLists(base.listens, addition.listens, options.duplicate, options.label),
  };
}
