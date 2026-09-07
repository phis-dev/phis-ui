import {
  isPhiCmsAreaKey,
  type PhiCmsAreaKey,
} from "../../constants/cms-areas";
import { PhiMediaKind } from "../../constants/media";
import {
  PHI_DECLARABLE_MEDIA_SPACE_KINDS,
  type PhiDeclarableMediaSpaceKind,
  type PhiMediaKindValue,
} from "../../types/media";
import type { PhiRuntimeModuleDefinition, PhiRuntimeModuleId } from "./contracts";
import { isPhiRuntimeAreaBaseModuleId } from "./area-definitions";

export function isPhiRuntimeModuleId(value: unknown): value is PhiRuntimeModuleId {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  const separatorIndex = trimmed.lastIndexOf("/");
  return separatorIndex > 0 && separatorIndex < trimmed.length - 1;
}

export function readPhiRuntimeModuleIds(value: unknown): PhiRuntimeModuleId[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const moduleIds = value.map((candidate, index) => {
    if (!isPhiRuntimeModuleId(candidate)) {
      throw new Error(`runtimeModules[${index}] must be a namespaced module id.`);
    }
    return candidate.trim() as PhiRuntimeModuleId;
  });
  const uniqueModuleIds = new Set(moduleIds);
  if (uniqueModuleIds.size !== moduleIds.length) {
    throw new Error("runtimeModules must not contain duplicate module ids.");
  }

  return moduleIds;
}

function resolveSelectionArea(area: string): PhiCmsAreaKey {
  const cmsArea = area === "public" ? "public" : area;
  if (!isPhiCmsAreaKey(cmsArea)) {
    throw new Error(`Unknown Area "${area}".`);
  }
  return cmsArea;
}

export function assertPhiRuntimeModuleIdsAllowedForArea(
  area: string,
  moduleIds: readonly PhiRuntimeModuleId[],
  moduleDefinitions: readonly PhiRuntimeModuleDefinition[],
) {
  const cmsArea = resolveSelectionArea(area);
  const definitionsById = new Map(
    moduleDefinitions.map((definition) => [definition.moduleId, definition] as const),
  );
  for (const moduleId of moduleIds) {
    const definition = definitionsById.get(moduleId);
    if (!definition) {
      throw new Error(`Runtime module "${moduleId}" is not installed.`);
    }
    if (!definition.eligibleAreas.includes(cmsArea)) {
      throw new Error(
        `Runtime module "${moduleId}" is not eligible for Area "${cmsArea}".`,
      );
    }
    if (definition.kind === "platform" || isPhiRuntimeAreaBaseModuleId(moduleId)) {
      throw new Error(`Locked runtime module "${moduleId}" must not be persisted in Area settings.`);
    }
  }

  const authUiProviderModuleIds = moduleIds.filter(
    (moduleId) => definitionsById.get(moduleId)?.authUiProvider != null,
  );
  if (authUiProviderModuleIds.length > 1) {
    throw new Error(
      `Area "${cmsArea}" must not activate more than one Auth UI provider: ${authUiProviderModuleIds.join(", ")}.`,
    );
  }
}

export function resolvePhiAuthUiProviderModuleId(
  moduleIds: readonly PhiRuntimeModuleId[],
  moduleDefinitions: readonly PhiRuntimeModuleDefinition[],
): PhiRuntimeModuleId | null {
  const selected = new Set(moduleIds);
  return moduleDefinitions.find(
    (definition) => selected.has(definition.moduleId) && definition.authUiProvider != null,
  )?.moduleId ?? null;
}

/** Why a stored Module id is not part of the selection this build can serve. */
export type PhiUnresolvedRuntimeModuleReason = "not-installed" | "ineligible" | "locked";

export type PhiRuntimeModuleSelectionReading = {
  moduleIds: PhiRuntimeModuleId[];
  unresolved: { moduleId: PhiRuntimeModuleId; reason: PhiUnresolvedRuntimeModuleReason }[];
};

/**
 * The Modules an Area activates, as far as this build can serve them.
 *
 * A stored selection and an installed set are allowed to disagree, and they do so routinely: a deploy
 * updates the configuration before the new build is rolled out, a rollback puts an older build under a
 * newer configuration, and an operator removes a package a Site still names. None of those is a reason
 * to stop answering -- the Area would go down over a Module that was optional in the first place.
 *
 * So the read drops what it cannot serve and says which ids it dropped; the caller decides whether that
 * is worth a line in the log or a row in the Builder. Refusing stays where it belongs, on the write:
 * `assertPhiRuntimeModuleIdsAllowedForArea` is what a Builder save still goes through, so nothing
 * unresolvable is ever written back.
 *
 * The Area's own Base Module and the Platform Module are not part of this at all. They are implicit and
 * added elsewhere; a build missing one of those cannot serve the Area, and that is a failure rather
 * than a selection to trim.
 */
