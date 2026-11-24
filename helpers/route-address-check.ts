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
 * From `@phis/ui/module/page-check`: a package runs it over its own routes, and phis-ui over the
 * first-party ones. `refusePhiCatalogRouteAddresses` is the same rule over a compiled catalog, every
 * installed package's routes together, for the descriptor compiler to refuse a package that breaks it
 * (not wired into compiling yet: `@phis/dev` still breaks it, TODOS.md). The addresses a Site assigns on
 * Public are held to it in the Builder (`findPhiPublicRoutePathCollisions`). The Site's own Pages are
 * refused by phis-server when written.
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

/**
 * Whether `lowerPath` lies beneath `upperPath` so that the upper one would be a Page and a folder at once:
 * by segment, `/` never above anything, a list's entries -- one parameter directly beneath -- excepted.
 */
export function isPhiRouteAddressBeneath(upperPath: string, lowerPath: string): boolean {
  const upper = segments(upperPath);
  const own = segments(lowerPath);
  if (upper.length === 0 || upper.length >= own.length) return false;
  if (!upper.every((segment, index) => segment === own[index])) return false;
  // A list's entries, one parameter directly beneath it.
  return !(own.length === upper.length + 1 && own[own.length - 1]!.startsWith(":"));
}

export function checkPhiRouteAddresses(routes: readonly PhiRouteAddressSubject[]): PhiRouteAddressFinding[] {
  const findings: PhiRouteAddressFinding[] = [];
  for (const route of routes) {
    for (const other of routes) {
      if (other === route || other.area !== route.area) continue;
      if (!isPhiRouteAddressBeneath(other.path, route.path)) continue;
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

/** Every route of a compiled catalog as the rule reads it, Area by Area. */
export function listPhiCatalogRouteAddressSubjects(
  routesByArea: ReadonlyMap<PhiCmsAreaKey, readonly { descriptor: PhiRouteAddressSubject }[]>,
): PhiRouteAddressSubject[] {
  return [...routesByArea.values()].flatMap((routes) =>
    routes.map(({ descriptor }) => ({ area: descriptor.area, path: descriptor.path, presetKey: descriptor.presetKey })));
}

/**
 * The rule over a compiled catalog, as compiling it would refuse it: throws naming every route that lies
 * beneath another of its Area, whichever packages the two come from.
 */
export function refusePhiCatalogRouteAddresses(
  routesByArea: ReadonlyMap<PhiCmsAreaKey, readonly { descriptor: PhiRouteAddressSubject }[]>,
): void {
  const findings = checkPhiRouteAddresses(listPhiCatalogRouteAddressSubjects(routesByArea));
  if (findings.length > 0) {
    throw new Error(`Module routes break the address rule:\n- ${findings.map((finding) => finding.message).join("\n- ")}`);
  }
}
