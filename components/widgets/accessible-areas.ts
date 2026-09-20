import type { PhiCmsAreaKey } from "../../constants/cms-areas";
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

/** What each Area is called in the reader's language; Public has no entry, so it has no name here. */
export type PhiAccountAreaLabels = Readonly<Record<Exclude<PhiCmsAreaKey, "public">, string>>;

/**
 * The same list in the account menu, which is the one menu that stands in every Area.
 *
 * It is here rather than in a navigation surface because there is nothing to resolve: an Area's address
 * is its own segment, the list is the same everywhere, and which entries it has is a property of the
 * person rather than of the Page.
 *
 * Public is left out. It is the one Area nobody needs a way to reach from here: signing out lands
 * there, and it is where a visitor who never signed in already is. Listing it put the Site beside the
 * staff Areas as though it were one of them, in a menu whose subject is where this person may work.
 *
 * The labels are passed in rather than read from `constants/cms-areas`, where they are English
 * constants a translator never sees. This menu stands in every Area and is read by people who did not
 * choose the interface language.
 *
 * Since the account Pages are App's and are entries of `app:account` alone, this list is also how
 * somebody standing in the Admin reaches their own profile: one step, named for what it is.
 */
export function buildPhiAccountAreaEntries({
  viewer,
  currentArea,
  locale,
  labels,
}: {
  viewer: PhiAccessViewer;
  currentArea: PhiCmsAreaKey;
  locale: string;
  labels: PhiAccountAreaLabels;
}): PhiAccountAreaEntry[] {
  return listPhiAccessibleAreas(viewer)
    .filter((area): area is Exclude<PhiCmsAreaKey, "public"> => area !== "public")
    .map((area) => ({
      area,
      label: labels[area],
      // An Area root forwards to wherever this viewer lands.
      href: localizeAreaPath(locale, area, "/"),
      current: area === currentArea,
    }));
}