export function readPhiRuntimeModuleIdsForArea(
  area: string,
  moduleIds: readonly PhiRuntimeModuleId[] | null | undefined,
  moduleDefinitions: readonly PhiRuntimeModuleDefinition[],
): PhiRuntimeModuleSelectionReading {
  const cmsArea = resolveSelectionArea(area);
  const definitionsById = new Map(
    moduleDefinitions.map((definition) => [definition.moduleId, definition] as const),
  );
  const reading: PhiRuntimeModuleSelectionReading = { moduleIds: [], unresolved: [] };

  for (const moduleId of [...new Set(moduleIds ?? [])]) {
    const definition = definitionsById.get(moduleId);
    if (!definition) {
      reading.unresolved.push({ moduleId, reason: "not-installed" });
      continue;
    }
    if (!definition.eligibleAreas.includes(cmsArea)) {
      reading.unresolved.push({ moduleId, reason: "ineligible" });
      continue;
    }
    if (definition.kind === "platform" || isPhiRuntimeAreaBaseModuleId(moduleId)) {
      reading.unresolved.push({ moduleId, reason: "locked" });
      continue;
    }
    reading.moduleIds.push(moduleId);
  }

  return reading;
}

export function describePhiUnresolvedRuntimeModules(
  area: string,
  unresolved: readonly { moduleId: PhiRuntimeModuleId; reason: PhiUnresolvedRuntimeModuleReason }[],
) {
  return unresolved
    .map(({ moduleId, reason }) => `${moduleId} (${reason})`)
    .join(", ") + ` -- Area "${area}"`;
}

export function resolvePhiRuntimeModuleIdsForArea(
  area: string,
  moduleIds: readonly PhiRuntimeModuleId[] | null | undefined,
  moduleDefinitions: readonly PhiRuntimeModuleDefinition[],
): PhiRuntimeModuleId[] {
  const reading = readPhiRuntimeModuleIdsForArea(area, moduleIds, moduleDefinitions);
  if (reading.unresolved.length > 0) {
    console.warn(
      "[phi-runtime-modules] Stored Module selection names Modules this build cannot serve.",
      { area, unresolved: reading.unresolved },
    );
  }
  return reading.moduleIds;
}

export type PhiDeclaredMediaSpaces = {
  [Kind in PhiDeclarableMediaSpaceKind]?: { kinds: PhiMediaKindValue[] };
};

/** Declaration order, so an unchanged selection serializes byte-identically. */
const PHI_MEDIA_KIND_ORDER = Object.values(PhiMediaKind) as readonly PhiMediaKindValue[];

/**
 * Derives the Media Spaces an Area needs from the Modules it activates, and what may go in them.
 *
 * Availability is a capability, not a quota, and it belongs to the Modules that need it. This is the
 * only place the derivation happens: the result travels with the Area preset, and the control plane
 * materializes the Site-wide availability as the union across published Areas. Ordering follows the
 * declarable list rather than module order so an unchanged selection serializes byte-identically.
 *
 * Content kinds union the same way availability does, and for the same reason: two Modules sharing a
 * Space each need what they declared, so the Space holds both. A Space kind present with an empty
 * `kinds` is a Module that needs the Space without saying what for -- read as accepting nothing, which
 * is the safe reading of an omission and the one that makes a Module state its purpose.
 */
export function resolvePhiDeclaredMediaSpaces(
  moduleIds: readonly PhiRuntimeModuleId[],
  moduleDefinitions: readonly PhiRuntimeModuleDefinition[],
): PhiDeclaredMediaSpaces {
  const selected = new Set(moduleIds);
  const declared = new Map<PhiDeclarableMediaSpaceKind, Set<PhiMediaKindValue>>();
  for (const definition of moduleDefinitions) {
    if (!selected.has(definition.moduleId)) {
      continue;
    }
    for (const spaceKind of PHI_DECLARABLE_MEDIA_SPACE_KINDS) {
      const declaration = definition.mediaSpaces?.[spaceKind];
      if (!declaration) {
        continue;
      }
      const contentKinds = declared.get(spaceKind) ?? new Set<PhiMediaKindValue>();
      for (const contentKind of declaration.kinds) {
        contentKinds.add(contentKind);
      }
      declared.set(spaceKind, contentKinds);
    }
  }

  const resolved: PhiDeclaredMediaSpaces = {};
  for (const spaceKind of PHI_DECLARABLE_MEDIA_SPACE_KINDS) {
    const contentKinds = declared.get(spaceKind);
    if (!contentKinds) {
      continue;
    }
    resolved[spaceKind] = { kinds: PHI_MEDIA_KIND_ORDER.filter((kind) => contentKinds.has(kind)) };
  }
  return resolved;
}
