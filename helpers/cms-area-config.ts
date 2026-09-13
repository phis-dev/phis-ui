import type { PhiBuilderAreaKey } from "../constants/cms-areas";
import { createPhiDefaultAreaRuntimeModuleIds } from "../plugins/runtime-modules/builder/runtime-module-defaults";
import { readPhiRuntimeModuleIds } from "../plugins/runtime-modules/settings";
import type { PhiRuntimeModuleId } from "../types";
import type { PhiResolvedCmsAreaPresetTree } from "../types/cms";
import type { PhiCmsPresetIdentity } from "../types/cms-module-descriptors";
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
  | { mode: "landing"; target?: PhiPageReference }
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
    /*
     * Which landing, when several Modules offer one.
     *
     * Absent is a landing without an applicant, which is a state and not a gap: the root draws its own
     * empty tree and somebody authors it in /pages. An unreadable target is the same answer, for the
     * same reason a redirect's is -- what the Builder sees then is what actually happens.
     */
    const landing = readPhiPageReference(record.target);
    return landing ? { mode: "landing", target: landing.reference } : { mode: "landing" };
  }
  if (record.mode !== "redirect") {
    return null;
  }
  // An unreadable reference is the same answer as none: the preset decides, and the Builder sees the
  // selector fall back to what actually happens rather than to what was stored.
  const reference = readPhiPageReference(record.target);
  return reference ? { mode: "redirect", target: reference.reference } : null;
}

/**
 * What the Area said about its root slot, in the three answers the slot can be given.
 *
 * `null` is the Area that was never asked, and it is the only one of the three that lets the route
 * table adopt a single applicant unasked -- which is what makes a Site package land live the moment it
 * is switched on, with nobody clicking anything.
 *
 * `empty` is a landing whose applicant was left blank, and it is a decision rather than a gap: a
 * Builder who says "landing" while the applicant Select sits on its empty placeholder is looking at
 * what they will get. Reading it as "nothing was said" is what used to hand the front door to a
 * Module behind their back, with the Select still showing blank.
 *
 * `preset` names one applicant. It is not a promise that the applicant is still there -- a Module that
 * was switched off falls back through the ordinary chain, front door moving rather than breaking.
 *
 * A reference is what the Builder stores, here as everywhere; the compiler works in identities, so the
 * translation happens once, here. A reference to a Site Page is not an applicant: only a Module can
 * apply for the slot, because only a Module's Page exists before a Site has authored anything -- so it
 * reads as the blank it effectively is rather than as "never asked".
 */
export type PhiAreaLandingSelection =
  | { kind: "preset"; identity: PhiCmsPresetIdentity }
  | { kind: "empty" };

export function readPhiAreaLandingSelection(
  config: Record<string, unknown> | null | undefined,
): PhiAreaLandingSelection | null {
  return resolvePhiAreaLandingSelection(readPhiAreaRootRoute(config));
}

/**
 * The same answer, for a caller that already has the route rather than the config it came from.
 *
 * The Builder is that caller: what it must show is the sentence being edited, draft included, and the
 * draft never went through a config record.
 */
export function resolvePhiAreaLandingSelection(
  rootRoute: PhiAreaRootRoute | null,
): PhiAreaLandingSelection | null {
  if (rootRoute?.mode !== "landing") {
    return null;
  }
  const parsed = rootRoute.target ? readPhiPageReference(rootRoute.target) : null;
  return parsed?.target.kind === "module"
    ? {
        kind: "preset",
        identity: {
          ownerModuleId: parsed.target.ownerModuleId as PhiRuntimeModuleId,
          presetKey: parsed.target.presetKey,
        },
      }
    : { kind: "empty" };
}

/**
 * Which applicant answers the Area's root slot.
 *
 * One implementation with two readers, and they must not drift: the route table decides what a visitor
 * is served at `/`, and the Builder's Page list decides which `/` an author is offered and fills the
 * canvas with. Two copies of this chain would agree while exactly one Module applies -- which is every
 * case except the one the slot exists for -- and disagree the moment a second one does, leaving an
 * author editing a Page nobody is served.
 *
 * The chain: the applicant the Site named, while it is still there. Otherwise the single offer, which
 * is what lets a Site package ship a front door that is live on install. Otherwise the Area's own base
 * Module, which holds the slot as a fallback rather than as an application. Otherwise whatever else
 * applied -- unless the Site answered "landing, nobody", which means it authors the root itself and no
 * code Page may stand in. `applicants` is expected to be narrowed to what is active and permitted before
 * it gets here; this decides only which of them.
 */
