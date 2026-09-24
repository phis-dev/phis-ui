import { peekPhiSiteReadCache, writePhiSiteReadCache } from "./site-read-cache";

/**
 * Where an Area's root sends whoever arrives at it -- remembered by the render that worked it out, so
 * that the proxy can answer the next one before Next's router is involved.
 *
 * **Why the proxy cannot work it out itself.** The destination is the Area's configured root route, or
 * failing that the first entry of its own Navigation, and both need that Area's compiled descriptor
 * catalog. Area catalogs are physically separate on purpose ([NEXT_INTEGRATION.md](../NEXT_INTEGRATION.md)):
 * a proxy that reached all six would merge Admin and Builder into every page's Client graph. So it does
 * not reach for them. It remembers an answer somebody else was already entitled to compute.
 *
 * **Why remembering is sound at all.** Because the destination stopped depending on who is asking
 * ([ACCESS.md](../ACCESS.md) section 5). An Area admits a viewer or it does not, and everyone it admits
 * gets the same root. Before that, one viewer's answer was worthless to the next and this file could not
 * exist.
 *
 * **Why it is worth doing.** A forward issued from inside the render reaches a client navigation as a
 * serialised redirect, and applying one across a change of Area leaves Next's router asking for the same
 * address at request speed -- 41 to 110 navigations, measured, never settling. The same forward as a real
 * HTTP 307 from the proxy costs one navigation, because it happens before there is a router state tree to
 * disagree with. The document path is unchanged at two requests either way.
 *
 * Cold, this knows nothing and the render answers as it always did. It is an accelerator, never a source
 * of truth, and nothing may become correct only because it is warm.
 */

/**
 * Long, because the TTL is not what keeps this honest.
 *
 * The shared cache's minute is there for values whose staleness nothing else would notice. A door is not
 * one of them: it is derived from published state alone, and any publish moves the Site's read marker,
 * which sweeps this entry out of every process within seconds of the next config refresh
 * (gateway/site-config.ts). So the expiry here is a backstop against a process that somehow stops
 * refreshing, not the mechanism -- and a minute would only mean the first cross-Area click after every
 * quiet minute pays the render again.
 */
const PHI_AREA_ROOT_DOOR_TTL_MS = 1_800_000;

function doorKey(area: string) {
  return `area-root-door:${area.trim().toLowerCase()}`;
}

/**
 * Remember a door, having checked that it is one.
 *
 * What is checked here is the door: a Site-relative path that is not the Area root itself, because a door
 * onto the address the request already names is the loop the forward's own guard exists to prevent.
 *
 * What is *not* checked here is the occasion. Two callers have one -- the render that forwarded, and the
 * warm-up that worked the door out without being asked -- and each knows something about its own
 * situation that this cannot: the forwarding Layout runs for every request in its Area and must establish
 * that this one really was the root. That belongs at the call site, not in here.
 */
export function rememberPhiAreaRootDoor(area: string, href: string) {
  const normalizedArea = area.trim().toLowerCase();
  if (!href.startsWith("/")) {
    return;
  }
  if (href.replace(/\/+$/u, "").toLowerCase() === `/${normalizedArea}`) {
    return;
  }
  writePhiSiteReadCache(doorKey(normalizedArea), href, PHI_AREA_ROOT_DOOR_TTL_MS);
}

/** The remembered destination, or nothing -- in which case the render answers as before. */
export async function peekPhiAreaRootDoor(area: string): Promise<string | null> {
  const remembered = peekPhiSiteReadCache<string>(doorKey(area));
  return remembered ? await remembered : null;
}
