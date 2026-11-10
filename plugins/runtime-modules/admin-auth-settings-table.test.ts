import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));
vi.mock("../../../../gateway/site-auth-settings", () => ({
  getResolvedSiteAuthAdminSettings: async () => ({
    policy: { registrationMode: "automatic", existingAccountLinking: "verified-email-confirm", allowPrivilegedAutoLink: false },
    passwordMethod: { enabled: true, sortOrder: 10 },
    totpPolicy: { required: false, enforcement: "next-login", graceUntil: null, roles: [] },
  }),
}));

import { PhiCmsPageType, PhiCmsStatus } from "../../../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../../../types/access";
import type { PhiCmsPageNode } from "../../../../types/cms";
import { parsePhiTableWidgetConfig } from "../../core/widgets/table/config";
import { buildPhiDefaultAdminAuthSettingsPageTree } from "./phi-default-admin-auth-settings-page-tree";

const PAGE = {
  id: 1,
  siteId: 1,
  areaMask: 2,
  path: "/settings/authentication",
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

/*
 * The identity provider Table is the only way to add a provider, and a config the Table's reader refuses
 * is not rendered at all -- the page showed the panel with nothing in it, no row and no add button. The
 * empty state was a bare text where the reader wants `{ title, description }`, and nothing between the
 * preset and the renderer read it the way the renderer does.
 */
describe("the Admin authentication settings page", () => {
  it("builds an identity provider Table the Table's own reader accepts", async () => {
    const tree = await buildPhiDefaultAdminAuthSettingsPageTree({
      page: PAGE,
      runtime: { locale: { current: "en" }, site: { key: "site" } } as never,
    });
    const tables = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/table"));

    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(() => parsePhiTableWidgetConfig(table.config)).not.toThrow();
    }
  });
});
