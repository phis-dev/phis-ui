import { describe, expect, it } from "vitest";
import { readPhiDotPath } from "./dot-path";

describe("readPhiDotPath", () => {
  it("reads top-level and nested record values", () => {
    const input = { id: 7, author: { name: "Ada", profile: { city: "Bonn" } } };
    expect(readPhiDotPath(input, "id")).toBe(7);
    expect(readPhiDotPath(input, "author.name")).toBe("Ada");
    expect(readPhiDotPath(input, "author.profile.city")).toBe("Bonn");
  });

  it("returns undefined for a missing segment", () => {
    expect(readPhiDotPath({ author: { name: "Ada" } }, "author.email")).toBeUndefined();
    expect(readPhiDotPath({ author: { name: "Ada" } }, "editor.name")).toBeUndefined();
  });

  it("skips empty segments and reads the input itself for an empty path", () => {
    const input = { author: { name: "Ada" } };
    expect(readPhiDotPath(input, "")).toBe(input);
    expect(readPhiDotPath(input, ".author..name.")).toBe("Ada");
  });

  it("does not walk into arrays, primitives or null", () => {
    expect(readPhiDotPath({ items: [{ id: 1 }] }, "items.0.id")).toBeUndefined();
    expect(readPhiDotPath({ name: "Ada" }, "name.length")).toBeUndefined();
    expect(readPhiDotPath({ author: null }, "author.name")).toBeUndefined();
    expect(readPhiDotPath(null, "author")).toBeUndefined();
    expect(readPhiDotPath([{ id: 1 }], "0")).toBeUndefined();
  });

  it("keeps falsy leaf values", () => {
    expect(readPhiDotPath({ flag: false, count: 0, text: "" }, "flag")).toBe(false);
    expect(readPhiDotPath({ flag: false, count: 0, text: "" }, "count")).toBe(0);
    expect(readPhiDotPath({ flag: false, count: 0, text: "" }, "text")).toBe("");
    expect(readPhiDotPath({ value: null }, "value")).toBeNull();
  });
});
