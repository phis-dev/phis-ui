import { describe, expect, it, vi } from "vitest";

/*
 * A table's columns: the dashes of the delimiter row as widths when they differ, and a column of short
 * entries kept on one line when they do not.
 */

vi.mock("server-only", () => ({}));
vi.mock("../../../server-helpers/translate", () => ({
  trBulk: vi.fn(async (messages: string[]) => messages),
}));

import { resolveMarkdownRenderData } from "./markdown-render";

async function table(markdown: string) {
  const data = await resolveMarkdownRenderData({ sourceMode: "inline", markdown, translate: false });
  if (!("blocks" in data)) throw new Error("no blocks");
  const block = data.blocks.find((entry) => entry.kind === "table");
  if (!block || block.kind !== "table") throw new Error("no table");
  return block;
}

const LONG = "A sentence that is a good deal longer than any label would be.";

describe("Markdown table columns", () => {
  it("reads the widths from dashes of different lengths", async () => {
    const block = await table(["| Name | Purpose |", "|---|---------|", `| phis | ${LONG} |`].join("\n"));
    expect(block.widths).toEqual([25, 75]);
    expect(block.nowrap).toEqual([false, false]);
  });

  it("keeps the alignment colons out of the count", async () => {
    const block = await table(["| A | B |", "|:---|------:|", "| a | b |"].join("\n"));
    expect(block.widths).toEqual([33.3, 66.7]);
    expect(block.align).toEqual(["left", "right"]);
  });

  it("leaves the widths to the browser when the dashes are equal", async () => {
    const block = await table(["| Name | Purpose |", "| --- | --- |", `| phis | ${LONG} |`].join("\n"));
    expect(block.widths).toBeNull();
    expect(block.nowrap).toEqual([true, false]);
  });

  it("counts the heading as part of a column", async () => {
    const block = await table(["| A heading far too long to stay on a line | B |", "|---|---|", "| a | b |"].join("\n"));
    expect(block.nowrap).toEqual([false, true]);
  });
});
