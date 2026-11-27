import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import type { PhiViewerAccessPolicy } from "../../../types/access";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_BILLING_PAGE_PRESET_KEYS, PHI_BILLING_RUNTIME_MODULE_ID } from "./ids";
import { PHI_BILLING_STAFF_ACCESS } from "./access";

function withNavigationAccess(descriptor: PhiCmsRoutePresetDescriptor, accessPolicy: PhiViewerAccessPolicy): PhiCmsRoutePresetDescriptor {
  return {
    ...descriptor,
    navigation: descriptor.navigation?.map((injection) => ({ ...injection, item: { ...injection.item, accessPolicy } })),
  };
}

/*
 * The App's entry is for every member, whom the Area admits anyway: Core answers each person their own
 * documents. The two Accounting entries are for Admin and Accountant, as Core's routes are.
 */
export const PHI_BILLING_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "app",
    anchor: "main",
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    presetKey: PHI_BILLING_PAGE_PRESET_KEYS.appDocuments,
    title: "Invoices and receipts",
    path: "/documents",
    itemKey: "@phis/ui/modules/billing/nav/app/documents",
    icon: "antd:file-text",
    loadTree: ({ page, runtime }) =>
      import("./trees/app-documents-page-tree")
        .then((module) => module.buildPhiBillingAppDocumentsPageTree({ page, runtime })),
  }),
  withNavigationAccess(buildPhiSidebarRoutePresetDescriptor({
    area: "accounting",
    anchor: "main",
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    presetKey: PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments,
    title: "Documents",
    path: "/documents",
    itemKey: "@phis/ui/modules/billing/nav/accounting/documents",
    icon: "antd:file-text",
    loadTree: ({ page, runtime }) =>
      import("./trees/accounting-documents-page-tree")
        .then((module) => module.buildPhiBillingAccountingDocumentsPageTree({ page, runtime })),
  }), PHI_BILLING_STAFF_ACCESS),
  withNavigationAccess(buildPhiSidebarRoutePresetDescriptor({
    area: "accounting",
    anchor: "main",
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    presetKey: PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries,
    title: "Number series",
    path: "/number-series",
    itemKey: "@phis/ui/modules/billing/nav/accounting/number-series",
    icon: "antd:ordered-list-outlined",
    loadTree: ({ page, runtime }) =>
      import("./trees/accounting-series-page-tree")
        .then((module) => module.buildPhiBillingAccountingSeriesPageTree({ page, runtime })),
  }), PHI_BILLING_STAFF_ACCESS),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
