import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import type {
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PHI_EDITOR_NEWS_PAGE_PRESET_KEY, PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

const PHI_NEWS_PAGE_PRESET_KEY = "public-news-page";

/**
 * One address, and the header entry that leads to it.
 *
 * Nothing is seeded: the entry is computed per request from the compiled catalog once the Module is active
 * for the Area, the same way `/register` gets its own. A Site may rename, reorder or tombstone it through
 * the navigation overlay, and may not hide it -- which is the rule that keeps a Module's address
 * reachable.
 *
 * No `/news/<slug>` in this version. A whole-segment parameter is permitted
 * ([MODULES.md](../../../MODULES.md)) and the slug is already on the row, so a detail address later costs
 * a descriptor and no change to any data.
 *
 * Indexable, unlike the auth Pages beside it: a Site's news is exactly the kind of page a search engine
 * should find, so no `NoIndex` flag is set.
 */
export const PHI_NEWS_RUNTIME_MODULE_ROUTES = [
  {
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    presetKey: PHI_NEWS_PAGE_PRESET_KEY,
    presetVersion: 1,
    area: "public" as const,
    title: "News",
    path: "/news",
    navigation: [{
      // Unanchored: the Public header exports no base item, so the entry lands at the end of the surface.
      navKey: "public:header" as const,
      parentItemKey: null,
      item: {
        itemKey: "@phis/ui/modules/news/nav/public/news",
        label: { defaultMessage: "News" },
        icon: "antd:notification",
        routePresetKey: PHI_NEWS_PAGE_PRESET_KEY,
      },
    }],
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("./trees/phi-default-pub-news-page-tree")
        .then((module) => module.buildPhiDefaultPubNewsPageTree({ page })),
  },
  /*
   * Where the entries are written, contributed by this Module rather than by the Area.
   *
   * The Page, its address, its name in the sidebar and the Table's own logic are all this Module's, which
   * is what a Module is: switch it off and the Page and its entry go with it, because both are computed
   * per request from the compiled catalog. Nothing of it sits in the Editor Area's own definition, so a
   * Module outside this package contributes an editing surface exactly the same way.
   *
   * `anchor: "main"` rather than a parent item key: the sidebar exports roles, not items, and naming
   * another Module's entry would make this one depend on it being there.
   */
  {
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area: "editor" as const,
    title: "News",
    path: "/news",
    navigation: [{
      navKey: "editor:sidebar" as const,
      anchor: "main" as const,
      item: {
        itemKey: "@phis/ui/modules/news/nav/editor/news",
        label: { defaultMessage: "News" },
        icon: "antd:notification",
        routePresetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
      },
    }],
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("./trees/phi-default-editor-news-page-tree")
        .then((module) => module.buildPhiDefaultEditorNewsPageTree({ page, runtime })),
  },
] as const satisfies readonly PhiCmsRoutePresetDescriptor[];
