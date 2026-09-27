/**
 * The answers the Area settings carry that are not a Page.
 *
 * Their own file because three readers need them and only one of them runs in a browser: the Client
 * provider that fills the Selects, the Client controller that reads what was picked, and the form
 * descriptor, which is registered on the server. A `"use client"` module cannot be the source for the
 * third, and a second copy of a sentinel is a value that goes on matching until the day somebody
 * edits one of them.
 */

/**
 * Where the target Area's `/` goes, for the two answers that are not a Page.
 *
 * Everything else in that Select is a Page, and what a choice stores is the Page's reference, never
 * its path: a path is a fact about today's routing table and would rot the first time a Page moved or
 * a Module renamed its route.
 */
export const PHI_BUILDER_AREA_ROOT_ROUTE_AUTOMATIC = "phi-root-route:automatic" as const;
export const PHI_BUILDER_AREA_ROOT_ROUTE_LANDING = "phi-root-route:landing" as const;

/**
 * "Nobody -- I will author it myself", as a value the Select can carry.
 *
 * The state has always existed in storage as a landing without a target; what it never had was a way
 * to be said. A cleared Select is indistinguishable from one nobody has touched, so a Builder who
 * meant "none" was read as "never asked" and the single applicant on offer was adopted behind them.
 */
export const PHI_BUILDER_AREA_LANDING_PAGE_EMPTY = "phi-landing-page:empty" as const;
