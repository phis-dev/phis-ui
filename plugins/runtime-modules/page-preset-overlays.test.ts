import { describe, expect, it } from "vitest";

import { composePhiCmsPagePresetOverlays } from "./page-preset-overlays";
import { PhiCmsPageType, PhiCmsRegionType } from "../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../helpers/cms-preset-nodes";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../types/cms";
import { createPhiPresetCmsInstanceIdMap } from "../../types/cms-instance-id";

const KEYS = [
  "content", "storedContent", "widgetContent",
  "overlayA", "aHeader", "aBody", "aBodyChild", "aFooter", "aWidgetHeader", "aWidgetChild", "aWidgetFooter",
  "overlayB", "bBody", "bWidget",
  "storedBody", "storedWidget",
] as const;
const ids = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: "@phis/ui/modules/page-preset-overlays-test",
  presetKey: "page-preset-overlays-test",
}, KEYS);

const page: PhiCmsPageNode = {
  id: 1,
  siteId: 1,
  areaMask: 1,
  path: "/x",
  pageType: PhiCmsPageType.Standard,
  status: 1,
  flags: 0,
  visibilityMask: 1,
  accessPolicy: PHI_VIEWER_ACCESS_ANYONE,
  titleMsgId: null,
  descriptionMsgId: null,
  heroRootLayoutNodeId: null,
  headerBottomRootLayoutNodeId: null,
  siderRightRootLayoutNodeId: null,
  footerTopRootLayoutNodeId: null,
  drawerRightRootLayoutNodeId: null,
  contentRootLayoutNodeId: ids.content,
  layoutConfig: {},
};
const nodes = createPhiCmsPresetNodes(page);

const flex = (id: string, parent: string | null) => nodes.layout({
  id: id as never,
  typeKey: "flex",
  parentLayoutNodeId: parent as never,
  slotIndex: 0,
  label: null,
});
const widget = (id: string, parent: string) => nodes.widget({
  id: id as never,
  parentLayoutNodeId: parent as never,
  typeKey: "markdown",
  slotIndex: 0,
  sortOrder: 0,
  label: null,
  config: {},
});
const overlay = (id: string, body: string, header: string | null = null, footer: string | null = null) => {
  const common = {
    id: id as never,
    overlayType: "modal" as const,
    headerLayoutNodeId: header as never,
    bodyLayoutNodeId: body as never,
    sortOrder: 0,
    label: null,
    config: {},
  };
  return footer
    ? nodes.overlay({ ...common, footerPresentation: "custom", footerLayoutNodeId: footer as never })
    : nodes.overlay(common);
};

const content = flex(ids.content, null);
const region = nodes.region({
  id: -1,
  regionType: PhiCmsRegionType.Content,
  rootLayoutNodeId: ids.content,
  sortOrder: 0,
});

function storedTree(extra: Partial<PhiResolvedCmsPageTree> = {}): PhiResolvedCmsPageTree {
  return {
    page,
    regions: [region],
    overlays: [],
    layoutNodes: [content],
    contentWidgets: [widget(ids.widgetContent, ids.content)],
    controllerSettings: [],
    ...extra,
  };
}

const presetTree: PhiResolvedCmsPageTree = {
  page,
  regions: [region],
  overlays: [
    overlay(ids.overlayA, ids.aBody, ids.aHeader, ids.aFooter),
    overlay(ids.overlayB, ids.bBody),
  ],
  layoutNodes: [
    content,
    flex(ids.aHeader, null),
    flex(ids.aBody, null),
    flex(ids.aBodyChild, ids.aBody),
    flex(ids.aFooter, null),
    flex(ids.bBody, null),
  ],
  contentWidgets: [
    widget(ids.widgetContent, ids.content),
    widget(ids.aWidgetHeader, ids.aHeader),
    widget(ids.aWidgetChild, ids.aBodyChild),
    widget(ids.aWidgetFooter, ids.aFooter),
    widget(ids.bWidget, ids.bBody),
  ],
  controllerSettings: [],
};

describe("composePhiCmsPagePresetOverlays", () => {
  it("returns the stored tree itself when the preset has no Overlay to give", () => {
    const stored = storedTree();
    expect(composePhiCmsPagePresetOverlays({
      tree: stored,
      presetTree: { ...presetTree, overlays: [] },
    })).toBe(stored);
  });

  it("appends each Overlay whole, in the preset's order, and none of the preset's Region nodes", () => {
    const stored = storedTree();
    const composed = composePhiCmsPagePresetOverlays({ tree: stored, presetTree });
    expect(composed.overlays.map((node) => node.id)).toEqual([ids.overlayA, ids.overlayB]);
    expect(composed.layoutNodes.map((node) => node.id)).toEqual([
      ids.content, ids.aHeader, ids.aBody, ids.aBodyChild, ids.aFooter, ids.bBody,
    ]);
    expect(composed.contentWidgets.map((node) => node.id)).toEqual([
      ids.widgetContent, ids.aWidgetHeader, ids.aWidgetChild, ids.aWidgetFooter, ids.bWidget,
    ]);
    expect(composed.regions).toBe(stored.regions);
    expect(composed.page).toBe(stored.page);
  });

  it("lets a stored Overlay with the id of a preset Overlay win, and takes the others", () => {
    const stored = storedTree({
      overlays: [overlay(ids.overlayA, ids.storedBody)],
      layoutNodes: [content, flex(ids.storedBody, null)],
      contentWidgets: [widget(ids.storedWidget, ids.storedBody)],
    });
    const composed = composePhiCmsPagePresetOverlays({ tree: stored, presetTree });
    expect(composed.overlays.map((node) => node.id)).toEqual([ids.overlayA, ids.overlayB]);
    expect(composed.overlays[0]).toBe(stored.overlays[0]);
    expect(composed.layoutNodes.map((node) => node.id)).toEqual([ids.content, ids.storedBody, ids.bBody]);
    expect(composed.contentWidgets.map((node) => node.id)).toEqual([ids.storedWidget, ids.bWidget]);
  });

  it("returns the stored tree when every preset Overlay is stored", () => {
    const stored = storedTree({
      overlays: [overlay(ids.overlayA, ids.storedBody), overlay(ids.overlayB, ids.storedBody)],
    });
    expect(composePhiCmsPagePresetOverlays({ tree: stored, presetTree })).toBe(stored);
  });

  it("throws naming an id a taken Layout shares with a stored Layout", () => {
    const stored = storedTree({ layoutNodes: [content, flex(ids.bBody, null)] });
    expect(() => composePhiCmsPagePresetOverlays({ tree: stored, presetTree }))
      .toThrow(`duplicate instance id "${ids.bBody}"`);
  });

  it("throws naming an id a taken Widget shares with a stored Widget", () => {
    const stored = storedTree({
      contentWidgets: [widget(ids.aWidgetChild, ids.content)],
    });
    expect(() => composePhiCmsPagePresetOverlays({ tree: stored, presetTree }))
      .toThrow(`duplicate instance id "${ids.aWidgetChild}"`);
  });

  it("leaves stored nodes and Controller settings as stored", () => {
    const settings = [] as const;
    const stored = storedTree({ controllerSettings: settings });
    const composed = composePhiCmsPagePresetOverlays({ tree: stored, presetTree });
    expect(composed.controllerSettings).toBe(settings);
    expect(composed.layoutNodes[0]).toBe(stored.layoutNodes[0]);
    expect(composed.contentWidgets[0]).toBe(stored.contentWidgets[0]);
    expect(stored.overlays).toHaveLength(0);
    expect(stored.layoutNodes).toHaveLength(1);
  });
});
