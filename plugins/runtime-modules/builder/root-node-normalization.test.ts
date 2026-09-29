import { describe, expect, it } from "vitest";

import { readPhiBuilderRootNodeDraftFields } from "./root-node-normalization";

describe("readPhiBuilderRootNodeDraftFields", () => {
  it("reads every root node field a region draft carries", () => {
    const childLayouts = [{ id: "l1" }] as never[];
    const childWidgets = [{ id: "w1" }] as never[];
    expect(readPhiBuilderRootNodeDraftFields({
      rootNodeTitle: "Hero",
      rootNodeConfig: { gap: 8 },
      rootNodeGeometry: { width: "100%" } as never,
      rootNodeAnchor: "topLeft",
      rootNodePadding: { top: 4 } as never,
      rootNodeBackground: { base: { kind: "color", color: "#000" } } as never,
      rootNodeBorder: { width: 1 } as never,
      rootNodeShadow: { x: 0 } as never,
      rootNodeChildLayouts: childLayouts,
      rootNodeChildWidgets: childWidgets,
    })).toEqual({
      title: "Hero",
      rootNodeConfig: { gap: 8 },
      rootNodeGeometry: { width: "100%" },
      rootNodeAnchor: "topLeft",
      rootNodePadding: { top: 4 },
      rootNodeBackground: { base: { kind: "color", color: "#000" } },
      rootNodeBorder: { width: 1 },
      rootNodeShadow: { x: 0 },
      childLayouts,
      childWidgets,
    });
  });

  it("answers null for absent values and empty lists for absent children", () => {
    const fields = readPhiBuilderRootNodeDraftFields({});
    expect(fields).toEqual({
      title: null,
      rootNodeConfig: null,
      rootNodeGeometry: null,
      rootNodeAnchor: null,
      rootNodePadding: null,
      rootNodeBackground: null,
      rootNodeBorder: null,
      rootNodeShadow: null,
      childLayouts: [],
      childWidgets: [],
    });
    expect(Object.keys(fields)).not.toContain("packageName");
  });
});
