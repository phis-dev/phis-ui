import { describe, expect, it } from "vitest";

import {
  buildPhiBasePageContentScaffold,
  buildPhiBasePageLayoutNode,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "./phi-base-page-layout";
import { assertPhiCmsPresetTreeContract } from "../../../plugins/runtime-modules/descriptor-compiler";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../../types/access";
import { readPhiCmsInstanceIdDescriptor } from "../../../types/cms-instance-id";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

/**
 * The scaffold's soundness rests on one rule: equal id means equal node. Every built-in page preset
 * carries the same scaffold instance id, so a tree whose copy deviates from the canonical definition
 * must be rejected -- otherwise the id stops meaning anything.
 */

const page: PhiCmsPageNode = {
  id: 7,
  siteId: 3,
  areaMask: 2,
  path: "/admin/example",
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
};

function buildTree(): PhiResolvedCmsPageTree {
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: -900 });
  return {
    page,
    pageMeta: { title: { msgId: 0, source: "Example", value: "Example" }, description: null },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [],
  };
}

describe("base page layout scaffold", () => {
  it("has a preset-origin page-domain instance id", () => {
    expect(readPhiCmsInstanceIdDescriptor(PHI_BASE_PAGE_LAYOUT_NODE_ID)).toEqual({
      version: 1,
      origin: "preset",
      domain: "page",
    });
  });

  it("passes the preset tree contract as built", () => {
    expect(() => assertPhiCmsPresetTreeContract(buildTree(), page)).not.toThrow();
  });

  it("rejects a scaffold copy whose config deviates from the canonical node", () => {
    const tree = buildTree();
    tree.layoutNodes[0] = {
      ...buildPhiBasePageLayoutNode(page),
      config: { ...buildPhiBasePageLayoutNode(page).config, gap: 999 },
    };
    expect(() => assertPhiCmsPresetTreeContract(tree, page))
      .toThrow(/deviating base page layout node/);
  });

  it("rejects a scaffold copy that gained a parent", () => {
    const tree = buildTree();
    tree.layoutNodes[0] = {
      ...buildPhiBasePageLayoutNode(page),
      parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
    };
    expect(() => assertPhiCmsPresetTreeContract(tree, page))
      .toThrow(/deviating base page layout node/);
  });

  it("reserves the scaffold id for a Layout node", () => {
    const tree = buildTree();
    tree.contentWidgets.push({
      id: PHI_BASE_PAGE_LAYOUT_NODE_ID,
      siteId: page.siteId,
      parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
      widgetType: "@phis/ui/modules/core:card",
      slotIndex: 0,
      sortOrder: 0,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      label: "stray",
      config: {},
      contentId: null,
    });
    expect(() => assertPhiCmsPresetTreeContract(tree)).toThrow();
  });
});
