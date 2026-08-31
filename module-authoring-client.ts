"use client";

import {
  definePhiRuntimeModuleAuthoringClientContribution,
  type PhiRuntimeModuleAuthoringClientContribution,
} from "./plugins/runtime-modules/authoring-contributions-client";

/**
 * The Authoring contribution of a Module package, exported as `phiModuleAuthoringContributions`.
 *
 * Kept physically apart from the live Client contribution because Authoring implementations must not
 * leak into live Area graphs, which is the same separation MODULES.md requires of first-party Modules.
 */
export type PhiModuleAuthoringContributions = readonly PhiRuntimeModuleAuthoringClientContribution[];

export function definePhiModuleAuthoringContributions(
  contributions: PhiModuleAuthoringContributions,
): PhiModuleAuthoringContributions {
  return contributions.map((contribution) =>
    definePhiRuntimeModuleAuthoringClientContribution(contribution),
  );
}

export type { PhiRuntimeModuleAuthoringClientContribution };
