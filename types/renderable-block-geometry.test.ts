import { describe, expect, it } from "vitest";

import {
  readPhiRenderableBlockLength,
  resolvePhiRenderableBlockGeometry,
} from "./renderable-block-geometry";

/*
 * A number is a unit, not a type. The vocabulary stores a pixel length as a bare number and everything
 * else as a string, so the readers that branched on `typeof` were reading "absolute pixel length" and
 * calling it a type check. Here the number and its string spelling come out the same.
 */
describe("one stored length", () => {
  it("reads a bare number as pixels", () => {
    expect(readPhiRenderableBlockLength(240)).toEqual({ css: "240px", part: { value: 240, unit: "px" } });
    expect(readPhiRenderableBlockLength("240px")).toEqual({ css: "240px", part: { value: 240, unit: "px" } });
  });

  it("decodes a length on the vocabulary and writes it back canonically", () => {
    expect(readPhiRenderableBlockLength(" 50% ")).toEqual({ css: "50%", part: { value: 50, unit: "%" } });
    expect(readPhiRenderableBlockLength("1.5rem")).toEqual({ css: "1.5rem", part: { value: 1.5, unit: "rem" } });
  });

  it("passes a keyword or an expression through as written, undecoded", () => {
    expect(readPhiRenderableBlockLength("fit-content")).toEqual({ css: "fit-content", part: null });
    expect(readPhiRenderableBlockLength("calc(100dvh - 64px)")).toEqual({ css: "calc(100dvh - 64px)", part: null });
  });

  it("treats a blank string and a non-finite number as nothing stated", () => {
    expect(readPhiRenderableBlockLength("")).toBeNull();
    expect(readPhiRenderableBlockLength("   ")).toBeNull();
    expect(readPhiRenderableBlockLength(Number.NaN)).toBeNull();
    expect(readPhiRenderableBlockLength(null)).toBeNull();
    expect(readPhiRenderableBlockLength(undefined)).toBeNull();
  });
});

/*
 * `size` is two statements in one field: a measurement, and the claim "I decide this axis". The
 * resolver makes the second one once, so no slot has to remember to subtract it from the policy.
 */
describe("a block's geometry, read once", () => {
  it("answers nothing for no config", () => {
    const geometry = resolvePhiRenderableBlockGeometry(null);
    expect(geometry.inline).toEqual({ size: null, min: null, max: null });
    expect(geometry.block).toEqual({ size: null, min: null, max: null });
    expect(geometry.explicitInline).toBe(false);
    expect(geometry.explicitBlock).toBe(false);
  });

  it("splits the three pairs into two axes", () => {
    const geometry = resolvePhiRenderableBlockGeometry({
      size: { width: 610 },
      minSize: { height: "4rem" },
      maxSize: { width: "100%", height: 400 },
    });
    expect(geometry.inline.size?.css).toBe("610px");
    expect(geometry.inline.min).toBeNull();
    expect(geometry.inline.max?.css).toBe("100%");
    expect(geometry.block.size).toBeNull();
    expect(geometry.block.min?.css).toBe("4rem");
    expect(geometry.block.max?.css).toBe("400px");
  });

  it("marks an axis explicit only where a size is stated on it", () => {
    expect(resolvePhiRenderableBlockGeometry({ size: { width: 610 } })).toMatchObject({
      explicitInline: true,
      explicitBlock: false,
    });
    expect(resolvePhiRenderableBlockGeometry({ size: { height: "auto" } })).toMatchObject({
      explicitInline: false,
      explicitBlock: true,
    });
  });

  /* A maximum is deliberately not a size: a capped column still wants the width it is given. */
  it("does not treat a constraint as a stated size", () => {
    expect(resolvePhiRenderableBlockGeometry({ minSize: { width: 240 }, maxSize: { width: 610 } })).toMatchObject({
      explicitInline: false,
      explicitBlock: false,
    });
  });

  it("does not let a blank width claim the axis", () => {
    expect(resolvePhiRenderableBlockGeometry({ size: { width: "" } }).explicitInline).toBe(false);
  });

  /* A collapsed block measures by its hint where it has one, and by its size where it has none. */
  it("measures a collapsed block by its collapsed hint", () => {
    const geometry = resolvePhiRenderableBlockGeometry({
      visibility: "collapsed",
      size: { width: 610, height: 400 },
      collapsedSizeHint: { height: 48 },
    });
    expect(geometry.inline.size).toBeNull();
    expect(geometry.block.size?.css).toBe("48px");
    expect(resolvePhiRenderableBlockGeometry({ visibility: "collapsed", size: { width: 610 } }).inline.size?.css).toBe("610px");
    expect(resolvePhiRenderableBlockGeometry({ visibility: "visible", size: { width: 610 }, collapsedSizeHint: { width: 48 } }).inline.size?.css).toBe("610px");
  });

  it("is idempotent over a config whose size was already substituted", () => {
    const first = resolvePhiRenderableBlockGeometry({ visibility: "collapsed", size: { width: 610 }, collapsedSizeHint: { width: 48 } });
    const second = resolvePhiRenderableBlockGeometry({ visibility: "collapsed", size: { width: 48 }, collapsedSizeHint: { width: 48 } });
    expect(second).toEqual(first);
  });
});
