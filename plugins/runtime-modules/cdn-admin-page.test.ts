import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import { createPhiAdminRuntimeModuleCatalog } from "./area-catalogs/admin";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "./descriptor-compiler";
import { PHI_CDN_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./cdn/data-providers";
import { PHI_CDN_RUNTIME_MODULE_DEFINITION } from "./cdn/definition";
import { PHI_CDN_ADMIN_PAGE_PRESET_KEY, PHI_CDN_RUNTIME_MODULE_ID } from "./cdn/ids";
import { PHI_CDN_RUNTIME_MODULE_ROUTES } from "./cdn/presets";
import { createPhiDefaultAreaRuntimeModuleIds } from "./area-module-defaults";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { checkPhiPresetTables } from "../../helpers/preset-table-check";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiCmsPageNode } from "../../types/cms";
import { PHI_CORE_SERVER_BINDING } from "../../types/server-capabilities";

const CDN_PAGE = {
  id: 41,
  siteId: 1,
  areaMask: 8,
  path: "/cdn",
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: 8,
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

const maintainer = {
  access: "authenticated" as const,
  roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags: PhiBaseRole.Maintainer }],
  groupClaims: [],
};

async function loadTree() {
  const route = PHI_CDN_RUNTIME_MODULE_ROUTES.find((entry) => entry.presetKey === PHI_CDN_ADMIN_PAGE_PRESET_KEY);
  return route!.loadTree({ page: CDN_PAGE, runtime: { locale: { current: "en" }, viewer: maintainer } } as never);
}

/** The Admin page `CDN` (phis-server `/api/site/admin/cdn`). */
describe("the CDN admin page", () => {
  it("is an Admin sidebar Page of the CDN Module, bound to Core alone and off until a Site chooses it", () => {
    const entries = createPhiAdminRuntimeModuleCatalog();
    const table = compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "admin",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });
    const route = resolvePhiCmsRoutePreset(table, "/phis/ui/cdn");
    expect(route?.descriptor.presetKey).toBe(PHI_CDN_ADMIN_PAGE_PRESET_KEY);
    expect(route?.descriptor.ownerModuleId).toBe(PHI_CDN_RUNTIME_MODULE_ID);
    expect(route?.descriptor.navigation?.[0]?.anchor).toBe("main");
    expect(PHI_CDN_RUNTIME_MODULE_DEFINITION.eligibleAreas).toEqual(["admin"]);
    expect(PHI_CDN_RUNTIME_MODULE_DEFINITION.serverBinding).toBe(PHI_CORE_SERVER_BINDING);
    expect(createPhiDefaultAreaRuntimeModuleIds("admin")).not.toContain(PHI_CDN_RUNTIME_MODULE_ID);
  });

  it("holds to the preset tree contract the descriptor compiler throws on", async () => {
    expect(checkPhiPresetTreeContract(await loadTree(), { page: CDN_PAGE, forms: [] })).toEqual([]);
  });

  it("binds its Tables and its record to the resources the Provider declares", async () => {
    const tree = await loadTree();
    expect(checkPhiPresetTables(tree, { dataProviders: PHI_CDN_RUNTIME_DATA_PROVIDER_DESCRIPTORS })).toEqual([]);
    const tables = tree.contentWidgets.filter((widget) => widget.widgetType === PhiCmsWidgetType.Table);
    expect(tables).toHaveLength(2);
    // Both end in their footer, the listing counting its rows of the whole.
    for (const table of tables) {
      expect((table.config as { presentation: { footer?: unknown } }).presentation.footer).toBeDefined();
    }
  });

  it("says the key stays taken and a cache may still serve a deleted file, and that a link loses no bytes", async () => {
    const tree = await loadTree();
    const table = tree.contentWidgets.find((widget) => widget.widgetType === PhiCmsWidgetType.Table)!;
    const rows = (table.config as { features: { actions: { row: { key: string; confirm?: { description?: string; alert?: { title: string } } }[] } } })
      .features.actions.row;
    const remove = rows.find((action) => action.key === "delete")!;
    expect(remove.confirm?.description).toMatch(/key stays taken/u);
    expect(remove.confirm?.description).toMatch(/cache/u);
    expect(remove.confirm?.alert?.title).toMatch(/no bytes are deleted/u);
    expect(rows.find((action) => action.key === "withdraw")?.confirm).toBeDefined();
  });

  it("opens the upload, the check and the details on their own action keys", async () => {
    const tree = await loadTree();
    const openKeys = tree.overlays.map((overlay) => (overlay.config as { openActionKey?: string }).openActionKey).sort();
    expect(openKeys).toEqual(["check", "upload", "view"]);
    expect(tree.contentWidgets.some((widget) => widget.widgetType === PhiCmsWidgetType.CdnUpload)).toBe(true);
  });
});
