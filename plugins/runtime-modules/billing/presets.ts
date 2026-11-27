import type {
  PhiCmsNavigationInjectionDescriptor,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_BILLING_PAGE_PRESET_KEYS, PHI_BILLING_RUNTIME_MODULE_ID } from "./ids";
import { PHI_BILLING_STAFF_ACCESS } from "./access";

const ACCOUNTING_ITEM_KEYS = {
  container: "@phis/ui/modules/billing/nav/accounting/billing",
  documents: "@phis/ui/modules/billing/nav/accounting/documents",
  series: "@phis/ui/modules/billing/nav/accounting/number-series",
} as const;

const appDocuments = buildPhiSidebarRoutePresetDescriptor({
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
});

const accountingDocuments = buildPhiSidebarRoutePresetDescriptor({
  area: "accounting",
  anchor: "main",
  ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
  presetKey: PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments,
  title: "Documents",
  path: "/billing/documents",
  itemKey: ACCOUNTING_ITEM_KEYS.documents,
  icon: "antd:file-text",
  loadTree: ({ page, runtime }) =>
    import("./trees/accounting-documents-page-tree")
      .then((module) => module.buildPhiBillingAccountingDocumentsPageTree({ page, runtime })),
});

const accountingSeries = buildPhiSidebarRoutePresetDescriptor({
  area: "accounting",
  anchor: "main",
  ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
  presetKey: PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries,
  title: "Number series",
  path: "/billing/number-series",
  itemKey: ACCOUNTING_ITEM_KEYS.series,
  icon: "antd:ordered-list-outlined",
  loadTree: ({ page, runtime }) =>
    import("./trees/accounting-series-page-tree")
      .then((module) => module.buildPhiBillingAccountingSeriesPageTree({ page, runtime })),
});

/** A route's own sidebar entry, as the sidebar helper built it, for the container to hold. */
function sidebarItemOf(descriptor: PhiCmsRoutePresetDescriptor) {
  const item = descriptor.navigation?.[0]?.item;
  if (!item) throw new Error(`${descriptor.presetKey} has no sidebar entry.`);
  return { ...item, accessPolicy: PHI_BILLING_STAFF_ACCESS };
}

/*
 * Accounting's two Pages stand side by side under `/billing`, in one sidebar container "Billing": a path
 * segment with Pages beneath it is a folder, never a Page of its own, and the folder address leads to
 * Documents (`folderTarget`), as a Settings container leads to its first page (THIRD_PARTY_MODULES.md,
 * "Addresses and folders"; owner, 2026-11-27).
 */
const accountingContainer: PhiCmsNavigationInjectionDescriptor = {
  ...accountingDocuments.navigation![0]!,
  item: {
    itemKey: ACCOUNTING_ITEM_KEYS.container,
    label: { defaultMessage: "Billing" },
    icon: "antd:file-text",
    accessPolicy: PHI_BILLING_STAFF_ACCESS,
    folderTarget: ACCOUNTING_ITEM_KEYS.documents,
    children: [sidebarItemOf(accountingDocuments), sidebarItemOf(accountingSeries)],
  },
};

/*
 * The App's entry is for every member, whom the Area admits anyway: Core answers each person their own
 * documents. Accounting's container and its two entries are for Admin and Accountant, as Core's routes are.
 */
export const PHI_BILLING_RUNTIME_MODULE_ROUTES = [
  appDocuments,
  { ...accountingDocuments, navigation: [accountingContainer] },
  { ...accountingSeries, navigation: [] },
] satisfies readonly PhiCmsRoutePresetDescriptor[];
