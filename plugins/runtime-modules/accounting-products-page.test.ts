import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import { createPhiAccountingRuntimeModuleCatalog } from "./area-catalogs/accounting";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "./descriptor-compiler";
import { PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "./accounting/client-data-providers";
import { PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./accounting/data-providers";
import { PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION } from "./accounting/definition";
import {
  PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
  PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY,
  PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY,
  PHI_ACCOUNTING_RUNTIME_MODULE_ID,
} from "./accounting/ids";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES } from "./accounting/presets";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiCmsPageNode } from "../../types/cms";
import { validatePhiTableWidgetBinding } from "../../types/table-widget";
import { PHI_TABLE_WIDGET_DEFINITION } from "./core/widgets/table/config";

const PRODUCTS_PAGE = {
  id: 23,
  siteId: 3,
  areaMask: 32,
  path: "/products",
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: 32,
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
} satisfies PhiCmsPageNode;

const accountant = {
  access: "authenticated" as const,
  roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags: PhiBaseRole.Accountant }],
  groupClaims: [],
};

async function loadTree() {
  const route = PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES.find(
    (entry) => entry.presetKey === PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY,
  );
  return route!.loadTree({
    page: PRODUCTS_PAGE,
    runtime: { locale: { current: "en" }, viewer: accountant },
  } as never);
}

/** The Site's product directory, the Accounting Area's own Page (phis-server SERVER_ADDONS.md, products:v1). */
describe("the product directory page", () => {
  it("is a Page of the Accounting Area's base Module with a sidebar entry", () => {
    const entries = createPhiAccountingRuntimeModuleCatalog();
    const table = compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "accounting",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });
    const route = resolvePhiCmsRoutePreset(table, "/products") ?? resolvePhiCmsRoutePreset(table, "/phis/ui/products");
    expect(route?.descriptor.presetKey).toBe(PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY);
    expect(route?.descriptor.ownerModuleId).toBe(PHI_ACCOUNTING_RUNTIME_MODULE_ID);
    const [navigation] = route?.descriptor.navigation ?? [];
    expect(navigation?.navKey).toBe("accounting:sidebar");
    expect(navigation?.anchor).toBe("main");
    expect(navigation?.item.routePresetKey).toBe(PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY);
    // Bound to Core alone: it has to work with no shop and no Add-on of its own.
    expect(PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION.serverBinding).toEqual({
      providerId: "@phis/server/core",
      requiredCapabilities: [],
    });
  });

  it("holds to the preset tree contract the descriptor compiler throws on", async () => {
    const tree = await loadTree();
    expect(checkPhiPresetTreeContract(tree, { page: PRODUCTS_PAGE, forms: [] })).toEqual([]);
  });

  it("binds its Table and the terms record to a Provider the Accounting Area loads in the browser", async () => {
    const tree = await loadTree();
    const source = { providerKey: PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY, resourceKey: PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY };
    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
    const record = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/record"));
    expect(table?.config.source).toEqual(source);
    expect(record?.config.source).toEqual(source);
    expect(PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS.map((descriptor) => descriptor.key))
      .toContain(PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY);
    expect(PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS.map((definition) => definition.key))
      .toContain(PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY);
    expect(PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY).toBe("@phis/ui/modules/accounting/tables/products");
  });

  it("offers each act the Provider declares, and confirms every one that changes something", async () => {
    const tree = await loadTree();
    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
    const config = table!.config as {
      features: {
        actions: { row: { key: string; execution: string; confirm?: { title: string } }[] };
        filters: { key: string }[];
      };
    };
    const actions = config.features.actions.row;
    expect(actions.map((action) => [action.key, action.execution])).toEqual([
      ["terms", "signal"], ["release", "provider"], ["lock", "provider"], ["unlock", "provider"],
    ]);
    for (const action of actions.filter((entry) => entry.execution === "provider")) {
      expect(action.confirm?.title).toContain("%1");
    }
    expect(config.features.filters.map((filter) => filter.key)).toEqual(["supplier", "state", "pendingTerms"]);
    const [resource] = PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources;
    // The binding check the Table runs before it queries: actions, filters and the counted footer.
    const parsed = PHI_TABLE_WIDGET_DEFINITION.parseConfig(table!.config as Record<string, unknown>);
    expect(validatePhiTableWidgetBinding(parsed, resource)).toEqual([]);
  });

  it("opens the terms dialog and its record on the same row action, and sets the terms side by side", async () => {
    const tree = await loadTree();
    const [overlay] = tree.overlays;
    const record = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/record"));
    expect(overlay?.config.openActionKey).toBe("terms");
    expect(record?.config.openActionKey).toBe("terms");
    expect(record?.parentLayoutNodeId).toBe(overlay?.bodyLayoutNodeId);
    const presentation = record!.config.presentation as { columns: number; fields: { fieldKey: string }[] };
    expect(presentation.columns).toBe(2);
    const terms = presentation.fields.map((field) => field.fieldKey).filter((key) => /^(inForce|pending)/.test(key));
    expect(terms).toEqual([
      "inForceSale", "pendingSale",
      "inForceReferralUrl", "pendingReferralUrl",
      "inForceFree", "pendingFree",
      "inForceAccountRequired", "pendingAccountRequired",
      "inForceParts", "pendingParts",
    ]);
  });
});
