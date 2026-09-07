import type { PhiBuilderAreaKey } from "../constants/cms-areas";
import { createPhiDefaultAreaRuntimeModuleIds } from "../plugins/runtime-modules/builder/runtime-module-defaults";
import { readPhiRuntimeModuleIds } from "../plugins/runtime-modules/settings";
import type { PhiRuntimeModuleId } from "../types";
import type { PhiResolvedCmsAreaPresetTree } from "../types/cms";
import { readPhiPageReference, type PhiPageReference } from "../types/references";

/**
 * The two halves of an Area preset config, expressed as a path rather than as a list of field names.
 *
 * An Area is edited from two workspaces that own different things: its structure on `/builder/shells`,
 * its Module selection on `/builder/modules`. Which one may write a given value used to be a convention
 * kept by the client and a comment in the server's publish merge; naming the halves makes it a path,
 * and the write routes reject a payload that carries the other one.
 *
 * A Shell Background is not in here, and that is not an oversight: it belongs to a Region and travels
 * in the structure tree. What lives under `shell` is what the Shell states about itself rather than
 * about one of its Regions -- the root route of the Area first.
 */

export const PHI_AREA_CONFIG_SHELL_NAMESPACE = "shell" as const;
export const PHI_AREA_CONFIG_MODULES_NAMESPACE = "modules" as const;

export type PhiAreaConfigNamespace =
  | typeof PHI_AREA_CONFIG_SHELL_NAMESPACE
  | typeof PHI_AREA_CONFIG_MODULES_NAMESPACE;

export function readPhiAreaConfigNamespace(
  config: Record<string, unknown> | null | undefined,
  namespace: PhiAreaConfigNamespace,
): Record<string, unknown> | undefined {
  const value = config?.[namespace];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

/**
 * The Module selection an Area preset carries.
 *
 * `runtimeModuleIds` is the resolved field the payload already carries when it has one; the stored
 * config is what a Site that persisted its Area falls back to. Both readings sit here so the namespace
 * appears once rather than at every call site that needs the selection.
 */
export function readPhiAreaPresetRuntimeModules(
  tree: Pick<PhiResolvedCmsAreaPresetTree, "runtimeModuleIds" | "preset"> | null | undefined,
) {
  return tree?.runtimeModuleIds
    ?? readPhiAreaConfigNamespace(tree?.preset.config, PHI_AREA_CONFIG_MODULES_NAMESPACE)?.runtimeModules;
}

/**
 * The Modules an Area preset actually activates.
 *
 * Absent and empty are different answers and are read as different answers: nothing stated is an Area
 * that was never asked, and it gets the selection its preset ships with; `[]` is a Builder who
 * switched everything off, and it gets nothing.
 *
 * The distinction is load-bearing rather than pedantic. A stored Area preset need not carry the
 * Modules namespace at all -- the structure draft owns `config.shell` and writes only that -- so
 * reading an absent selection as an empty one would let the first structure save of an Area whose
 * Modules were never published turn every optional Module off, silently, and take the Pages they carry
 * with them.
 */
export function readPhiAreaPresetRuntimeModuleIds(
  tree: Pick<PhiResolvedCmsAreaPresetTree, "runtimeModuleIds" | "preset"> | null | undefined,
  area: PhiBuilderAreaKey,
): PhiRuntimeModuleId[] {
  return readPhiRuntimeModuleIds(readPhiAreaPresetRuntimeModules(tree))
    ?? createPhiDefaultAreaRuntimeModuleIds(area);
}

export const PHI_AREA_ROOT_ROUTE_KEY = "rootRoute" as const;

/**
 * What an Area's `/` resolves to.
 *
 * The root is the one path drawn without the Shell around it, so it can only be a page that wants to
 * arrive alone or a forward that draws nothing. `landing` is the first; `redirect` is the second and
 * names its destination as a Page reference rather than a path, because a path is a fact about today's
 * routing table while a reference survives a Page being renamed or a Module moving its route.
 *
 * Absent means the Area has not been asked: the code-owned preset answers, which forwards to the first
 * entry of the Area's own navigation. That stays the fallback when a configured target no longer
 * resolves -- a Module switched off must move the front door, not break it.
 */
export type PhiAreaRootRoute =
  | { mode: "landing" }
  | { mode: "redirect"; target: PhiPageReference };

export function readPhiAreaRootRoute(
  config: Record<string, unknown> | null | undefined,
): PhiAreaRootRoute | null {
  const value = readPhiAreaConfigNamespace(config, PHI_AREA_CONFIG_SHELL_NAMESPACE)?.[
    PHI_AREA_ROOT_ROUTE_KEY
  ];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.mode === "landing") {
    return { mode: "landing" };
  }
  if (record.mode !== "redirect") {
    return null;
  }
  // An unreadable reference is the same answer as none: the preset decides, and the Builder sees the
  // selector fall back to what actually happens rather than to what was stored.
  const reference = readPhiPageReference(record.target);
  return reference ? { mode: "redirect", target: reference.reference } : null;
}

