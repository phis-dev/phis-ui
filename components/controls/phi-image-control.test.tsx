import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PhiImageControl } from "./phi-image-control";

vi.mock("../root/phi-config-provider", () => ({
  usePhiConfig: () => ({ token: { colorBgMask: "rgba(0, 0, 0, 0.45)" } }),
}));

function box(width?: number | string, height?: number | string) {
  const markup = renderToStaticMarkup(createElement(PhiImageControl, {
    presentation: { kind: "original", url: "/picture.png", fit: "cover", objectPosition: undefined, width: 960, height: 640, focalRect: null, variantSpec: null } as never,
    source: "url",
    alt: "A picture",
    width,
    height,
  }));
  return /^<div style="([^"]*)"/.exec(markup)?.[1] ?? "";
}

/*
 * A picture in a column narrower than its width: `maxWidth` takes the width in, and the height has to
 * come down with it, or the box stays as tall as the picture was wide and leaves air above and below.
 */
describe("the picture's box", () => {
  it("keeps the proportion of two numbers, not their height", () => {
    const style = box();
    expect(style).toContain("width:960px");
    expect(style).toContain("height:auto");
    expect(style).toContain("aspect-ratio:960 / 640");
    expect(style).toContain("max-width:100%");
  });

  it("keeps a height that is not a number", () => {
    const style = box("100%", "12rem");
    expect(style).toContain("height:12rem");
    expect(style).not.toContain("aspect-ratio");
  });
});
