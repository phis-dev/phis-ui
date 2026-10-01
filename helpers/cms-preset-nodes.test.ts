import { describe, expect, it } from "vitest";

import { createPhiCmsPresetNodes } from "./cms-preset-nodes";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../types/access";
import { createPhiPresetCmsInstanceIdMap } from "../types/cms-instance-id";
import type { PhiCmsPageNode } from "../types/cms";

/**
 * The frame factories fill in what a Preset repeats and nothing it decides. A draft Page row with
 * flags of its own is the case that tells the two apart: the frame is published and unflagged
 * whatever row it was built for, while the Page's id and visibility carry through.
 */

const DRAFT = PhiCmsStatus.Draft;

const page: PhiCmsPageNode = {
  id: 7,
  siteId: 3,
  areaMask: 2,
  path: "/admin/example",
  pageType: PhiCmsPageType.Standard,
  status: DRAFT,
  flags: 4,
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
  layoutConfig: { kept: true },
};

const ids = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  // Any owner will do: the factories never ask which Module a node belongs to.
  ownerModuleId: "@phis/ui/modules/preset-nodes-test",
  presetKey: "preset-nodes-test",
}, ["layoutContent", "overlayBody", "overlayHeader", "overlayFooter", "overlay"]);

describe("createPhiCmsPresetNodes frame factories", () => {
  const nodes = createPhiCmsPresetNodes(page);

  it("builds a Region of the Page, published, with an empty config by default", () => {
    expect(nodes.region({
      id: -30,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: ids.layoutContent,
      sortOrder: 30,
    })).toStrictEqual({
      id: -30,
      pageId: 7,
      areaPresetId: null,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: ids.layoutContent,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: 6,
      sortOrder: 30,
      config: {},
    });
  });

  it("lets a Region copied from elsewhere keep its own status, flags and visibility", () => {
    const region = nodes.region({
      id: -1,
      regionType: PhiCmsRegionType.HeaderTop,
      rootLayoutNodeId: ids.layoutContent,
      status: DRAFT,
      flags: 8,
      visibilityMask: 1,
      sortOrder: -10,
      config: { sticky: true },
    });
    expect(region).toMatchObject({
      status: DRAFT,
      flags: 8,
      visibilityMask: 1,
      config: { sticky: true },
    });
  });

  it("builds an Overlay without a header or footer unless it names them", () => {
    expect(nodes.overlay({
      id: ids.overlay,
      overlayType: "modal",
      bodyLayoutNodeId: ids.overlayBody,
      sortOrder: 0,
      label: "test modal",
      config: { title: "Test" },
    })).toStrictEqual({
      id: ids.overlay,
      overlayType: "modal",
      headerLayoutNodeId: null,
      bodyLayoutNodeId: ids.overlayBody,
      footerPresentation: "none",
      footerLayoutNodeId: null,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: 6,
      sortOrder: 0,
      label: "test modal",
      config: { title: "Test" },
    });
  });

  it("writes a named footer as its presentation and Layout", () => {
    expect(nodes.overlay({
      id: ids.overlay,
      overlayType: "drawer",
      headerLayoutNodeId: ids.overlayHeader,
      bodyLayoutNodeId: ids.overlayBody,
      footerPresentation: "actions",
      footerLayoutNodeId: ids.overlayFooter,
      sortOrder: 2,
      label: null,
      config: {},
    })).toMatchObject({
      headerLayoutNodeId: ids.overlayHeader,
      footerPresentation: "actions",
      footerLayoutNodeId: ids.overlayFooter,
    });
  });

  it("returns the Page row published, with only what the Preset decides changed", () => {
    expect(nodes.page()).toStrictEqual({ ...page, status: PhiCmsStatus.Published });
    const redirect = nodes.page({
      pageType: PhiCmsPageType.Redirect,
      layoutConfig: { redirect: { target: { area: "admin", path: "/x" } } },
    });
    expect(redirect).toStrictEqual({
      ...page,
      pageType: PhiCmsPageType.Redirect,
      status: PhiCmsStatus.Published,
      layoutConfig: { redirect: { target: { area: "admin", path: "/x" } } },
    });
    // The row's field order is kept, so a tree serialises the same as one that spread the row.
    expect(Object.keys(redirect)).toEqual(Object.keys(page));
  });

  it("keeps Layouts on the defaults' status and flags, unlike the frame", () => {
    const layout = nodes.layout({
      typeKey: "flex",
      id: ids.layoutContent,
      parentLayoutNodeId: null,
      slotIndex: 0,
      label: null,
    });
    expect(layout).toMatchObject({ status: DRAFT, flags: 4, visibilityMask: 6, siteId: 3 });
  });

  it("offers the Page-bound factories only when given a Page", () => {
    const plain = createPhiCmsPresetNodes({ siteId: 3, visibilityMask: 6 });
    expect("region" in plain).toBe(false);
    expect("page" in plain).toBe(false);
    expect(typeof plain.overlay).toBe("function");
  });
});
