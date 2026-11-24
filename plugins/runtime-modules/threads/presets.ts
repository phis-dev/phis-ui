import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor, type PhiSidebarAreaKey } from "../sidebar-route";
import { getPhiThreadsPagePresetKey } from "./addresses";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

/**
 * One conversations Page per Area with a sidebar, at the same path in each.
 *
 * Conversations are how people on a Site talk to each other, so they are wherever those people are
 * standing rather than only in the App. Public has no sidebar and no Page; the Module is still eligible
 * there, for a Site that places its Widgets itself.
 *
 * Every one is a base page layout, the Builder's included, so every one states that version rather than
 * the one its Area's own pages are built on.
 */
const PHI_THREADS_PAGE_AREAS = [
  "app",
  "accounting",
  "admin",
  "editor",
  "builder",
] as const satisfies readonly PhiSidebarAreaKey[];

export const PHI_THREADS_RUNTIME_MODULE_ROUTES = PHI_THREADS_PAGE_AREAS.map((area) =>
  buildPhiSidebarRoutePresetDescriptor({
    area,
    anchor: "main",
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    presetKey: getPhiThreadsPagePresetKey(area),
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    title: "Conversations",
    // Anyone the Area admits. Which conversations they see is the Core route's answer and not this
    // Page's: having none is an answer, and one a person can act on from here.
    path: "/conversations",
    itemKey: `@phis/ui/modules/threads/nav/${area}/conversations`,
    icon: "antd:message",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-threads-page-tree")
        .then((module) => module.buildPhiDefaultThreadsPageTree({ page, runtime, area })),
  })
) satisfies readonly PhiCmsRoutePresetDescriptor[];
