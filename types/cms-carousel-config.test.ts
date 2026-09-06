import { describe, expect, it } from "vitest";

import { parsePhiCmsCarouselLayoutConfig } from "./cms-config";

/**
 * Reading a stored Carousel, strictly.
 *
 * The vocabulary is closed -- four transitions, two anchors, a whole number of slots -- so a stored
 * value outside it is a mistake in the document rather than something to work around. A layout that
 * renders anyway hides it: the page comes up, nothing reports an error, and the slots simply move in
 * a way nobody wrote. Absent is the one thing that is not a mistake.
 */

describe("what a Carousel accepts", () => {
  it("takes a written-out configuration as written", () => {
    expect(parsePhiCmsCarouselLayoutConfig({
      visibleSlots: 3,
      windowAnchor: "center",
      transition: "diagonal",
      transitionDurationMs: 480,
      transitionEasing: "ease-out",
      slotGap: "16px",
      loop: true,
      autoplayMs: 5000,
      lookahead: 2,
    })).toMatchObject({
      visibleSlots: 3,
      windowAnchor: "center",
      transition: "diagonal",
      transitionDurationMs: 480,
      transitionEasing: "ease-out",
      slotGap: "16px",
      loop: true,
      autoplayMs: 5000,
      lookahead: 2,
    });
  });

  it("falls to the layout's defaults for what nobody wrote", () => {
    const parsed = parsePhiCmsCarouselLayoutConfig({});
    // A slide is the default because it is what says the slots are a run rather than a set.
    expect(parsed.transition).toBe("slide");
    expect(parsed.visibleSlots).toBe(1);
    expect(parsed.windowAnchor).toBe("start");
    // No duration means the theme's pace, not a number this parser invented.
    expect(parsed.transitionDurationMs).toBeUndefined();
    expect(parsed.transitionEasing).toBeUndefined();
  });

  it("brings a duration into range, because the bounds are what the setting means", () => {
    expect(parsePhiCmsCarouselLayoutConfig({ transitionDurationMs: 5 }).transitionDurationMs).toBe(100);
    expect(parsePhiCmsCarouselLayoutConfig({ transitionDurationMs: 9_000_000 }).transitionDurationMs)
      .toBe(600_000);
  });

  it("reads zero autoplay as not moving on its own", () => {
    // The one number below the floor that means something, so it is not lifted to it.
    expect(parsePhiCmsCarouselLayoutConfig({ autoplayMs: 0 }).autoplayMs).toBeUndefined();
  });
});

describe("what a Carousel refuses", () => {
  it("names the setting it could not read", () => {
    expect(() => parsePhiCmsCarouselLayoutConfig({ transition: "fade-over" }))
      .toThrow(/Invalid Carousel transition/);
    expect(() => parsePhiCmsCarouselLayoutConfig({ windowAnchor: "end" }))
      .toThrow(/Invalid Carousel windowAnchor/);
    expect(() => parsePhiCmsCarouselLayoutConfig({ transitionEasing: "springy" }))
      .toThrow(/Invalid Phi motion easing/);
  });

  it("refuses a count that is not one", () => {
    expect(() => parsePhiCmsCarouselLayoutConfig({ visibleSlots: 0 })).toThrow(/at least 1/);
    expect(() => parsePhiCmsCarouselLayoutConfig({ visibleSlots: 2.5 })).toThrow(/whole number/);
    expect(() => parsePhiCmsCarouselLayoutConfig({ lookahead: -1 })).toThrow(/at least 0/);
  });

  it("refuses a flag that is not one", () => {
    expect(() => parsePhiCmsCarouselLayoutConfig({ loop: "yes" })).toThrow(/true or false/);
  });

  it("has no mounting setting to get wrong", () => {
    /*
     * A Carousel keeps what it has shown, always. The window already decides what exists, and a
     * policy that dropped a slot on leaving the window would re-run its content every time somebody
     * stepped back -- so the word is not offered, and a stored one is simply not read.
     */
    expect(parsePhiCmsCarouselLayoutConfig({ mountPolicy: "eager" }))
      .not.toHaveProperty("mountPolicy");
  });
});
