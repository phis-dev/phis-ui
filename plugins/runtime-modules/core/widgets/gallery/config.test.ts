import { describe, expect, it } from "vitest";

import { parsePhiCmsGalleryWidgetConfig } from "./config";

/**
 * Reading a stored Gallery, strictly.
 *
 * A Widget that renders past a value it does not understand hides the mistake: the page comes up,
 * nothing reports an error, and the picture wall simply does something other than what somebody
 * wrote. Absent is the one thing that is not a mistake -- a key nobody wrote leaves the decision to
 * the defaults.
 */

describe("what a Gallery accepts", () => {
  it("takes a written-out configuration as written", () => {
    expect(parsePhiCmsGalleryWidgetConfig({
      images: [{ url: "/a.png", alt: "A" }, { url: "/b.png", href: "/b" }],
      visibleCount: 3,
      windowAnchor: "center",
      transition: "diagonal",
      durationMs: 480,
      easing: "ease-out",
      lookahead: 2,
      mountPolicy: "eager",
      fit: "contain",
      controls: "dots",
      loop: true,
      autoplayMs: 5000,
    })).toMatchObject({
      images: [{ url: "/a.png", alt: "A" }, { url: "/b.png", href: "/b" }],
      visibleCount: 3,
      windowAnchor: "center",
      transition: "diagonal",
      durationMs: 480,
      easing: "ease-out",
      lookahead: 2,
      mountPolicy: "eager",
      fit: "contain",
      controls: "dots",
      loop: true,
      autoplayMs: 5000,
    });
  });

  it("leaves out what was never written, so the defaults still decide", () => {
    const parsed = parsePhiCmsGalleryWidgetConfig({ images: [] });
    expect(parsed.images).toEqual([]);
    expect(parsed.transition).toBeUndefined();
    expect(parsed.durationMs).toBeUndefined();
    // Except the one that has a real default rather than an absence.
    expect(parsed.mountPolicy).toBe("lazy-keep");
  });

  it("brings a duration into range, because the bounds are what the setting means", () => {
    expect(parsePhiCmsGalleryWidgetConfig({ durationMs: 5 }).durationMs).toBe(100);
    expect(parsePhiCmsGalleryWidgetConfig({ durationMs: 9_000_000 }).durationMs).toBe(600_000);
  });

  it("reads zero autoplay as not moving on its own", () => {
    // The one number below the floor that means something, so it is not lifted to it.
    expect(parsePhiCmsGalleryWidgetConfig({ autoplayMs: 0 }).autoplayMs).toBeUndefined();
  });
});

describe("what a Gallery refuses", () => {
  it("refuses the mount policy word that changed meaning", () => {
    expect(() => parsePhiCmsGalleryWidgetConfig({ mountPolicy: "keep" }))
      .toThrow(/Invalid Phi CMS mount policy/);
  });

  it("names the setting it could not read", () => {
    expect(() => parsePhiCmsGalleryWidgetConfig({ transition: "flip" }))
      .toThrow(/Invalid Gallery transition/);
    expect(() => parsePhiCmsGalleryWidgetConfig({ fit: "fill" }))
      .toThrow(/Invalid Gallery fit/);
    expect(() => parsePhiCmsGalleryWidgetConfig({ controls: "buttons" }))
      .toThrow(/Invalid Gallery controls/);
  });

  it("refuses a count that is not one", () => {
    expect(() => parsePhiCmsGalleryWidgetConfig({ visibleCount: 0 }))
      .toThrow(/at least 1/);
    expect(() => parsePhiCmsGalleryWidgetConfig({ visibleCount: 2.5 }))
      .toThrow(/whole number/);
    expect(() => parsePhiCmsGalleryWidgetConfig({ lookahead: -1 }))
      .toThrow(/at least 0/);
  });

  it("refuses a picture without a picture, and says which one", () => {
    // Dropping it silently would leave a gallery one shorter than the document says, which is the
    // kind of difference nobody notices until somebody counts.
    expect(() => parsePhiCmsGalleryWidgetConfig({ images: [{ url: "/a.png" }, { alt: "B" }] }))
      .toThrow(/images\[1\]\.url/);
    expect(() => parsePhiCmsGalleryWidgetConfig({ images: "/a.png" }))
      .toThrow(/Invalid Gallery images/);
  });

  it("refuses a flag that is not one", () => {
    expect(() => parsePhiCmsGalleryWidgetConfig({ loop: "yes" })).toThrow(/true or false/);
  });
});
