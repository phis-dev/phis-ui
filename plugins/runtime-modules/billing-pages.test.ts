import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import { createPhiAppRuntimeModuleCatalog } from "./area-catalogs/app";
import { createPhiAccountingRuntimeModuleCatalog } from "./area-catalogs/accounting";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "./descriptor-compiler";
import { PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./billing/data-providers";
import { PHI_BILLING_RUNTIME_MODULE_DEFINITION } from "./billing/definition";
import { PHI_BILLING_PAGE_PRESET_KEYS, PHI_BILLING_RUNTIME_MODULE_ID } from "./billing/ids";
import { PHI_BILLING_RUNTIME_MODULE_ROUTES } from "./billing/presets";
import { PHI_BILLING_RUNTIME_MODULE_FORMS } from "./billing/forms";
import { createPhiDefaultAreaRuntimeModuleIds } from "./area-module-defaults";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { checkPhiPresetTables } from "../../helpers/preset-table-check";
import { checkPhiPresetForms } from "../../helpers/preset-form-check";
import { checkPhiPresetTextSources } from "../../helpers/preset-text-source-check";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiCmsPageNode } from "../../types/cms";
import { PHI_CORE_SERVER_BINDING } from "../../types/server-capabilities";

const page = (path: string, areaMask: number) => ({
  id: 43,
  siteId: 1,
  areaMask,
  path,
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: areaMask,
  accessPolicy: PHI_VIEWER_ACCESS_ANYONE,
  titleMsgId: null,
  descriptionMsgId: null,
  heroRootLayoutNodeId: null,
  headerBottomRootLayoutNodeId: null,
  siderRightRootLayoutNodeId: null,
  footerTopRootLayoutNodeId: null,
  drawerRightRootLayoutNodeId: null,
  contentRootLayoutNodeId: null,
  layoutConfig: {},
}) satisfies PhiCmsPageNode;

const viewer = (flags: number) => ({
  access: "authenticated" as const,
  roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags }],
  groupClaims: [],
});

const PAGES = {
  [PHI_BILLING_PAGE_PRESET_KEYS.appDocuments]: page("/billing", 2),
  [PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments]: page("/billing/documents", 16),
  [PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries]: page("/billing/number-series", 16),
} as const;

async function loadTree(presetKey: keyof typeof PAGES, roleFlags: number = PhiBaseRole.Accountant) {
  const route = PHI_BILLING_RUNTIME_MODULE_ROUTES.find((entry) => entry.presetKey === presetKey);
  return route!.loadTree({ page: PAGES[presetKey], runtime: { locale: { current: "en" }, viewer: viewer(roleFlags) } } as never);
}

function routeIn(area: "app" | "accounting", path: string) {
  const entries = area === "app" ? createPhiAppRuntimeModuleCatalog() : createPhiAccountingRuntimeModuleCatalog();
  const table = compilePhiCmsActiveRouteTable({
    catalog: resolvePhiCmsDescriptorCatalog(entries),
    area,
    activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
  });
  return resolvePhiCmsRoutePreset(table, path);
}

