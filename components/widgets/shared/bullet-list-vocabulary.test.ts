import { describe, expect, it } from "vitest";

import { PHI_SURFACE_CARD } from "../../../helpers/surface-presets";
import {
  buildPhiBulletListTree,
  readPhiBulletListEntries,
  readPhiBulletListStyle,
  resolvePhiBulletListStyle,
} from "./bullet-list-vocabulary";

describe("Bullet list vocabulary", () => {
  it("hangs a flat list with levels as the tree it reads as", () => {
    const tree = buildPhiBulletListTree(
      [{ text: "a" }, { text: "a1", level: 2 }, { text: "a2", level: 2 }, { text: "b" }],
      (entry) => entry.text,
    );
    expect(tree).toEqual([
      { content: "a", children: [{ content: "a1" }, { content: "a2" }] },
      { content: "b" },
    ]);
  });

  it("keeps an entry that skips a level with the entry it follows", () => {
    const tree = buildPhiBulletListTree([{ text: "a" }, { text: "deep", level: 3 }], (entry) => entry.text);
    expect(tree).toEqual([{ content: "a", children: [{ content: "deep" }] }]);
  });

  it("starts a list whose first entry is indented at the outermost level", () => {
    expect(buildPhiBulletListTree([{ text: "x", level: 2 }], (entry) => entry.text)).toEqual([{ content: "x" }]);
  });

  it("reads entries whole and leaves out what is not one", () => {
    expect(readPhiBulletListEntries([
      { text: "a", level: 7, values: ["v", 2] },
      "plain",
      { level: 2 },
      { text: "b", level: 1 },
    ])).toEqual([
      { text: "a", level: 3, values: ["v", "2"] },
      { text: "b" },
    ]);
  });

  it("answers silence with a browser's markers and a tight gap", () => {
    expect(resolvePhiBulletListStyle(undefined)).toEqual({
      markers: { 1: "dot", 2: "circle", 3: "dash" },
      icon: null,
      itemSurface: null,
      gap: "xs",
      flags: 0,
    });
  });

  it("keeps a box set to none apart from no word on it, and an entry's box has no mode", () => {
    expect(readPhiBulletListStyle({ itemSurface: null })).toEqual({ itemSurface: null });
    expect(readPhiBulletListStyle({})).toBeUndefined();
    expect(readPhiBulletListStyle({ itemSurface: { ...PHI_SURFACE_CARD, tone: "dark" }, level2: "icon", gap: "huge" }))
      .toEqual({ itemSurface: readPhiBulletListStyle({ itemSurface: PHI_SURFACE_CARD })?.itemSurface, level2: "icon" });
  });
});