export const PHI_AREA_PUBLIC_ROUTE_PATHS_KEY = "publicRoutePaths" as const;

/**
 * A Public address a Module route was given instead of the one it declared.
 *
 * Only Public has an address space two Modules can contest -- everywhere else a route lives under its
 * package -- so this is the answer to the one question enabling a Module can ask. It names the route by
 * its identity, `ownerModuleId` and `presetKey`, never by the path it declared: the point of writing it
 * down is that the declared path was not available, and a rename on either side must not silently
 * detach the assignment from the route it was made for.
 *
 * It is a value in the Modules namespace, beside `runtimeModules`, written by the same route with the
 * same draft and publish behaviour. That is what keeps assigning a path from pulling the structure
 * preset into the draft: a Page still renders straight from its preset.
 */
export type PhiPublicRoutePathAssignment = {
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  path: string;
};

const PHI_PUBLIC_ROUTE_PATH_SEGMENT_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._~-]*$/u;

/**
 * Whether a string is an address a Module route may be given.
 *
 * An assignment is always a fixed address. A dynamic segment belongs to the route the Module declared
 * -- it says what the Module reads out of the path -- and is not something a Builder types into a
 * dialog, so a value carrying one is not an assignment at all.
 */
export function isPhiAssignablePublicRoutePath(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/") || value === "/") {
    return false;
  }
  const segments = value.split("/");
  return segments[0] === "" &&
    segments.length > 1 &&
    segments.slice(1).every((segment) => PHI_PUBLIC_ROUTE_PATH_SEGMENT_PATTERN.test(segment));
}

function readPublicRoutePathAssignment(value: unknown): PhiPublicRoutePathAssignment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const ownerModuleId = typeof record.ownerModuleId === "string" ? record.ownerModuleId.trim() : "";
  const presetKey = typeof record.presetKey === "string" ? record.presetKey.trim() : "";
  if (!ownerModuleId || !presetKey || !isPhiAssignablePublicRoutePath(record.path)) {
    return null;
  }
  return { ownerModuleId: ownerModuleId as PhiRuntimeModuleId, presetKey, path: record.path };
}

function readPublicRoutePathIdentity(assignment: PhiPublicRoutePathAssignment) {
  return `${assignment.ownerModuleId}/${assignment.presetKey}`;
}

/**
 * The assignments a stored Area config carries, as a read that cannot refuse.
 *
 * An entry nothing can act on -- a route that no longer exists, a path a later rule stopped allowing --
 * is dropped rather than raised: this is read on every request, and an old value in a config may not be
 * what takes a Site down. The write path is where an assignment has to be right, and it says so.
 */
export function readPhiAreaPublicRoutePaths(
  config: Record<string, unknown> | null | undefined,
): PhiPublicRoutePathAssignment[] {
  const value = readPhiAreaConfigNamespace(config, PHI_AREA_CONFIG_MODULES_NAMESPACE)?.[
    PHI_AREA_PUBLIC_ROUTE_PATHS_KEY
  ];
  if (!Array.isArray(value)) {
    return [];
  }
  const assignments: PhiPublicRoutePathAssignment[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const assignment = readPublicRoutePathAssignment(entry);
    // One route, one address: a second entry for the same route is not a second answer.
    if (!assignment || seen.has(readPublicRoutePathIdentity(assignment))) {
      continue;
    }
    seen.add(readPublicRoutePathIdentity(assignment));
    assignments.push(assignment);
  }
  return assignments;
}

/**
 * The same list on the way in, where being wrong is worth saying out loud.
 *
 * Sorted by route identity so an unchanged selection serializes byte-identically, which is what lets a
 * save of a config nobody touched stay a no-op draft.
 */
export function normalizePhiAreaPublicRoutePaths(
  assignments: readonly PhiPublicRoutePathAssignment[],
): PhiPublicRoutePathAssignment[] {
  const byIdentity = new Map<string, PhiPublicRoutePathAssignment>();
  for (const assignment of assignments) {
    const ownerModuleId = assignment.ownerModuleId?.trim() ?? "";
    const presetKey = assignment.presetKey?.trim() ?? "";
    if (!ownerModuleId || !presetKey) {
      throw new Error("A public route path assignment must name a Module and a preset.");
    }
    if (!isPhiAssignablePublicRoutePath(assignment.path)) {
      throw new Error(`"${assignment.path}" is not an address a Public route may be given.`);
    }
    const normalized = {
      ownerModuleId: ownerModuleId as PhiRuntimeModuleId,
      presetKey,
      path: assignment.path,
    };
    const identity = readPublicRoutePathIdentity(normalized);
    const existing = byIdentity.get(identity);
    if (existing && existing.path !== normalized.path) {
      throw new Error(
        `Route "${identity}" was assigned two addresses: "${existing.path}" and "${normalized.path}".`,
      );
    }
    byIdentity.set(identity, normalized);
  }
  return [...byIdentity.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, assignment]) => assignment);
}
