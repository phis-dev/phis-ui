import type { PhiCmsAreaKey } from "../constants/cms-areas";

/**
 * Whether a Module's routes keep the rule that a Page is never a folder (THIRD_PARTY_MODULES.md,
 * "Addresses and folders"; phis-server REFERENCES.md, "A Page is never a folder").
 *
 * A route whose path lies beneath another route's path in the same Area makes the upper one a Page and
 * a folder at once: the Builder lists it twice -- the Page, and a folder of the same name beside it --
 * and a Navigation container of the lower Pages gets a folder address that the upper Page shadows. An
 * overview belongs beside the Pages it leads to (`/faq/overview` next to `/faq/hosting`), and the
 * container's `folderTarget` sends `/faq` to it.
 *
 * One nesting is allowed: a list's entries directly beneath the list, `/blog` and `/blog/:slug`. The
 * entries are not Pages of their own in a Navigation -- one route answers every entry -- so no
 * container is built of them and no folder address is shadowed. Anything further down is a Page beneath
 * a Page again: `/blog/:slug/edit` beneath `/blog`, `/blog/archive` beside `/blog/:slug`.
 *
 * Compared by segment, a parameter by its name like any other segment: `/shop/:slug` and `/shop/cart`
 * are siblings. `/` is the Area's root slot and no folder.
 *
 * Verify-time only, from `@phis/ui/module/page-check`: a package runs it over its own routes, and
 * phis-ui over the first-party ones. The Site's own Pages are refused by phis-server when written.
 */

export type PhiRouteAddressSubject = {
  area: PhiCmsAreaKey;
  path: string;
  presetKey: string;
};

export type PhiRouteAddressFinding = {
  /** The route beneath, by its preset key. */
  route: string;
  /** The route above it, which would be a Page and a folder at once. */
  above: string;
  message: string;
};

function segments(path: string) {
  return path.split("/").filter(Boolean);
}

export function checkPhiRouteAddresses(routes: readonly PhiRouteAddressSubject[]): PhiRouteAddressFinding[] {
  const findings: PhiRouteAddressFinding[] = [];
  for (const route of routes) {
    const own = segments(route.path);
    for (const other of routes) {
      if (other === route || other.area !== route.area) continue;
      const upper = segments(other.path);
      if (upper.length === 0 || upper.length >= own.length) continue;
      if (!upper.every((segment, index) => segment === own[index])) continue;
      // A list's entries, one parameter directly beneath it.
      if (own.length === upper.length + 1 && own[own.length - 1]!.startsWith(":")) continue;
      findings.push({
        route: route.presetKey,
        above: other.presetKey,
        message: `"${route.path}" lies beneath "${other.path}" (${other.presetKey}) in Area "${route.area}": `
          + "a Page is never a folder. Put the upper Page beside the others and name it the container's folderTarget.",
      });
    }
  }
  return findings;
}
