import { createElement } from "react";
import { describe, expect, it } from "vitest";

import {
  resolvePhiEffectiveSlotSizePolicy,
  resolvePhiSlotChildSizing,
  resolvePhiSlotChildSizingForConfig,
} from "./slot-size-policy";

/**
 * What a stated size does to a declared policy.
 *
 * A Layout declares fill on both axes, and a width used to be recorded beside that without changing
 * it. Every reader then had to subtract the one from the other, and the readers that forgot were the
 * bugs: a slot stretched to the whole cross axis while the child measured 610, so the child stood in
 * the corner of a Layout that had been anchored to the centre.
 */
describe("the policy a slot child actually runs on", () => {
  const fillBoth = { inline: "fill", block: "fill" } as const;

  it("makes an axis fixed once that axis states a size", () => {
    expect(resolvePhiEffectiveSlotSizePolicy(fillBoth, { explicitInlineSize: true })).toEqual({
      inline: "fixed",
      block: "fill",
    });
    expect(resolvePhiEffectiveSlotSizePolicy(fillBoth, { explicitBlockSize: true })).toEqual({
      inline: "fill",
      block: "fixed",
    });
  });

  it("leaves a policy alone where nothing was stated", () => {
    expect(resolvePhiEffectiveSlotSizePolicy(fillBoth, {})).toBe(fillBoth);
    expect(resolvePhiEffectiveSlotSizePolicy(fillBoth, null)).toBe(fillBoth);
  });

  /*
   * The distinction the whole thing turns on. A cap is not a size: a column of copy at a readable
   * measure still wants the width it is given, up to the cap. What it needs is a Layout that places it
   * rather than one that stretches it, and placing is the anchor's job, not the policy's.
   */
  it("does not treat a maximum as a size", () => {
    const sizing = resolvePhiSlotChildSizingForConfig("layout", undefined, {
      maxSize: { width: 610 },
    });
    expect(sizing.policy.inline).toBe("fill");
    expect(sizing.explicitInlineSize).toBe(false);
    expect(sizing.maxInlineSize).toBe(610);
  });

  it("flips the Layout default of fill on both axes when a width is configured", () => {
    const sizing = resolvePhiSlotChildSizingForConfig("layout", undefined, {
      size: { width: 610 },
    });
    expect(sizing.policy).toEqual({ inline: "fixed", block: "fill" });
    expect(sizing.explicitInlineSize).toBe(true);
  });

  /* A Widget is intrinsic on both axes, and a stated size is still a stated size. */
  it("flips an intrinsic axis too", () => {
    const sizing = resolvePhiSlotChildSizingForConfig("widget", undefined, {
      size: { height: 200 },
    });
    expect(sizing.policy).toEqual({ inline: "intrinsic", block: "fixed" });
  });

  /*
   * The same answer whichever way a Layout learns about the child: from the props of a frame it was
   * handed, or from the attributes that frame wrote. A frame states the effective policy, so reading
   * it back must not change it a second time.
   */
  describe("reading a child that has already been framed", () => {
    it("flips from props carrying the policy and the explicit flag", () => {
      const child = createElement("div", {
        kind: "layout",
        slotSizePolicy: "fill",
        explicitInlineSize: true,
      } as never);
      const sizing = resolvePhiSlotChildSizing(child);
      expect(sizing.policy).toEqual({ inline: "fixed", block: "fill" });
    });

    it("is idempotent over the attributes a frame wrote", () => {
      const child = createElement("div", {
        "data-phi-slot-size-inline": "fixed",
        "data-phi-slot-size-block": "fill",
        "data-phi-layout-explicit-width": "true",
      });
      const sizing = resolvePhiSlotChildSizing(child, "layout");
      expect(sizing.policy).toEqual({ inline: "fixed", block: "fill" });
      expect(sizing.explicitInlineSize).toBe(true);
    });
  });
});
