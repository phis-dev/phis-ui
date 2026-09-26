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

/*
 * A length may name a value per profile, and the base answer is the one that was always there.
 *
 * `inline` and `block` stay the `compact` reading, so every reader that existed before profiles keeps
 * reading exactly what it read; the other two stand beside them and only where a field names more than
 * one. Designed in design/RESPONSIVE_BLOCK_GEOMETRY.md.
 */
describe("a length stated per profile", () => {
  it("leaves a plain config alone and states no profiles for it", () => {
    const geometry = resolvePhiRenderableBlockGeometry({ size: { width: 610 }, maxSize: { width: "40rem" } });
    expect(geometry.inline.size?.css).toBe("610px");
    expect(geometry.inline.max?.css).toBe("40rem");
    expect(geometry.profiles).toBeNull();
  });

  it("reads the base from compact and the other two beside it", () => {
    const geometry = resolvePhiRenderableBlockGeometry({
      size: { width: { compact: "100%", medium: "50%", wide: 610 } },
    });
    expect(geometry.inline.size?.css).toBe("100%");
    expect(geometry.profiles?.medium.inline.size?.css).toBe("50%");
    expect(geometry.profiles?.wide.inline.size?.css).toBe("610px");
  });

  it("cascades upward, so a profile nobody named takes the one below it", () => {
    const geometry = resolvePhiRenderableBlockGeometry({
      maxSize: { width: { compact: "100%", wide: 610 } },
    });
    expect(geometry.inline.max?.css).toBe("100%");
    expect(geometry.profiles?.medium.inline.max?.css).toBe("100%");
    expect(geometry.profiles?.wide.inline.max?.css).toBe("610px");
  });

  it("states nothing below the profile that first names a value", () => {
    const geometry = resolvePhiRenderableBlockGeometry({ size: { width: { wide: 610 } } });
    expect(geometry.inline.size).toBeNull();
    expect(geometry.profiles?.medium.inline.size).toBeNull();
    expect(geometry.profiles?.wide.inline.size?.css).toBe("610px");
  });

  /*
   * A slot policy and the attribute that carries it are resolved once on the server, and CSS can vary a
   * width but not an attribute. So "explicit" is a property of the block as a whole.
   */
  it("calls an axis explicit where any profile names a size", () => {
    expect(resolvePhiRenderableBlockGeometry({ size: { width: { wide: 610 } } }).explicitInline).toBe(true);
    expect(resolvePhiRenderableBlockGeometry({ size: { height: { medium: 240 } } }).explicitBlock).toBe(true);
    expect(resolvePhiRenderableBlockGeometry({ maxSize: { width: { wide: 610 } } }).explicitInline).toBe(false);
  });

  it("keeps one axis plain while the other names profiles", () => {
    const geometry = resolvePhiRenderableBlockGeometry({
      size: { width: { compact: "100%", wide: 610 }, height: 240 },
    });
    expect(geometry.block.size?.css).toBe("240px");
    expect(geometry.profiles?.wide.block.size?.css).toBe("240px");
    expect(geometry.profiles?.wide.inline.size?.css).toBe("610px");
  });

  it("still measures a collapsed block by its plain hint", () => {
    const geometry = resolvePhiRenderableBlockGeometry({
      visibility: "collapsed",
      size: { height: { compact: 400, wide: 800 } },
      collapsedSizeHint: { height: 48 },
    });
    expect(geometry.block.size?.css).toBe("48px");
    expect(geometry.profiles).toBeNull();
  });
});
