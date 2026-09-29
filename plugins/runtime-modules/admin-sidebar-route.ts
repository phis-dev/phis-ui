import type {
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../components/regions/presets/phi-base-page-layout";
import { PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../types/access";
import { PHI_ADMIN_SETTINGS_NAV_ITEM_KEY } from "./area-definitions";

/**
 * An Admin Page a Module contributes together with its entry in the Admin sidebar.
 *
 * Two placements, and they differ in more than the parent. A `sidebar` Page is a root entry placed
 * before Settings, and the route's own access policy decides who reaches it. A `settings` Page is
 * mounted under the Settings route and its entry is shown to Site administrators only, because Site
 * configuration is theirs whatever the Page itself admits.
 *
 * The entry's label is the Page's title, and it names the route by its preset key.
 */
export function buildPhiAdminSidebarRoutePresetDescriptor({
  ownerModuleId,
  presetKey,
  title,
  path,
  placement,
  itemKey,
  icon,
  loadTree,
}: {
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  title: string;
  path: string;
  placement: "sidebar" | "settings";
  itemKey: string;
  icon: string;
  loadTree: PhiCmsRoutePresetDescriptor["loadTree"];
}): PhiCmsRoutePresetDescriptor {
  const settings = placement === "settings";
  return {
    ownerModuleId,
    presetKey,
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area: "admin",
    title,
    path,
    ...(settings ? { mount: { mountKey: "settings" as const } } : {}),
    navigation: [{
      navKey: "admin:sidebar",
      parentItemKey: settings ? PHI_ADMIN_SETTINGS_NAV_ITEM_KEY : null,
      ...(settings ? {} : { before: PHI_ADMIN_SETTINGS_NAV_ITEM_KEY }),
      item: {
        itemKey,
        ...(settings ? { accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN } : {}),
        label: { defaultMessage: title },
        icon,
        routePresetKey: presetKey,
      },
    }],
    loadTree,
  };
}
