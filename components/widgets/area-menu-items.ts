import { resolvePhiCmsAreaLabel } from "../../constants/cms-areas";
import { PHI_ALL_RUNTIME_AREA_DEFINITIONS } from "../../plugins/runtime-modules/area-definitions";
import { canPhiViewerAccess, type PhiAccessViewer } from "../../types/access";
import type { PhiAreaMenuItem } from "../../plugins/runtime-modules/core/widgets/area-menu/client";

/**
 * The Area menu asks the same question the Area routing asks, with the same tool: every declared
 * Area, filtered by `canPhiViewerAccess` against its own `accessPolicy`.
 *
 * It must not re-derive visibility from base roles. That answered the question a second way and
 * disagreed with the policies — a Developer holds `Structure authoring`, `Content editing` and
 * `Accounting`, yet saw neither Builder nor Editor nor Accounting. And it must not consult
 * `viewer.resolvedArea`, which ACCESS.md defines as a landing destination, not an authorization
 * boundary; in the old menu it papered over the incomplete role check for one Area per viewer.
 *
 * Public is the Area a viewer is already in rather than one to switch to, so it is not listed. The
 * order follows the Area declarations, the one source this list has.
 */
export function buildPhiVisibleAreaMenuItems(viewer: PhiAccessViewer): PhiAreaMenuItem[] {
  return PHI_ALL_RUNTIME_AREA_DEFINITIONS
    .filter((definition) => definition.area !== "public")
    .filter((definition) => canPhiViewerAccess(viewer, definition.accessPolicy))
    .map((definition) => ({
      key: definition.area,
      label: resolvePhiCmsAreaLabel(definition.area),
      href: `/${definition.area}`,
    }));
}