/** The Core module "Billing" (phis-server `billing:v1`; owner, 2026-11-27). */
describe("the Billing Module", () => {
  it("is a Core module of the App and Accounting Areas, off until a Site switches it on", () => {
    expect(PHI_BILLING_RUNTIME_MODULE_DEFINITION.eligibleAreas).toEqual(["app", "accounting"]);
    expect(PHI_BILLING_RUNTIME_MODULE_DEFINITION.serverBinding).toBe(PHI_CORE_SERVER_BINDING);
    expect(createPhiDefaultAreaRuntimeModuleIds("app")).not.toContain(PHI_BILLING_RUNTIME_MODULE_ID);
    expect(createPhiDefaultAreaRuntimeModuleIds("accounting")).not.toContain(PHI_BILLING_RUNTIME_MODULE_ID);
    expect(routeIn("app", "/phis/ui/billing")?.descriptor.presetKey).toBe(PHI_BILLING_PAGE_PRESET_KEYS.appDocuments);
    expect(routeIn("accounting", "/phis/ui/billing/documents")?.descriptor.presetKey).toBe(PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments);
    expect(routeIn("accounting", "/phis/ui/billing/number-series")?.descriptor.presetKey).toBe(PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries);
  });

  it("offers the Accounting container and its entries to Admin and Accountant, and the App's entry to every member", () => {
    const staff = { access: "roles", providerId: PHI_CORE_ROLE_PROVIDER_ID, allowedRoleFlags: PhiBaseRole.Accountant };
    const [app, documents, series] = PHI_BILLING_RUNTIME_MODULE_ROUTES;
    expect(app.navigation?.[0]?.item.accessPolicy).toBeUndefined();
    // One container for both Accounting Pages, its folder `/billing` leading to Documents.
    const container = documents.navigation?.[0]?.item;
    expect(container?.accessPolicy).toEqual(staff);
    expect(container?.folderTarget).toBe(container?.children?.[0]?.itemKey);
    expect(container?.children?.map((child) => [child.routePresetKey, child.accessPolicy]))
      .toEqual([[PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments, staff], [PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries, staff]]);
    expect(series.navigation).toEqual([]);
  });

  it.each(Object.keys(PAGES) as (keyof typeof PAGES)[])("builds %s to the preset contracts, its Tables to the Provider's resources", async (presetKey) => {
    const tree = await loadTree(presetKey);
    expect(checkPhiPresetTreeContract(tree, { page: PAGES[presetKey], forms: PHI_BILLING_RUNTIME_MODULE_FORMS })).toEqual([]);
    expect(checkPhiPresetTables(tree, { dataProviders: PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS })).toEqual([]);
    expect(checkPhiPresetTextSources(tree)).toEqual([]);
  });

  it("says to a Maintainer that the Accounting pages are Admin's and Accountant's, and reads nothing for them", async () => {
    for (const presetKey of [PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments, PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries] as const) {
      const tree = await loadTree(presetKey, PhiBaseRole.Maintainer);
      expect(tree.contentWidgets.map((widget) => widget.widgetType)).toEqual([PhiCmsWidgetType.SimpleText]);
      expect(tree.overlays).toEqual([]);
    }
  });

  it("opens a document's details, opens and downloads it, and retries a failed fetch, in Accounting", async () => {
    const tree = await loadTree(PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments);
    const table = tree.contentWidgets.find((widget) => widget.widgetType === PhiCmsWidgetType.Table)!;
    const config = table.config as { features: { actions: { row: { key: string; confirm?: unknown }[] }; filters: { key: string }[] } };
    expect(config.features.actions.row.map((action) => action.key)).toEqual(["view", "open", "download", "retry"]);
    expect(config.features.actions.row.find((action) => action.key === "retry")?.confirm).toBeDefined();
    expect(config.features.filters.map((filter) => filter.key))
      .toEqual(["userId", "issuerKind", "issuer", "kinds", "source", "period", "status", "paymentState"]);
    expect(tree.overlays.map((overlay) => (overlay.config as { openActionKey?: string }).openActionKey)).toEqual(["view"]);
  });

  it("adds, changes and replaces a series in dialogs of its Forms, and closes one after asking", async () => {
    const tree = await loadTree(PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries);
    expect(tree.overlays.map((overlay) => (overlay.config as { openActionKey?: string }).openActionKey)).toEqual(["create", "edit", "replace"]);
    const forms = tree.contentWidgets.filter((widget) => widget.widgetType === PhiCmsWidgetType.Form)
      .map((widget) => (widget.config as { formId: string }).formId);
    expect(forms).toEqual(PHI_BILLING_RUNTIME_MODULE_FORMS.map((form) => form.formId));
    expect(checkPhiPresetForms(PHI_BILLING_RUNTIME_MODULE_FORMS)).toEqual([]);
  });
});
