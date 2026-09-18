import "server-only";

import { PHI_CMS_AREA_KEYS, type PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";

/**
 * The Bridge of one Area, loaded rather than imported.
 *
 * A Bridge carries its Area's server catalog, and that catalog names the Area's Widget plugins, so a
 * static import of six of them puts every Area's Builder and Admin Clients into whatever graph reaches
 * the importer. The Site's `/api/site` door is exactly such a place: it answers every request to Core
 * and learns from the path whether any Bridge is wanted at all, which for nearly every request it is
 * not. An Area this Site does not host answers null, and the caller refuses rather than guessing.
 *
 * It is the one thing a Site injects besides its proxy settings, because it is the one thing only the
 * Site knows: which Modules it was built with. Everything decided from it is decided here.
 */
export type PhiSiteAreaBridgeLoader = (area: PhiCmsAreaKey) => Promise<PhiCmsSiteBridge | null>;

/**
 * Every Area this Site hosts, for the one caller that has to look at all of them at once.
 *
 * Diagnostics reports per Area, so it has no Area to be told. It pays the whole graph for it -- an
 * operator's check, run after an update and not per request.
 */
export async function loadPhiSiteAreaBridges(load: PhiSiteAreaBridgeLoader) {
  const loaded = await Promise.all(
    PHI_CMS_AREA_KEYS.map(async (area) => [area, await load(area)] as const),
  );
  return loaded.filter(
    (entry): entry is readonly [PhiCmsAreaKey, PhiCmsSiteBridge] => entry[1] !== null,
  );
}
