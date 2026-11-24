import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor, type PhiSidebarAreaKey } from "../sidebar-route";
import { getPhiCustomerFilePagePresetKey, getPhiThreadsPagePresetKey } from "./addresses";
import { PHI_THREADS_CUSTOMER_FILE_ACCESS } from "./customer-file-access";
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

/**
 * Staff's customer file, where the staff it is for already work: the App, where a Supporter answers Support
 * (`/support` is the App's), and the Accounting Area, where an Accountant works. Neither Admin nor any other
 * Area admits a Supporter, and Accounting admits no Supporter, so the App is the one place both reach; the
 * Accounting entry spares an Accountant the change of Area.
 *
 * In the App the entry is offered only to the holders of `support` or `accounting`, as Core's route
 * answers; the Accounting Area admits nobody else. The Page itself tells anybody else it is not theirs.
 */
export const PHI_THREADS_CUSTOMER_FILE_ROUTES = (["app", "accounting"] as const).map((area) => {
  const descriptor = buildPhiSidebarRoutePresetDescriptor({
    area,
    anchor: "main",
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    presetKey: getPhiCustomerFilePagePresetKey(area),
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    title: "Customer file",
    path: "/customer-file",
    itemKey: `@phis/ui/modules/threads/nav/${area}/customer-file`,
    icon: "antd:idcard",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-customer-file-page-tree")
        .then((module) => module.buildPhiDefaultCustomerFilePageTree({ page, runtime, area })),
  });
  return {
    ...descriptor,
    navigation: descriptor.navigation?.map((injection) => ({
      ...injection,
      item: { ...injection.item, accessPolicy: PHI_THREADS_CUSTOMER_FILE_ACCESS },
    })),
  };
}) satisfies readonly PhiCmsRoutePresetDescriptor[];
