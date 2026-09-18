/**
 * Rows a Module needs a Site to have, as this package reads them.
 *
 * Nothing here is defined here, as with `threads.ts`: each row kind's shape lives with the contract that
 * owns the table, because two ends read it -- the Module that declares it and the control plane that
 * writes it. What this file adds is the boundary, so a Module's `seed` and the materialization cannot
 * come to mean different things by the same word.
 *
 * A seed is not availability, and does not behave like `mediaSpaces` or `threadKinds`. Those are a union
 * across the Modules of every published Area, recomputed on every publish and safe to recompute because
 * nothing is lost by narrowing them. These are rows with identity that other rows point at: they are
 * found by their key, created when absent, never rewritten once they exist, and never deleted. A Module
 * that stops being published stops offering its surfaces and leaves its rows where they are.
 */

export type {
  PhisDeclaredSiteGroup,
} from "@phis/contracts/site-groups";
import type { PhisDeclaredSiteGroup } from "@phis/contracts/site-groups";
import type {
  PhisDeclaredSupportQueue,
  PhisDeclaredSupportTicketType,
} from "@phis/contracts/support";

export type {
  PhisDeclaredSupportQueue,
  PhisDeclaredSupportTicketType,
} from "@phis/contracts/support";

/**
 * One Module's seed, as the Area preset carries it and the control plane reads it.
 *
 * The Module id travels with the rows rather than being resolved away, because a group records who
 * asked for it: `site_groups.provider_id` is the declaring Module, and it is supplied from here so that
 * a Module cannot name itself into somebody else's group. Keeping the lists per Module is also what
 * keeps `groupKey` meaningful -- a key is the Module's own, and two Modules may use the same one.
 */
export type PhiDeclaredModuleSeed = {
  moduleId: string;
  groups?: readonly PhisDeclaredSiteGroup[];
  supportQueues?: readonly PhisDeclaredSupportQueue[];
  supportTicketTypes?: readonly PhisDeclaredSupportTicketType[];
};
