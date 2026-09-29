import { describe, expect, it } from "vitest";
import { readPhiTreeNodePath } from "./tree-widget";

describe("readPhiTreeNodePath", () => {
  it("reads top-level and nested node fields", () => {
    const node = { id: "n1", meta: { parent: { id: 4 } } };
    expect(readPhiTreeNodePath(node, "id")).toBe("n1");
    expect(readPhiTreeNodePath(node, "meta.parent.id")).toBe(4);
  });

  it("returns undefined for a missing segment or a primitive on the way", () => {
    expect(readPhiTreeNodePath({ meta: {} }, "meta.parent.id")).toBeUndefined();
    expect(readPhiTreeNodePath({ meta: null }, "meta.parent")).toBeUndefined();
    expect(readPhiTreeNodePath({ title: "Root" }, "title.length")).toBeUndefined();
  });

  it("walks into arrays", () => {
    expect(readPhiTreeNodePath({ path: ["a", "b"] }, "path.1")).toBe("b");
  });

  it("keeps empty segments as keys", () => {
    expect(readPhiTreeNodePath({ "": { id: 1 } }, ".id")).toBe(1);
    expect(readPhiTreeNodePath({ id: 1 }, "")).toBeUndefined();
  });
});
