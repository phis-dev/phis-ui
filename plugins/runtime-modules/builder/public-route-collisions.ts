import { buildPhiRuntimeModulePackageRoutePrefix } from "../../../helpers/runtime-module-route-path";
import {
  buildPhiPublicRouteAddressMap,
  findPhiPublicRoutePathCollisions,
  type PhiPublicRouteAddressHolder,
} from "../../../helpers/public-route-claims";
import {
  isPhiAssignablePublicRoutePath,
  normalizePhiAreaPublicRoutePaths,
} from "../../../helpers/cms-area-config";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";
import type { PhiRuntimeModuleId } from "../../../types";
import { markPhiBuilderModuleAreasDirty } from "./runtime-module-selection";
import type {
  PhiBuilderPublicRouteCollisionAnswer,
  PhiBuilderPublicRouteCollisionRequest,
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";

/**
 * Which Public addresses a Site Page already occupies.
 *
 * A Page is not a Module and cannot be asked to move, so from a Module's side its address is simply
 * taken. Saying that in the dialog is better than letting the Module take the address and a Page stop
 * opening -- the read resolves first claim wins, and which claim is first is not something an operator
 * should have to reason about.
 */
export function resolvePhiBuilderPersistedPublicPages(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "persistedPageCatalogByArea">,
) {
  return (state.persistedPageCatalogByArea?.public ?? [])
    .filter((entry) => !entry.tombstoned && typeof entry.path === "string" && entry.path.length > 0)
    // A Page that came from a Module preset is that Module's route, counted with the Modules below.
    .filter((entry) => !entry.ownerModuleId)
    .map((entry) => ({ path: entry.path as string, title: entry.path as string }));
}

/**
 * What answers on each Public address in the draft the Builder is editing.
 *
 * The draft, not the published Area: freeing an address by switching one Module off and claiming it
 * with another has to work in one editing session, and it does because both halves are read from the
 * same unsaved selection.
 */
export function buildPhiBuilderPublicAddressMap(
  state: Pick<
    PhiDeveloperBuilderWorkspaceState,
    "publicRouteClaims" | "publicRoutePaths" | "runtimeModuleIdsByArea" | "persistedPageCatalogByArea"
  >,
  options?: { without?: PhiRuntimeModuleId },
) {
  const activeModuleIds = new Set(
    (state.runtimeModuleIdsByArea?.public ?? []).filter((moduleId) => moduleId !== options?.without),
  );
  return buildPhiPublicRouteAddressMap({
    claims: state.publicRouteClaims ?? [],
    activeModuleIds,
    assignments: state.publicRoutePaths ?? [],
    sitePages: resolvePhiBuilderPersistedPublicPages(state),
  });
}

/**
 * A first suggestion for an address that is taken, so the dialog opens with something to accept.
 *
 * The Module's own package is where a second `/login` can live without asking anybody: `/phis/dev/login`
 * reads as what it is, and it is free by construction because a package name is unique. Only a
 * suggestion -- Public is the Site's address space, and a Builder types over it whenever a better name
 * exists.
 */
export function suggestPhiPublicRoutePath(
  moduleId: PhiRuntimeModuleId,
  declaredPath: string,
  taken: ReadonlyMap<string, PhiPublicRouteAddressHolder>,
) {
  const namespaced = `${buildPhiRuntimeModulePackageRoutePrefix(moduleId)}${declaredPath}`;
  if (!taken.has(namespaced)) {
    return namespaced;
  }
  for (let attempt = 2; attempt < 20; attempt += 1) {
    const candidate = `${namespaced}-${attempt}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  return namespaced;
}

export function describePhiPublicRouteAddressHolder(
  holder: PhiPublicRouteAddressHolder,
  moduleTitles: ReadonlyMap<string, string>,
) {
  return holder.kind === "page"
    ? holder.title
    : `${moduleTitles.get(holder.claim.ownerModuleId) ?? holder.claim.ownerModuleId}: ${holder.claim.title}`;
}

/**
 * The question to put to the Builder before a Module may be enabled for Public.
 *
 * Empty means there is nothing to ask, and the switch does what it was asked to do. Anything else is a
 * dialog: every contested address, who holds it, and a proposal to accept or overwrite.
 */
export function resolvePhiBuilderPublicRouteCollisionAnswers(
  state: Pick<
    PhiDeveloperBuilderWorkspaceState,
    | "publicRouteClaims"
    | "publicRoutePaths"
    | "runtimeModuleIdsByArea"
    | "persistedPageCatalogByArea"
    | "runtimeModuleDefinitions"
  >,
  moduleId: PhiRuntimeModuleId,
): PhiBuilderPublicRouteCollisionAnswer[] {
  const addresses = buildPhiBuilderPublicAddressMap(state, { without: moduleId });
  const collisions = findPhiPublicRoutePathCollisions({
    moduleId,
    claims: state.publicRouteClaims ?? [],
    addresses,
    assignments: state.publicRoutePaths ?? [],
  });
  const moduleTitles = new Map(
    (state.runtimeModuleDefinitions ?? []).map((definition) => [definition.moduleId, definition.title] as const),
  );
  const proposed = new Map(addresses);
  return collisions.map((collision) => {
    const path = suggestPhiPublicRoutePath(moduleId, collision.claim.declaredPath, proposed);
    // Two contested routes of one Module must not be offered the same free address.
    proposed.set(path, { kind: "page", title: collision.claim.title });
    return {
      presetKey: collision.claim.presetKey,
      title: collision.claim.title,
      declaredPath: collision.path,
      heldBy: describePhiPublicRouteAddressHolder(collision.heldBy, moduleTitles),
      path,
    };
  });
}

/**
 * Why an answer cannot be taken, said in one sentence, or nothing when it can.
 *
 * Checked against the same draft the dialog was opened from, because that is what the Site will
 * actually answer with: an address freed by switching another Module off in this session counts as
 * free, and one taken while the dialog stood counts as taken.
 */
export function findPhiBuilderPublicRouteAnswerProblem(
  state: Pick<
    PhiDeveloperBuilderWorkspaceState,
    | "publicRouteClaims"
    | "publicRoutePaths"
    | "runtimeModuleIdsByArea"
    | "persistedPageCatalogByArea"
  >,
  request: Pick<PhiBuilderPublicRouteCollisionRequest, "moduleId" | "answers">,
): string | null {
  const addresses = buildPhiBuilderPublicAddressMap(state, { without: request.moduleId });
  const claimed = new Set<string>();
  for (const answer of request.answers) {
    const path = answer.path.trim();
    if (!isPhiAssignablePublicRoutePath(path)) {
      return `"${path}" is not an address a Public page can have. Use a path such as "/sign-in".`;
    }
    if (addresses.has(path)) {
      return `"${path}" is taken as well.`;
    }
    if (claimed.has(path)) {
      return `"${path}" was given to two of this Module's pages.`;
    }
    claimed.add(path);
  }
  return null;
}

/**
 * The answers, written where the route table reads them.
 *
 * An answer for a route that already had one replaces it; every other assignment on the Site is left
 * alone, including those of Modules that are switched off -- an assignment outlives its Module being
 * disabled, which is why nobody is asked the same question twice.
 */
export function applyPhiBuilderPublicRouteAssignments(
  scopeKey: PhiDeveloperBuilderArea,
  request: Pick<PhiBuilderPublicRouteCollisionRequest, "moduleId" | "answers">,
) {
  const answered = new Map(request.answers.map((answer) => [answer.presetKey, answer.path.trim()] as const));
  phiWorkspaceCatalogStore.patch(scopeKey, (catalog) => {
    const kept = (catalog.publicRoutePaths ?? []).filter((assignment) =>
      assignment.ownerModuleId !== request.moduleId || !answered.has(assignment.presetKey));
    return {
      ...catalog,
      publicRoutePaths: normalizePhiAreaPublicRoutePaths([
        ...kept,
        ...[...answered.entries()].map(([presetKey, path]) => ({
          ownerModuleId: request.moduleId,
          presetKey,
          path,
        })),
      ]),
    };
  });
  markPhiBuilderModuleAreasDirty(["public"], scopeKey);
}