export type PhiAreaRootApplicant = {
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  landingPage?: boolean;
};

export function choosePhiAreaRootApplicant<TApplicant>(
  applicants: readonly TApplicant[],
  readApplicant: (applicant: TApplicant) => PhiAreaRootApplicant,
  {
    baseModuleId,
    landingSelection,
  }: {
    baseModuleId: PhiRuntimeModuleId | null;
    landingSelection?: PhiAreaLandingSelection | null;
  },
): TApplicant | null {
  const named = landingSelection?.kind === "preset"
    ? applicants.find((applicant) => {
      const identity = readApplicant(applicant);
      return identity.ownerModuleId === landingSelection.identity.ownerModuleId &&
        identity.presetKey === landingSelection.identity.presetKey;
    })
    : undefined;
  /*
   * A named applicant that is no longer there falls through to the adoption rather than to the blank:
   * an Operator who removes the example package and installs their own gets the new package's landing
   * without editing the sentence the old one left behind. Only an explicit "landing, nobody" stops it.
   */
  const offers = landingSelection?.kind === "empty"
    ? []
    : applicants.filter((applicant) => readApplicant(applicant).landingPage === true);
  const adopted = offers.length === 1 ? offers[0] : undefined;

  return named
    ?? adopted
    ?? applicants.find((applicant) => readApplicant(applicant).ownerModuleId === baseModuleId)
    ?? (landingSelection?.kind === "empty" ? null : applicants[0])
    ?? null;
}

export const PHI_AREA_META_KEY = "meta" as const;

/**
 * What an Area says about itself in the head of every Page it draws.
 *
 * Four answers under one key, because they are one subject -- what the Area puts in the document head
 * -- even though they are asked in two groups and answerable by different Areas. `index` and `sitemap`
 * are only ever asked of Public: every other Area is authenticated and is never indexed whatever is
 * stored, which is why the dialog only arms those two there. `titleTemplate` and `defaultTitle` are
 * asked everywhere, because a tab title is not a search result and the Admin wants its own.
 *
 * Absent is an Area that was never asked, and it stays absent rather than becoming a stored default:
 * the Shell states its config whole on every structure save, so writing a guess would turn the first
 * unrelated save of a Site into a decision nobody made.
 */
export type PhiAreaMeta = {
  index?: boolean;
  sitemap?: boolean;
  titleTemplate?: string;
  defaultTitle?: string;
};

/**
 * What an Area that was never asked means, in the one Area the indexing question is ever asked in.
 *
 * A Public Area wants to be found: that is what makes it public. Stated once so the Builder's switches
 * and whatever reads them later say the same thing, rather than each inventing its own resting state.
 * Outside Public there is nothing to default -- those Areas are authenticated and are never indexed
 * whatever is stored.
 *
 * The two titles have no entry here on purpose. Their resting state is not a constant but the name of
 * the Site, which this file cannot see, so the absent answer is resolved where the name is known.
 */
export const PHI_AREA_META_PUBLIC_DEFAULTS = { index: true, sitemap: true } as const;

/**
 * The placeholder a title template puts the Page's own title into.
 *
 * Next's spelling, restated here because both the Builder's field and the reader have to agree on it:
 * a template without it would silently give every Page the same title.
 */
export const PHI_AREA_TITLE_TEMPLATE_PLACEHOLDER = "%s" as const;

export function readPhiAreaMeta(
  config: Record<string, unknown> | null | undefined,
): PhiAreaMeta | null {
  const value = readPhiAreaConfigNamespace(config, PHI_AREA_CONFIG_SHELL_NAMESPACE)?.[PHI_AREA_META_KEY];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    ...(typeof record.index === "boolean" ? { index: record.index } : {}),
    ...(typeof record.sitemap === "boolean" ? { sitemap: record.sitemap } : {}),
    ...(typeof record.titleTemplate === "string" ? { titleTemplate: record.titleTemplate } : {}),
    ...(typeof record.defaultTitle === "string" ? { defaultTitle: record.defaultTitle } : {}),
  };
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
