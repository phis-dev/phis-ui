import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PHI_SURFACE_CARD } from "../../helpers/surface-presets";
import { PhiBulletListFlag, resolvePhiBulletListStyle } from "../widgets/shared/bullet-list-vocabulary";
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
});
