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
 * documents. In Accounting, Documents is an entry of the sidebar's body and Number series a page of the
 * Area's Settings container (`settings` anchor, SETTINGS.md); both are for Admin and Accountant, as Core's
 * routes are (owner, 2026-11-27). `/billing` and `/settings/number-series` lie beneath no other route of
 * the Area, so no Page is a folder.
 */
export const PHI_BILLING_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "app",
    anchor: "main",
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    presetKey: PHI_BILLING_PAGE_PRESET_KEYS.appDocuments,
    title: "Invoices and receipts",
    path: "/billing",
    itemKey: "@phis/ui/modules/billing/nav/app/billing",
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
    path: "/billing",
    itemKey: "@phis/ui/modules/billing/nav/accounting/documents",
    icon: "antd:file-text",
    loadTree: ({ page, runtime }) =>
      import("./trees/accounting-documents-page-tree")
        .then((module) => module.buildPhiBillingAccountingDocumentsPageTree({ page, runtime })),
  }), PHI_BILLING_STAFF_ACCESS),
  withNavigationAccess(buildPhiSidebarRoutePresetDescriptor({
    area: "accounting",
    anchor: "settings",
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    presetKey: PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries,
    title: "Number series",
    path: "/settings/number-series",
    itemKey: "@phis/ui/modules/billing/nav/accounting/settings/number-series",
    icon: "antd:ordered-list-outlined",
    loadTree: ({ page, runtime }) =>
      import("./trees/accounting-series-page-tree")
        .then((module) => module.buildPhiBillingAccountingSeriesPageTree({ page, runtime })),
  }), PHI_BILLING_STAFF_ACCESS),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
