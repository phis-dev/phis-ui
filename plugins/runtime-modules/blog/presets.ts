import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import type {
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { PHI_BLOG_FORM_IDS, PHI_BLOG_PRESET_KEYS, PHI_BLOG_RUNTIME_MODULE_ID } from "./ids";

/**
 * Blog's three Pages, each built by the shared content-entry builders (`CONTENT_ENTRIES.md`).
 *
 * Nothing is seeded: the Pages and their navigation entries are computed per request from the compiled
 * catalog once the Module is active for the Area. A Site may rename, reorder or tombstone the header
 * entry through the navigation overlay, and may not hide it -- which is the rule that keeps a Module's
 * address reachable.
 *
 * Indexable, unlike the auth Pages: a Site's blog is exactly the kind of page a search engine should
 * find, so no `NoIndex` flag is set.
 */
export const PHI_BLOG_RUNTIME_MODULE_ROUTES = [
  {
    ownerModuleId: PHI_BLOG_RUNTIME_MODULE_ID,
    presetKey: PHI_BLOG_PRESET_KEYS.list,
    presetVersion: 1,
    area: "public" as const,
    title: "Blog",
    path: "/blog",
    navigation: [{
      // Unanchored: the Public header exports no base item, so the entry lands at the end of the surface.
      navKey: "public:header" as const,
      parentItemKey: null,
      item: {
        itemKey: "@phis/ui/modules/blog/nav/public/blog",
        label: { defaultMessage: "Blog" },
        icon: "antd:file-text",
        routePresetKey: PHI_BLOG_PRESET_KEYS.list,
      },
    }],
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("../../../components/regions/presets/content-entry-public-page-trees")
        .then((module) => module.buildPhiContentEntryListPageTree({
          page,
          kind: "blog",
          ownerModuleId: PHI_BLOG_RUNTIME_MODULE_ID,
          presetKey: PHI_BLOG_PRESET_KEYS.list,
          detailPresetKey: PHI_BLOG_PRESET_KEYS.detail,
          heading: "Blog",
        })),
  },
  /*
   * One post by its address. No navigation entry: it is reached from the list, and a slug that names no
   * published post answers 404.
   */
  {
    ownerModuleId: PHI_BLOG_RUNTIME_MODULE_ID,
    presetKey: PHI_BLOG_PRESET_KEYS.detail,
    presetVersion: 1,
    area: "public" as const,
    title: "Blog post",
    path: "/blog/:slug",
    loadTree: ({ page, runtime, params }) =>
      import("../../../components/regions/presets/content-entry-public-page-trees")
        .then((module) => module.buildPhiContentEntryDetailPageTree({
          page,
          runtime,
          params,
          kind: "blog",
          ownerModuleId: PHI_BLOG_RUNTIME_MODULE_ID,
          presetKey: PHI_BLOG_PRESET_KEYS.detail,
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
    ownerModuleId: PHI_BLOG_RUNTIME_MODULE_ID,
    presetKey: PHI_BLOG_PRESET_KEYS.editor,
    title: "Blog",
    path: "/blog",
    itemKey: "@phis/ui/modules/blog/nav/editor/blog",
    icon: "antd:file-text",
    loadTree: async ({ page, runtime }) => {
      const [{ buildPhiContentEntryEditorPageTree }, { getPhiBlogKindLabels }] = await Promise.all([
        import("../../../components/regions/presets/content-entry-editor-page-tree"),
        import("./labels"),
      ]);
      const credentials = readPhiServerApiCredentials();
      return buildPhiContentEntryEditorPageTree({
        page,
        runtime,
        kind: "blog",
        ownerModuleId: PHI_BLOG_RUNTIME_MODULE_ID,
        presetKey: PHI_BLOG_PRESET_KEYS.editor,
        formIds: PHI_BLOG_FORM_IDS,
        kindLabels: await getPhiBlogKindLabels({
          apiBaseUrl: credentials.apiBaseUrl,
          internalToken: credentials.internalToken,
          locale: runtime.locale.current,
        }),
      });
    },
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
