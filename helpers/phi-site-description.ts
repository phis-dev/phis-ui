/**
 * What the head says of a Site that has said nothing: neither the Page's description nor the Theme's
 * slogan. Worded as the placeholder it is, so a link shared before anybody replaced it tells the operator
 * where to.
 *
 * A file of its own, apart from `phi-metadata.ts`, because the Theme workspace's link card shows the same
 * words in the browser and the head builder would bring the whole route metadata along with them.
 */
export const PHI_DEFAULT_SITE_DESCRIPTION =
  "Default description of the phis starter. Set your own in the Page meta or as the Theme's slogan.";

/** The Site's description: the Theme's slogan, else the starter's placeholder. */
export function resolvePhiSiteDescription(slogan: string | null | undefined) {
  return slogan?.trim() || PHI_DEFAULT_SITE_DESCRIPTION;
}
