import type { PhiCmsNavigationInjectionDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_AVATAR_OVERLAY_IDS } from "../../../components/runtime/avatar-overlay-ids";
import { PHI_APP_ACCOUNT_NAV_ITEM_KEY } from "../area-definitions";

/**
 * The Avatar Module's one entry in the App account menu.
 *
 * It has no route and no page: choosing a picture is a small task, so the entry opens the Module's own
 * Area-owned Overlay in place. The item is placed under the Area's exported account anchor, which is
 * the only place a Module may attach -- the shape of the menu stays the Area's decision.
 *
 * Contributed rather than placed in a preset. A preset belongs to whoever owns the page, and the App
 * account menu is not the Avatar Module's to author; what it may do is ask for one entry in it.
 */
export const PHI_AVATAR_RUNTIME_MODULE_NAVIGATION = [{
  navKey: "app:account",
  parentItemKey: PHI_APP_ACCOUNT_NAV_ITEM_KEY,
  item: {
    itemKey: "@phis/ui/modules/avatar/nav/app/picture",
    label: { defaultMessage: "Change picture" },
    icon: "antd:picture",
    overlayPresetKey: PHI_AVATAR_OVERLAY_IDS.presetKey,
    overlayNodeKey: "overlayPicker",
  },
}] satisfies readonly PhiCmsNavigationInjectionDescriptor[];
