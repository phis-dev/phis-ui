import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type {
  PhiCmsNavigationAnchor,
  PhiCmsNavigationInjectionDescriptor,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../components/regions/presets/phi-base-page-layout";
import {
  PHI_BUILDER_PAGE_PRESET_VERSION,
} from "../../components/regions/presets/phi-builder-page-preset-version";
import { PHI_VIEWER_ACCESS_SITE_ADMIN, type PhiViewerAccessPolicy } from "../../types/access";
import { resolvePhiAreaRootRouteNavKey } from "./area-root-route";

type PhiSidebarAreaRouteDefaults = {
  /**
   * The `presetVersion` of a Page built on the Area's own page tree: the Builder's workspace tree in
   * the Builder, the base page layout everywhere else. A route whose tree is not the Area's -- the
   * Dashboard is the base layout in every Area, the Builder's included -- states its own.
   */
  presetVersion: number;
  /**
   * Who is shown an entry under the Area's Settings container, whatever the Page itself admits.
   *
   * Admin Settings configure the Site for everybody, so their entries are Site administrators' only
   * (ACCESS.md). App Settings are what one person settles for themselves and hide from nobody.
   */
  settingsAccessPolicy?: PhiViewerAccessPolicy;
};

/**
 * What a sidebar Page differs by from one Area to the next, stated once per Area.
 *
 * Where each anchor is lives in the Area definition (`area-definitions.ts`); this is only what the
 * route beside the entry needs. Public is absent because it has no sidebar.
 */
const PHI_SIDEBAR_AREA_ROUTE_DEFAULTS = {
  app: { presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION },
  accounting: { presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION },
  admin: {
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    settingsAccessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN,
  },
  editor: { presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION },
  builder: { presetVersion: 1 + PHI_BUILDER_PAGE_PRESET_VERSION },
} as const satisfies Record<Exclude<PhiCmsAreaKey, "public">, PhiSidebarAreaRouteDefaults>;

export type PhiSidebarAreaKey = keyof typeof PHI_SIDEBAR_AREA_ROUTE_DEFAULTS;

/**
 * A Page a Module contributes together with its entry in an Area sidebar.
 *
 * The entry is placed by role, never by somebody else's item key: `start`, `main`, `settings` or `end`,
 * and the Area decides where that is. `settings` also mounts the route in the Area's Settings mount,
 * as every Settings Page does, and takes the Area's policy for who sees Settings entries.
 *
 * The entry's label is the Page's title, and it names the route by its preset key. Further entries for
 * the same Page -- one in the account menu, say -- follow it unchanged.
 */
export function buildPhiSidebarRoutePresetDescriptor({
  area,
  anchor,
  ownerModuleId,
  presetKey,
  presetVersion,
  title,
  path,
  itemKey,
  icon,
  loadTree,
  navigation = [],
}: {
  area: PhiSidebarAreaKey;
  anchor: PhiCmsNavigationAnchor;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  /** Only where the Page is not built on the Area's own page tree; see the Area table. */
  presetVersion?: number;
  title: string;
  path: string;
  itemKey: string;
  icon: string;
  loadTree: PhiCmsRoutePresetDescriptor["loadTree"];
  navigation?: readonly PhiCmsNavigationInjectionDescriptor[];
}): PhiCmsRoutePresetDescriptor {
  const defaults: PhiSidebarAreaRouteDefaults = PHI_SIDEBAR_AREA_ROUTE_DEFAULTS[area];
  const settings = anchor === "settings";
  const accessPolicy = settings ? defaults.settingsAccessPolicy : undefined;
  return {
    ownerModuleId,
    presetKey,
    presetVersion: presetVersion ?? defaults.presetVersion,
    area,
    title,
    path,
    ...(settings ? { mount: { mountKey: "settings" as const } } : {}),
    navigation: [{
      navKey: resolvePhiAreaRootRouteNavKey(area),
      anchor,
      item: {
        itemKey,
        ...(accessPolicy ? { accessPolicy } : {}),
        label: { defaultMessage: title },
        icon,
        routePresetKey: presetKey,
      },
    }, ...navigation],
    loadTree,
  };
}
