"use client";

import type { PhiSiteModuleClientAreaContributions } from "./plugins/runtime-modules/site-modules-client";
import type { PhiRuntimeModuleCalendarAdapterClientDefinition } from "./types/cms-plugins";

/**
 * The live Client contribution of a Module package, exported as `phiModuleClientContribution`.
 *
 * The Areas are absent on purpose: a Module states its Areas once, in `eligibleAreas` on its definition,
 * and the generated projection distributes this contribution to exactly those. Calendar adapters are the
 * exception and are not distributed at all -- they are resolved by type wherever a Widget renders, and
 * no Area re-exports a different set.
 */
export type PhiModuleClientContribution = Omit<PhiSiteModuleClientAreaContributions, "authoring"> & {
  calendarAdapters?: readonly PhiRuntimeModuleCalendarAdapterClientDefinition[];
};

export function definePhiModuleClientContribution(
  contribution: PhiModuleClientContribution,
): PhiModuleClientContribution {
  return contribution;
}
