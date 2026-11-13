import { describe, expect, it } from "vitest";

import {
  PHI_BLOCK_GEOMETRY_RESPONSIVE_MIN_WIDTH,
  omitPhiBlockProfiledDeclarations,
  phiBlockGeometryQueriesRoom,
  phiSlotContainerAttributes,
  resolvePhiBlockProfileStyle,
  type PhiBlockProfileBox,
} from "./block-geometry-profiles";
import { resolvePhiRenderableBlockGeometry } from "../types/renderable-block-geometry";

const box: PhiBlockProfileBox = {
  unstated: {
    width: "auto",
    height: "auto",
    "min-width": "0",
    "min-height": "0",
    "max-width": "100%",
    "max-height": "100%",
  },
};

/*
 * An axis is written inline or in CSS, never both: an inline declaration beats every `@container`
 * rule. So what varies by profile leaves the inline style and comes back as three custom properties.
 */
describe("a block's geometry per profile, as the stylesheet reads it", () => {
  it("hands nothing over for a block that names no profile", () => {
    const geometry = resolvePhiRenderableBlockGeometry({ size: { width: 320 }, maxSize: { width: "50%" } });
    const profile = resolvePhiBlockProfileStyle(geometry, box);

    expect(profile.declarations).toEqual([]);
    expect(profile.attributes).toEqual({});
    expect(profile.properties).toEqual({});
    expect(phiBlockGeometryQueriesRoom(geometry)).toBe(false);
  });

  it("writes the three answers of a varying declaration, cascading upward from compact", () => {
    const geometry = resolvePhiRenderableBlockGeometry({
      size: { width: { compact: 200, wide: "40rem" }, height: 120 },
    });
    const profile = resolvePhiBlockProfileStyle(geometry, box);

    expect(profile.declarations).toEqual(["width"]);
    expect(profile.attributes).toEqual({ "data-phi-block-profiled": "width" });
    expect(profile.properties).toEqual({
      "--phi-block-width": "200px",
      "--phi-block-width-medium": "200px",
      "--phi-block-width-wide": "40rem",
    });
    expect(phiBlockGeometryQueriesRoom(geometry)).toBe(true);
  });

  /*
   * Custom properties inherit, so a profile that says nothing is written with the box's own answer
   * rather than left out: left out, it would read what an enclosing block wrote for itself.
   */
  it("writes the box's own answer where a profile states nothing", () => {
    const geometry = resolvePhiRenderableBlockGeometry({ maxSize: { width: { wide: 960 } } });
    const profile = resolvePhiBlockProfileStyle(geometry, box);

    expect(profile.declarations).toEqual(["max-width"]);
    expect(profile.properties).toEqual({
      "--phi-block-max-width": "100%",
      "--phi-block-max-width-medium": "100%",
      "--phi-block-max-width-wide": "960px",
    });
  });

  it("keeps a declaration inline that answers the same at every profile", () => {
    const geometry = resolvePhiRenderableBlockGeometry({
      size: { width: { compact: 200 }, height: { medium: 300 } },
    });
    const profile = resolvePhiBlockProfileStyle(geometry, box);

    expect(profile.declarations).toEqual(["height"]);
  });

  it("writes a maximum the way the box writes one", () => {
    const geometry = resolvePhiRenderableBlockGeometry({ maxSize: { width: { compact: 320, medium: 640 } } });
    const profile = resolvePhiBlockProfileStyle(geometry, {
      ...box,
      inlineMaximum: (maximum) => `min(100%, ${maximum.css})`,
    });

    expect(profile.properties["--phi-block-max-width"]).toBe("min(100%, 320px)");
    expect(profile.properties["--phi-block-max-width-wide"]).toBe("min(100%, 640px)");
  });

  it("leaves the declarations it hands over out of an inline style, and nothing else", () => {
    expect(omitPhiBlockProfiledDeclarations(
      { width: "200px", minWidth: 0, maxWidth: "100%", height: "fit-content" },
      ["width", "max-width"],
    )).toEqual({ minWidth: 0, height: "fit-content" });
  });

  it("declares the container only where a block asks", () => {
    expect(phiSlotContainerAttributes(true)).toEqual({ "data-phi-slot-container": "true" });
    expect(phiSlotContainerAttributes(false)).toEqual({ "data-phi-slot-container": undefined });
  });

  it("switches at the Grid's pair", () => {
    expect(PHI_BLOCK_GEOMETRY_RESPONSIVE_MIN_WIDTH).toEqual({ medium: 377, wide: 610 });
  });
});
