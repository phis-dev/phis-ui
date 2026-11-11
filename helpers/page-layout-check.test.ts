import { describe, expect, it } from "vitest";

import { PhiCmsRegionType } from "../constants/phi-cms";
import { PHI_SPACE } from "../theme/antd-css-var-contract";
import type { PhiResolvedCmsPageTree } from "../types/cms";
import { checkPhiPagePresetLayout } from "./page-layout-check";

/* A Page as the rule wants it, and one step off it per test. */

const CARD = { background: { base: { kind: "color", color: "var(--ant-color-bg-container)" } } };

function layout(id: number, parent: number | null, typeKey: string, config: Record<string, unknown>, label = `l${id}`) {
  return { id, parentLayoutNodeId: parent, widgetType: `x/${typeKey}`, config, label } as never;
}

function page(overrides: { content?: Record<string, unknown>; nodes?: unknown[]; hero?: boolean } = {}) {
  return {
    page: {} as never,
    overlays: [],
    contentWidgets: [],
    regions: [
      ...(overrides.hero ? [{ id: -2, regionType: PhiCmsRegionType.Hero, rootLayoutNodeId: 10, config: {} }] : []),
      { id: -1, regionType: PhiCmsRegionType.Content, rootLayoutNodeId: 1,
        config: { padding: PHI_SPACE.md, ...overrides.content } },
    ],
    layoutNodes: [
      layout(1, null, "content", {}),
      layout(2, 1, "flex-vertical", { gap: PHI_SPACE.md, padding: 0 }),
      layout(3, 2, "flex-vertical", { padding: PHI_SPACE.md, surface: CARD }),
      layout(4, 2, "grid", { padding: 0 }),
      ...(overrides.nodes ?? []),
    ],
  } as unknown as PhiResolvedCmsPageTree;
}

describe("checkPhiPagePresetLayout", () => {
  it("passes a Page built by the rule", () => {
    expect(checkPhiPagePresetLayout(page())).toEqual([]);
  });

  it("wants the Page edge on the content Region", () => {
    expect(checkPhiPagePresetLayout(page({ content: { padding: undefined } }))).toHaveLength(1);
  });

  it("refuses a distance spelled out", () => {
    const findings = checkPhiPagePresetLayout(page({ nodes: [layout(5, 2, "flex-vertical", { gap: "clamp(0px, 2vw, 8px)" })] }));
    expect(findings.map((finding) => finding.node)).toEqual(["l5"]);
  });

  it("refuses padding without a Surface, and a grid that keeps its default inset", () => {
    const findings = checkPhiPagePresetLayout(page({ nodes: [
      layout(5, 2, "flex-vertical", { padding: PHI_SPACE.md }),
      layout(6, 2, "grid", {}),
    ] }));
    expect(findings.map((finding) => finding.node)).toEqual(["l5", "l6"]);
  });

  it("leaves emphasis to the author but for a Hero's bottom beside heroOverlap", () => {
    expect(checkPhiPagePresetLayout(page({ nodes: [layout(5, 2, "flex-vertical", { padding: PHI_SPACE.xl, surface: CARD })] })))
      .toHaveLength(1);
    expect(checkPhiPagePresetLayout(page({
      hero: true,
      content: { heroOverlap: PHI_SPACE.lg },
      nodes: [layout(10, null, "flex-vertical", { padding: PHI_SPACE.md, paddingBottom: PHI_SPACE.xl, surface: CARD })],
    }))).toEqual([]);
  });

  it("wants one vertical Flex as the Page column", () => {
    const tree = page();
    (tree.layoutNodes[1] as { widgetType: string }).widgetType = "x/grid";
    expect(checkPhiPagePresetLayout(tree).some((finding) => finding.message.includes("Page column"))).toBe(true);
  });
});
