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
      rootNodeSurface: { background: { base: { kind: "color", color: "#000" } }, shadow: "soft" },
      rootNodeChildLayouts: childLayouts,
      rootNodeChildWidgets: childWidgets,
    })).toEqual({
      title: "Hero",
      rootNodeConfig: { gap: 8 },
      rootNodeGeometry: { width: "100%" },
      rootNodeAnchor: "topLeft",
      rootNodePadding: { top: 4 },
      rootNodeSurface: { background: { base: { kind: "color", color: "#000" } }, shadow: "soft" },
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
      rootNodeSurface: null,
      childLayouts: [],
      childWidgets: [],
    });
    expect(Object.keys(fields)).not.toContain("packageName");
  });
});
