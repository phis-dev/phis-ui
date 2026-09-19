import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { resolvePhiCmsAreaLabel } from "../../constants/cms-areas";
import { localizeAreaPath } from "../../helpers/locale";
import { PHI_ALL_RUNTIME_AREA_DEFINITIONS } from "../../plugins/runtime-modules/area-definitions";
import { canPhiViewerAccess, type PhiAccessViewer } from "../../types/access";
import type { PhiAccountAreaEntry } from "../shell/shell-types";

/**
 * Which Areas this person may enter, asked the same way the Area routing asks it: every declared Area,
 * filtered by `canPhiViewerAccess` against its own `accessPolicy`.
 *
 * It must not re-derive visibility from base roles. That answered the question a second way and
 * disagreed with the policies — a Developer holds `Structure authoring`, `Content editing` and
 * `Accounting`, yet saw neither Builder nor Editor nor Accounting. And it must not consult
 * `viewer.resolvedArea`, which ACCESS.md defines as a landing destination, not an authorization
 * boundary; in the old menu it papered over the incomplete role check for one Area per viewer.
 *
 * The order follows the Area declarations, the one source this list has.
 */
export function listPhiAccessibleAreas(viewer: PhiAccessViewer): readonly PhiCmsAreaKey[] {
  return PHI_ALL_RUNTIME_AREA_DEFINITIONS
    .filter((definition) => canPhiViewerAccess(viewer, definition.accessPolicy))
    .map((definition) => definition.area);
}

/**
 * The same list in the account menu, which is the one menu that stands in every Area.
 *
 * It is here rather than in a navigation surface because there is nothing to resolve: an Area's address
 * is its own segment, the list is the same everywhere, and which entries it has is a property of the
 * person rather than of the Page. Public is included -- from a staff shell it is the way back to the
 * Site, and it is the Area a signed-in person is most likely to want next.
 *
 * Since the account Pages are App's and are entries of `app:account` alone, this list is also how
 * somebody standing in the Admin reaches their own profile: one step, named for what it is.
 */
export function buildPhiAccountAreaEntries({
  viewer,
  currentArea,
  locale,
}: {
  viewer: PhiAccessViewer;
  currentArea: PhiCmsAreaKey;
  locale: string;
}): PhiAccountAreaEntry[] {
  return listPhiAccessibleAreas(viewer).map((area) => ({
    area,
    label: resolvePhiCmsAreaLabel(area),
    // An Area root forwards to wherever this viewer lands; only Public carries the locale in its path.
    href: localizeAreaPath(locale, area, "/"),
    current: area === currentArea,
  }));
}
