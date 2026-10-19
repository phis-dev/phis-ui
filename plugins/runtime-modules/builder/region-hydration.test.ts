import { describe, expect, it } from "vitest";

import { PhiCmsRegionType } from "../../../constants/phi-cms";
import { PhiViewport } from "../../../types/access";
import {
  buildPhiDeveloperBuilderRegionDraftsFromTree,
  serializePhiDeveloperBuilderRegionConfig,
} from "./region-hydration";
import { getPhiBuilderRegionDraftKey } from "./region-keys";

/*
 * The Region Inspector's Viewport section edits `viewportFlags` on the draft, and the save never wrote
 * it: a Region set to wide screens only came back on every width after a reload (AUDIT-2026-10-19 F1).
 * What the Inspector edits has to survive the round trip through the stored config.
 */
function draftFor(config: Record<string, unknown>) {
  const drafts = buildPhiDeveloperBuilderRegionDraftsFromTree(
    {
      regions: [{ id: -1, regionType: PhiCmsRegionType.HeaderTop, rootLayoutNodeId: null, config }],
      layoutNodes: [],
      contentWidgets: [],
    } as never,
    "public",
    null,
    ["header_top"],
  );
  return drafts[getPhiBuilderRegionDraftKey("public", "header_top", null)]!;
}

describe("a Region's widths", () => {
  it("are read back from the stored config", () => {
    expect(draftFor({ viewportFlags: PhiViewport.Wide }).viewportFlags).toBe(PhiViewport.Wide);
  });

  it("are stored as the Inspector left them", () => {
    const draft = { ...draftFor({}), viewportFlags: PhiViewport.Medium | PhiViewport.Wide };
    expect(serializePhiDeveloperBuilderRegionConfig("header_top", draft).viewportFlags)
      .toBe(PhiViewport.Medium | PhiViewport.Wide);
  });

  it("are stored as nothing where the Region shows on every width", () => {
    const draft = { ...draftFor({ viewportFlags: PhiViewport.Wide }), viewportFlags: 0 };
    expect(serializePhiDeveloperBuilderRegionConfig("header_top", draft)).not.toHaveProperty("viewportFlags");
  });
});
