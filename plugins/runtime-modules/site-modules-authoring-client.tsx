"use client";

import type { PhiRuntimeModuleAuthoringClientContribution } from "./authoring-contributions-client";

/**
 * The Authoring half of a Site build's Client projection, and a file of its own on purpose.
 *
 * Authoring implementations must not reach a live Area graph -- `module-authoring-client.ts` states
 * that rule, and MODULES.md requires the same of first-party Modules. Keeping the type apart is not
 * what enforces it; keeping the *value* apart is. While one projection object carried both, every Area
 * host that imported it imported the Authoring contributions with it, and a bundler has to pack a value
 * it can reach whether or not anything reads it. Public paid for the Builder's table controls that way.
 *
 * So: two projections, two generated files, and only the Builder imports this one.
 */
export type PhiSiteModuleAuthoringContributions = {
  /** One per Module. No Area dimension -- the Builder wraps one around the canvas per active Module. */
  authoring: readonly PhiRuntimeModuleAuthoringClientContribution[];
};

/** A Site that installed no Modules of its own. */
export const PHI_NO_SITE_MODULE_AUTHORING_CONTRIBUTIONS: PhiSiteModuleAuthoringContributions = {
  authoring: [],
};
