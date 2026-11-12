import type {
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PhiCmsFlags } from "../../../constants/phi-cms";
import { PHI_SEARCH_PAGE_PRESET_KEYS, PHI_SEARCH_RUNTIME_MODULE_ID } from "./ids";

/**
 * The results Pages (SEARCH.md), one per Area the Module serves, the same tree in both: the box and the
 * results. Which Areas are searched is decided by where the results Widget stands -- on the App's Page
 * the App and Public, on the Public one Public -- not written into the tree.
 *
 * No menu entry -- nobody browses to a results Page -- and `NoIndex`, so neither a crawler nor the Site's
 * own index lists a Page whose words are whatever was last searched.
 */
function defineSearchPageRoute(area: "public" | "app") {
  const presetKey = PHI_SEARCH_PAGE_PRESET_KEYS[area];
  return {
    ownerModuleId: PHI_SEARCH_RUNTIME_MODULE_ID,
    presetKey,
    presetVersion: 1,
    area,
    title: "Search",
    path: "/search",
    navigation: [],
    defaultPageFlags: PhiCmsFlags.NoIndex,
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("./page-tree")
        .then((module) => module.buildPhiDefaultSearchPageTree({
          page,
          ownerModuleId: PHI_SEARCH_RUNTIME_MODULE_ID,
          presetKey,
        })),
  } satisfies PhiCmsRoutePresetDescriptor;
}

export const PHI_SEARCH_RUNTIME_MODULE_ROUTES = [
  defineSearchPageRoute("public"),
  defineSearchPageRoute("app"),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
