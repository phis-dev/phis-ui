import { describe, expect, it } from "vitest";

import type { PhiCmsLayoutRenderNode } from "../../../types/cms";
import { createPhiDraftCmsInstanceId } from "../../../types/cms-instance-id";
import {
  buildPhiBuilderRootNodeRenderConfig,
  normalizePhiBuilderRootNodeDraft,
  readPhiBuilderRootNodeDraft,
} from "./root-node-normalization";

const ROOT = createPhiDraftCmsInstanceId({ domain: "page", draftRevisionId: 1, sequence: 1 });

function layoutNode(config: Record<string, unknown>): PhiCmsLayoutRenderNode {
  return {
    id: ROOT,
    siteId: -1,
    parentLayoutNodeId: null,
    widgetType: "@phis/ui/modules/core/layouts/split-card",
    slotIndex: 0,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: "Split Card",
    config,
    childLayouts: [],
    childWidgets: [],
  };
}

describe("readPhiBuilderRootNodeDraft", () => {
  it("takes the node as it is, nothing derived", () => {
    const draft = readPhiBuilderRootNodeDraft(layoutNode({ gap: 8 }));
    expect(draft).toEqual({
      id: ROOT,
      typeKey: "@phis/ui/modules/core/layouts/split-card",
      kind: "layout",
      title: "Split Card",
      packageName: "@phis/ui/modules/core/layouts",
      rootNodeConfig: { gap: 8 },
      childLayouts: [],
      childWidgets: [],
    });
  });
});

describe("normalizePhiBuilderRootNodeDraft", () => {
  it("reads anchor, inset and Surface off the config, the one place they are stated", () => {
    const surface = { background: { base: { kind: "color" as const, color: "#000" } }, shadow: "soft" as const };
    const view = normalizePhiBuilderRootNodeDraft(readPhiBuilderRootNodeDraft(layoutNode({
      anchor: "center",
      padding: 12,
      surface,
    })));
    expect(view.rootNodeAnchor).toBe("center");
    expect(view.rootNodePadding).toMatchObject({ padding: 12 });
    expect(view.rootNodeSurface).toMatchObject(surface);
  });

  it("has no Surface once the config has none -- nothing else can bring one back", () => {
    const view = normalizePhiBuilderRootNodeDraft(readPhiBuilderRootNodeDraft(layoutNode({ gap: 8 })));
    expect(view.rootNodeSurface).toBeNull();
  });
});

describe("buildPhiBuilderRootNodeRenderConfig", () => {
  it("hands on the stored config in the render mode asked for", () => {
    const draft = readPhiBuilderRootNodeDraft(layoutNode({ gap: 8, renderMode: "live" }));
    expect(buildPhiBuilderRootNodeRenderConfig(draft, "editor")).toEqual({ gap: 8, renderMode: "editor" });
  });
});
