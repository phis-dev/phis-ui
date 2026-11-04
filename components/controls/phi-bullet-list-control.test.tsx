import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PHI_SURFACE_CARD } from "../../helpers/surface-presets";
import {
  buildPhiBulletListTree,
  nextPhiBulletListEntryState,
  PhiBulletListFlag,
  readPhiBulletListEntries,
  resolvePhiBulletListStyle,
} from "../widgets/shared/bullet-list-vocabulary";
import { PhiBulletListControl } from "./phi-bullet-list-control";

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

describe("PhiBulletListControl", () => {
  it("is a real list, with the list one level down inside its entry", () => {
    const html = renderToStaticMarkup(
      <PhiBulletListControl items={[{ content: "a", children: [{ content: "a1" }] }, { content: "b" }]} />,
    );
    expect(count(html, /<ul/g)).toBe(2);
    expect(count(html, /<li/g)).toBe(3);
    expect(html.indexOf("a1")).toBeLessThan(html.indexOf(">b<"));
  });

  it("counts with an ordered list, from its start", () => {
    const html = renderToStaticMarkup(
      <PhiBulletListControl ordered start={3} items={[{ content: "x" }, { content: "y" }]} />,
    );
    expect(html).toMatch(/<ol [^>]*start="3"/);
    expect(html).toContain(">3.<");
    expect(html).toContain(">4.<");
  });

  it("draws no marker for none and keeps the entries", () => {
    const html = renderToStaticMarkup(
      <PhiBulletListControl listStyle={resolvePhiBulletListStyle({ level1: "none" })} items={[{ content: "x" }]} />,
    );
    expect(html).not.toContain("aria-hidden");
    expect(html).toContain(">x<");
  });

  it("gives each entry its box, and draws lines only between entries without one", () => {
    const boxed = renderToStaticMarkup(
      <PhiBulletListControl
        listStyle={resolvePhiBulletListStyle({ itemSurface: PHI_SURFACE_CARD, flags: PhiBulletListFlag.Dividers })}
        items={[{ content: "x" }, { content: "y" }]}
      />,
    );
    expect(count(boxed, /<li [^>]*border:1px solid/g)).toBe(2);
    expect(boxed).not.toContain("border-top:1px");

    const divided = renderToStaticMarkup(
      <PhiBulletListControl
        listStyle={resolvePhiBulletListStyle({ flags: PhiBulletListFlag.Dividers })}
        items={[{ content: "x" }, { content: "y" }]}
      />,
    );
    expect(count(divided, /border-top:1px/g)).toBe(1);
  });

  it("draws an entry's state in place of its level's marker, and quiets what is excluded", () => {
    const html = renderToStaticMarkup(
      <PhiBulletListControl
        listStyle={resolvePhiBulletListStyle({ level1: "none" })}
        items={buildPhiBulletListTree(
          readPhiBulletListEntries([
            { text: "in", state: "included" },
            { text: "out", state: "excluded" },
            { text: "plain", state: "neutral" },
          ]),
          (entry) => entry.text,
        )}
      />,
    );
    // Two state markers, and nothing for the neutral entry of a list whose marker is none.
    expect(count(html, /<span aria-hidden="true" style="display:inline-flex/g)).toBe(2);
    expect(html).toMatch(/color:var\(--ant-color-text-tertiary\)[^>]*>out</);
    expect(html).not.toContain("<button");
  });

  it("stores only a state that is not neutral, and steps through all three", () => {
    expect(readPhiBulletListEntries([{ text: "a", state: "neutral" }, { text: "b", state: "maybe" }])).toEqual([
      { text: "a" },
      { text: "b" },
    ]);
    expect(nextPhiBulletListEntryState(undefined)).toBe("included");
    expect(nextPhiBulletListEntryState("included")).toBe("excluded");
    expect(nextPhiBulletListEntryState("excluded")).toBe("neutral");
  });
});
