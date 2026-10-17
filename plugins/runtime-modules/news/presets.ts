import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import type {
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { PhiContentEntryPart } from "../../../constants/content-entry-parts";
import { PHI_NEWS_FORM_IDS, PHI_NEWS_PRESET_KEYS, PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

/**
 * News's three Pages, each built by the shared content-entry builders (`CONTENT_ENTRIES.md`).
 *
 * Nothing is seeded: the Pages and their navigation entries are computed per request from the compiled
 * catalog once the Module is active for the Area. A Site may rename, reorder or tombstone the header
 * entry through the navigation overlay, and may not hide it -- which is the rule that keeps a Module's
 * address reachable.
 *
 * Indexable, unlike the auth Pages: a Site's news is exactly the kind of page a search engine should
 * find, so no `NoIndex` flag is set.
 */
export const PHI_NEWS_RUNTIME_MODULE_ROUTES = [
  {
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    presetKey: PHI_NEWS_PRESET_KEYS.list,
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
        icon: "antd:read",
        routePresetKey: PHI_NEWS_PRESET_KEYS.list,
      },
    }],
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("../../../components/regions/presets/content-entry-public-page-trees")
        .then((module) => module.buildPhiContentEntryListPageTree({
          page,
          kind: "news",
          ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
          presetKey: PHI_NEWS_PRESET_KEYS.list,
          detailPresetKey: PHI_NEWS_PRESET_KEYS.detail,
          heading: "News",
          presentation: "stack",
        })),
  },
  /*
   * One entry by its address. No navigation entry: it is reached from the list, and a slug that names no
   * published entry answers 404.
   */
  {
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    presetKey: PHI_NEWS_PRESET_KEYS.detail,
    presetVersion: 1,
    area: "public" as const,
    title: "News entry",
    path: "/news/:slug",
    loadTree: ({ page, runtime, params }) =>
      import("../../../components/regions/presets/content-entry-public-page-trees")
        .then((module) => module.buildPhiContentEntryDetailPageTree({
          page,
          runtime,
          params,
          kind: "news",
          ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
          presetKey: PHI_NEWS_PRESET_KEYS.detail,
          headerParts: PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle | PhiContentEntryPart.Date,
          related: { presentation: "compact", title: "More news" },
        })),
  },
  /*
   * Where the entries are written, contributed by this Module rather than by the Area.
   *
   * `anchor: "main"` rather than a parent item key: the sidebar exports roles, not items, and naming
   * another Module's entry would make this one depend on it being there.
   */
  buildPhiSidebarRoutePresetDescriptor({
    area: "editor",
    anchor: "main",
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    presetKey: PHI_NEWS_PRESET_KEYS.editor,
    title: "News",
    path: "/news",
    itemKey: "@phis/ui/modules/news/nav/editor/news",
    icon: "antd:read",
    loadTree: async ({ page, runtime }) => {
      const [{ buildPhiContentEntryEditorPageTree }, { getPhiNewsKindLabels }] = await Promise.all([
        import("../../../components/regions/presets/content-entry-editor-page-tree"),
        import("./labels"),
      ]);
      const credentials = readPhiServerApiCredentials();
      return buildPhiContentEntryEditorPageTree({
        page,
        runtime,
        kind: "news",
        ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
        presetKey: PHI_NEWS_PRESET_KEYS.editor,
        formIds: PHI_NEWS_FORM_IDS,
        kindLabels: await getPhiNewsKindLabels({
          apiBaseUrl: credentials.apiBaseUrl,
          internalToken: credentials.internalToken,
          locale: runtime.locale.current,
        }),
      });
    },
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
