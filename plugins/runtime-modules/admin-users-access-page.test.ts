import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE, PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../types/access";
import type { PhiCmsPageNode } from "../../types/cms";
import { checkPhiPresetTables } from "../../helpers/preset-table-check";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { validatePhiTableWidgetBinding } from "../../types/table-widget";
import { PHI_TABLE_WIDGET_DEFINITION } from "./core/widgets/table/config";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./user-management/data-providers";
import {
  PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY,
} from "./user-management/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES } from "./user-management/presets";
import {
  buildPhiUsersAccessGrantPath,
  buildPhiUsersAccessLogParams,
  toPhiUsersAccessAddonRow,
  toPhiUsersAccessLogRow,
} from "./user-management/services/users-access-table";

const PAGE = {
  id: 31,
  siteId: 1,
  areaMask: 2,
  path: "/settings/people-data",
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: 2,
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

const route = PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES.find((entry) => entry.presetKey === PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY)!;

async function loadTree() {
  return route.loadTree({ page: PAGE, runtime: { locale: { current: "en" }, site: { key: "site" } } } as never);
}

/** Admin -> Settings -> People data (phis-server `/api/site/admin/users-access`, Site Admin only). */
describe("the people data access page", () => {
  it("is a Settings entry of the Admin offered to Site Admins", () => {
    expect(route.area).toBe("admin");
    expect(route.path).toBe("/settings/people-data");
    const [navigation] = route.navigation ?? [];
    expect(navigation).toMatchObject({ navKey: "admin:sidebar", anchor: "settings" });
    expect(navigation?.item.accessPolicy).toEqual(PHI_VIEWER_ACCESS_SITE_ADMIN);
  });

  it("holds to the preset contract and binds its three Tables to the Provider's resources", async () => {
    const tree = await loadTree();
    expect(checkPhiPresetTreeContract(tree, { page: PAGE, forms: [] })).toEqual([]);
    expect(checkPhiPresetTables(tree, { dataProviders: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS })).toEqual([]);
    const provider = PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess)!;
    const tables = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/table"));
    expect(tables.map((table) => (table.config.source as { resourceKey: string }).resourceKey)).toEqual(["addons", "retention", "log"]);
    for (const table of tables) {
      const parsed = PHI_TABLE_WIDGET_DEFINITION.parseConfig(table.config as Record<string, unknown>);
      const resource = provider.resources!.find((entry) => entry.resourceKey === parsed.source!.resourceKey)!;
      expect(validatePhiTableWidgetBinding(parsed, resource)).toEqual([]);
    }
  });

  it("reads Core's rows: the acts by what awaits and what is granted, the log by subject and Add-on", () => {
    expect(toPhiUsersAccessAddonRow({ addonId: "@acme/crm", background: ["name", "email"], granted: ["name"], awaiting: ["email"] }))
      .toMatchObject({ hasAwaiting: true, hasGrant: true, fields: [] });
    expect(toPhiUsersAccessLogRow({ at: "2026-11-24T00:00:00Z", actor: null, fields: ["name"] }, 0, 1))
      .toMatchObject({ key: "1:0:2026-11-24T00:00:00Z", actor: "", fields: ["name"] });
    expect(buildPhiUsersAccessGrantPath("@acme/crm")).toBe("/api/site/admin/users-access/%40acme%2Fcrm");
    expect(buildPhiUsersAccessLogParams({ page: 2, pageSize: 50, filters: { subject: "s1", addonId: "@acme/crm" } }).toString())
      .toBe("page=2&pageSize=50&subject=s1&addonId=%40acme%2Fcrm");
  });
});
