import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/* The Page's words, stubbed: what this test reads is the wiring, which is the same whatever the words are. */
vi.mock("../../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));
vi.mock("./trees/editor-releases-label-set", () => ({
  getPhiEditorReleasesPageLabels: async () => ({
    widgetLabel: "releases",
    columns: { kind: "", what: "", where: "", by: "", at: "" },
    kinds: { content: "", entry: "", page: "", area: "" },
    actions: { publish: "", reject: "" },
    publish: { title: "", description: "" },
    reject: { title: "", description: "" },
    empty: { title: "", text: "" },
  }),
}));

import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import { createPhiEditorRuntimeModuleCatalog } from "../area-catalogs/editor";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../descriptor-compiler";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../../types/access";
import type { PhiCmsPageNode } from "../../../types/cms";
import { PHI_EDITOR_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "./client-data-providers";
import { PHI_EDITOR_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import {
  PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY,
  PHI_EDITOR_RELEASES_PAGE_PRESET_KEY,
  PHI_EDITOR_RELEASES_RESOURCE_KEY,
  PHI_EDITOR_RUNTIME_MODULE_ID,
} from "./ids";
import { PHI_EDITOR_RUNTIME_MODULE_ROUTES } from "./presets";

const viewerWith = (flags: number) => ({
  access: "authenticated" as const,
  roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags }],
  groupClaims: [],
});

const RELEASES_PAGE = {
  id: 22,
  siteId: 3,
  areaMask: 16,
  path: "/releases",
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: 16,
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

/** The Publisher's queue in the editor Area (phis-server CONTENT.md, Submission). */
describe("the Releases page", () => {
  it("is a Page of the editor Area with a sidebar entry", () => {
    const entries = createPhiEditorRuntimeModuleCatalog();
    const table = compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "editor",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });
    const route = resolvePhiCmsRoutePreset(table, "/releases") ?? resolvePhiCmsRoutePreset(table, "/phis/ui/releases");
    expect(route?.descriptor.presetKey).toBe(PHI_EDITOR_RELEASES_PAGE_PRESET_KEY);
    expect(route?.descriptor.ownerModuleId).toBe(PHI_EDITOR_RUNTIME_MODULE_ID);
    const [navigation] = route?.descriptor.navigation ?? [];
    expect(navigation?.navKey).toBe("editor:sidebar");
    expect(navigation?.item.routePresetKey).toBe(PHI_EDITOR_RELEASES_PAGE_PRESET_KEY);
  });

  it("binds its Table to a Provider the editor Area loads in the browser", async () => {
    const route = PHI_EDITOR_RUNTIME_MODULE_ROUTES.find(
      (entry) => entry.presetKey === PHI_EDITOR_RELEASES_PAGE_PRESET_KEY,
    );
    const tree = await route!.loadTree({
      page: RELEASES_PAGE,
      runtime: { locale: { current: "en" }, viewer: viewerWith(PhiBaseRole.Publisher) },
    } as never);
    const tableWidget = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
    expect(tableWidget?.config.source).toEqual({
      providerKey: PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY,
      resourceKey: PHI_EDITOR_RELEASES_RESOURCE_KEY,
    });
    expect(PHI_EDITOR_RUNTIME_DATA_PROVIDER_DESCRIPTORS.map((descriptor) => descriptor.key))
      .toContain(PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY);
    expect(PHI_EDITOR_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS.map((definition) => definition.key))
      .toContain(PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY);
  });

  it("offers the acts to a Publisher only", async () => {
    const route = PHI_EDITOR_RUNTIME_MODULE_ROUTES.find(
      (entry) => entry.presetKey === PHI_EDITOR_RELEASES_PAGE_PRESET_KEY,
    );
    const rowActionKeys = async (flags: number) => {
      const tree = await route!.loadTree({
        page: RELEASES_PAGE,
        runtime: { locale: { current: "en" }, viewer: viewerWith(flags) },
      } as never);
      const tableWidget = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
      const actions = (tableWidget?.config as { features?: { actions?: { row?: { key: string }[] } } })
        ?.features?.actions?.row ?? [];
      return actions.map((action) => action.key);
    };
    expect(await rowActionKeys(PhiBaseRole.Publisher)).toEqual(["publish", "reject"]);
    expect(await rowActionKeys(PhiBaseRole.Author)).toEqual([]);
  });
});
