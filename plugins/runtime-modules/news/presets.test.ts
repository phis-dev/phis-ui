import { describe, expect, it } from "vitest";

import { createPhiPublicRuntimeModuleCatalog } from "../area-catalogs/public";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../descriptor-compiler";
import { PHI_NEWS_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";
import { PhiCmsFlags } from "../../../constants/phi-cms";
import { hasPhiFlag } from "../../../helpers/flags";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";
import {
  normalizePhiNewsListWidgetConfig,
  PHI_NEWS_LIST_DEFAULT_LIMIT,
} from "./widgets/news-list/config";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../../types/access";
import type { PhiCmsPageNode } from "../../../types/cms";

/**
 * The one address this Module contributes, and the entry that leads to it.
 *
 * Pinned through the compiled route table rather than off the descriptor alone: a descriptor nobody
 * compiles is a Page nobody can reach, and the header entry naming a preset key that no route carries is
 * the failure this test exists for.
 */
describe("the News address", () => {
  function publicRouteTable() {
    const entries = createPhiPublicRuntimeModuleCatalog();
    return compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "public",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });
  }

  it("answers /news in the Public Area", () => {
    const route = resolvePhiCmsRoutePreset(publicRouteTable(), "/news");

    expect(route?.descriptor.presetKey).toBe("public-news-page");
    expect(route?.descriptor.ownerModuleId).toBe(PHI_NEWS_RUNTIME_MODULE_ID);
  });

  // Unlike the sign-in Pages beside it: a Site's news is exactly what a search engine should find.
  it("is indexable from the first install", () => {
    const route = resolvePhiCmsRoutePreset(publicRouteTable(), "/news");

    // Stated as no flags at all, and read through the route table the way the Page record reads it.
    expect(route?.descriptor.defaultPageFlags).toBeUndefined();
    expect(hasPhiFlag(route?.descriptor.defaultPageFlags, PhiCmsFlags.NoIndex)).toBe(false);
  });

  it("puts one entry in the Public header, pointing at the route it ships", () => {
    const [descriptor] = PHI_NEWS_RUNTIME_MODULE_ROUTES;
    const navigation = descriptor?.navigation ?? [];

    expect(navigation).toHaveLength(1);
    const [entry] = navigation;
    expect(entry?.navKey).toBe("public:header");
    expect(entry?.item.routePresetKey).toBe(descriptor?.presetKey);
    // Namespaced to this Module: the catalog refuses two Modules claiming one item key.
    expect(entry?.item.itemKey.startsWith(PHI_NEWS_RUNTIME_MODULE_ID)).toBe(true);
  });
});

describe("the News page", () => {
  const page: PhiCmsPageNode = {
    id: 12,
    siteId: 3,
    areaMask: 2,
    path: "/news",
    pageType: PhiCmsPageType.Standard,
    status: PhiCmsStatus.Published,
    flags: 0,
    visibilityMask: 6,
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
  };

  it("places a heading the Site owns above a list it does not", async () => {
    const [descriptor] = PHI_NEWS_RUNTIME_MODULE_ROUTES;
    const tree = await descriptor!.loadTree({ page } as never);
    const widgets = tree.contentWidgets;

    expect(widgets).toHaveLength(2);
    const [heading, list] = [...widgets].sort((left, right) => left.sortOrder - right.sortOrder);
    expect(heading!.widgetType.endsWith("/markdown")).toBe(true);
    expect(list!.widgetType.endsWith("/news-list")).toBe(true);

    // Both under the one Content layout, so the Builder shows them as one column.
    const [layout] = tree.layoutNodes;
    expect(new Set(widgets.map((widget) => widget.parentLayoutNodeId))).toEqual(new Set([layout!.id]));

    // The list is placed with an empty config: what it shows is a default, not a stored decision.
    expect(list!.config).toEqual({});
  });
});

/**
 * What the Widget does with a config nobody filled in, and with one somebody filled in badly.
 *
 * The defaults matter because the preset places the Widget with an empty config: a Site that never opens
 * the Inspector must still get the entries as they were published.
 */
describe("the News list's settings", () => {
  it("shows the published entry whole when nothing is configured", () => {
    expect(normalizePhiNewsListWidgetConfig(null)).toMatchObject({
      limit: PHI_NEWS_LIST_DEFAULT_LIMIT,
      showTags: true,
      showLinks: true,
    });
    expect(normalizePhiNewsListWidgetConfig({})).toMatchObject({
      limit: PHI_NEWS_LIST_DEFAULT_LIMIT,
      showTags: true,
      showLinks: true,
    });
  });

  it("holds the ceiling, and falls back where the number is not one", () => {
    expect(normalizePhiNewsListWidgetConfig({ limit: 500 }).limit).toBe(50);
    expect(normalizePhiNewsListWidgetConfig({ limit: 3 }).limit).toBe(3);
    for (const limit of [0, -5, "many", null, 2.5]) {
      expect(normalizePhiNewsListWidgetConfig({ limit }).limit).toBe(PHI_NEWS_LIST_DEFAULT_LIMIT);
    }
  });

  it("takes a stated no for tags and links", () => {
    const config = normalizePhiNewsListWidgetConfig({ showTags: false, showLinks: false });

    expect(config.showTags).toBe(false);
    expect(config.showLinks).toBe(false);
  });
});
