import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));
vi.mock("../../gateway/site-media-settings", () => ({
  getResolvedSiteMediaSettings: async () => ({
    userSpacesEnabled: true,
    groupSpacesEnabled: true,
    defaultUserQuotaBytes: null,
    defaultGroupQuotaBytes: null,
    defaultAddonQuotaBytes: null,
    maxUserQuotaBytes: null,
    maxGroupQuotaBytes: null,
    maxAddonQuotaBytes: null,
    maxObjectBytes: 134217728,
    addonSpaces: [],
    storage: {
      profiles: [
        { id: 1, key: "local", providerId: "@phis/server/storage-local", local: true, disabled: false, spaces: 2 },
        { id: 2, key: "s3", providerId: "@phis/storage-s3/s3", local: false, disabled: false, spaces: 0 },
      ],
      siteSpaceProfileId: 1,
      defaultUserProfileId: null,
      defaultGroupProfileId: 2,
      allowedProfileIds: [2],
    },
  }),
}));

import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiCmsPageNode } from "../../types/cms";
import { parsePhiTableWidgetConfig } from "./core/widgets/table/config";
import { buildPhiDefaultAdminMediaSettingsPageTree } from "./asset/trees/phi-default-admin-media-settings-page-tree";

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
 * Beside the module system rather than inside the asset Module, for the reason the Auth test is: it reads
 * the asset preset with the Core Table's reader, which a Module may not reach. A Table config the reader
 * refuses renders nothing, and one whose profile cell lost its choices could not be edited at all.
 */
describe("the Admin media settings page", () => {
  it("builds Space tables the Table's reader accepts, with the Site's offered Profiles as choices", async () => {
    const tree = await buildPhiDefaultAdminMediaSettingsPageTree({
      page: PAGE,
      runtime: { locale: { current: "en" }, site: { key: "site" } } as never,
    });
    const tables = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/table"));
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      const parsed = parsePhiTableWidgetConfig(table.config);
      const profile = parsed.presentation.columns.find((column) => column.key === "storageProfileId");
      // Offered only: the list restricts the Site to Profile 2, and every Profile is still named.
      expect(profile?.editor?.options).toEqual([{ value: "2", label: "s3" }]);
      expect(profile?.valueMap?.["1"]).toBe("local");
    }
  });
});
