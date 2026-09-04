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
