import type { PhiRuntimeModuleId } from "../types";
import type { PhiPublicRoutePathAssignment } from "./cms-area-config";

/**
 * A Public address a Module route wants, and what already answers there.
 *
 * Public is the one Area where two Modules can want the same address, so it is the one place a
 * decision has to be made by a person. Everything here is the material for that decision: what the
 * Module proposes, what holds the address today, and what the Site already answered for this route.
 *
 * Deliberately free of the descriptor catalog. The claims are collected on the server, where the
 * catalog lives, and the question -- is this address free, and if not, who has it -- is asked in the
 * Builder, where the answer is given. Keeping the question pure is what lets the same rule run in the
 * dialog and, later, in the update command's report.
 */
export type PhiPublicRouteClaim = {
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  title: string;
  /** The address the Module declared. What it actually answers on may have been assigned. */
  declaredPath: string;
};

export type PhiPublicRouteAddressHolder =
  | { kind: "module"; claim: PhiPublicRouteClaim; assigned: boolean }
  | { kind: "page"; title: string };

export type PhiPublicRoutePathCollision = {
  claim: PhiPublicRouteClaim;
  /** The address contested: the assignment this Site already made, or the declared path. */
  path: string;
  heldBy: PhiPublicRouteAddressHolder;
};

export function buildPhiPublicRouteIdentity(ownerModuleId: string, presetKey: string) {
  return `${ownerModuleId}/${presetKey}`;
}

/**
 * The address a route answers on: what this Site assigned it, or what it declared.
 *
 * An assignment survives the Module being switched off and on again, which is the point of writing it
 * down -- a Builder who once answered the question is not asked it a second time.
 */
export function resolvePhiPublicRoutePath(
  claim: Pick<PhiPublicRouteClaim, "ownerModuleId" | "presetKey" | "declaredPath">,
  assignments: readonly PhiPublicRoutePathAssignment[],
) {
  const identity = buildPhiPublicRouteIdentity(claim.ownerModuleId, claim.presetKey);
  return assignments.find(
    (assignment) => buildPhiPublicRouteIdentity(assignment.ownerModuleId, assignment.presetKey) === identity,
  )?.path ?? claim.declaredPath;
}

/**
 * What answers on each Public address today.
 *
 * First claim wins, the same rule the route table reads with: where two active Modules want one
 * address the second is simply absent, so the map has to agree with what a request would actually
 * find. Site Pages are in here too -- an address a Page occupies is taken from a Module's point of
 * view, and being told that at the dialog is better than being told it by a Page that stops opening.
 */
export function buildPhiPublicRouteAddressMap({
  claims,
  activeModuleIds,
  assignments,
  sitePages = [],
}: {
  claims: readonly PhiPublicRouteClaim[];
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  assignments: readonly PhiPublicRoutePathAssignment[];
  sitePages?: readonly { path: string; title: string }[];
}): Map<string, PhiPublicRouteAddressHolder> {
  const addresses = new Map<string, PhiPublicRouteAddressHolder>();
  for (const page of sitePages) {
    if (!addresses.has(page.path)) {
      addresses.set(page.path, { kind: "page", title: page.title });
    }
  }
  for (const claim of claims) {
    if (!activeModuleIds.has(claim.ownerModuleId)) {
      continue;
    }
    const path = resolvePhiPublicRoutePath(claim, assignments);
    if (!addresses.has(path)) {
      addresses.set(path, { kind: "module", claim, assigned: path !== claim.declaredPath });
    }
  }
  return addresses;
}

/**
 * The addresses a Module could not have if it were switched on now.
 *
 * `/` is left out on purpose: it is an application for the Area root slot, not a route of the Module's
 * own, and several applicants are a list to choose from rather than a conflict.
 */
export function findPhiPublicRoutePathCollisions({
  moduleId,
  claims,
  addresses,
  assignments,
}: {
  moduleId: PhiRuntimeModuleId;
  claims: readonly PhiPublicRouteClaim[];
  addresses: ReadonlyMap<string, PhiPublicRouteAddressHolder>;
  assignments: readonly PhiPublicRoutePathAssignment[];
}): PhiPublicRoutePathCollision[] {
  const collisions: PhiPublicRoutePathCollision[] = [];
  for (const claim of claims) {
    if (claim.ownerModuleId !== moduleId || claim.declaredPath === "/") {
      continue;
    }
    const path = resolvePhiPublicRoutePath(claim, assignments);
    const heldBy = addresses.get(path);
    if (heldBy && !(heldBy.kind === "module" && heldBy.claim.ownerModuleId === moduleId)) {
      collisions.push({ claim, path, heldBy });
    }
  }
  return collisions;
}
