import { describe, expect, it } from "vitest";

import { resolvePhiRootScaffoldProperties } from "./builder-geometry";
import { resolvePhiRenderableBlockGeometry } from "../../../types/renderable-block-geometry";

/**
 * What the root scaffold writes, now that it no longer restates the frame's answers.
 *
 * The slot the properties are read on is a slot child frame, and the frame writes its width, height,
 * minima and maxima inline. A stylesheet cannot beat that, so the scaffold's own `100%`, `auto`, `0`
 * and `none` were never visible; what is left is the flex, and the stated size for the one caller that
 * builds its frame without the root's config.
 */
describe("the custom properties the root scaffold writes", () => {
  const propertiesFor = (config: Record<string, unknown> | null) =>
    resolvePhiRootScaffoldProperties(resolvePhiRenderableBlockGeometry(config));

  it("writes nothing but the flex for a root that states no size", () => {
    expect(propertiesFor(null)).toEqual({ "--phi-root-scaffold-flex": "1 1 auto" });
    expect(propertiesFor({ minSize: { width: "320px" }, maxSize: { height: "480px" } })).toEqual({
      "--phi-root-scaffold-flex": "1 1 auto",
    });
  });

  it("stops the flex and names the width once the root states one", () => {
    expect(propertiesFor({ size: { width: "610px" } })).toEqual({
      "--phi-root-scaffold-flex": "0 0 auto",
      "--phi-root-scaffold-explicit-width": "610px",
    });
  });

  it("stops the flex and names the height once the root states one", () => {
    expect(propertiesFor({ size: { height: 240 } })).toEqual({
      "--phi-root-scaffold-flex": "0 0 auto",
      "--phi-root-scaffold-explicit-height": "240px",
    });
  });

  it("names both where both are stated", () => {
    expect(propertiesFor({ size: { width: "100%", height: "calc(100% - 2rem)" } })).toEqual({
      "--phi-root-scaffold-flex": "0 0 auto",
      "--phi-root-scaffold-explicit-width": "100%",
      "--phi-root-scaffold-explicit-height": "calc(100% - 2rem)",
    });
  });
});
