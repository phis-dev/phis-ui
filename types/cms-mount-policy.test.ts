import { describe, expect, it } from "vitest";

import {
  readPhiCmsMountPolicy,
  shouldPhiCmsContentStayMounted,
  type PhiCmsMountPolicy,
} from "./cms-mount-policy";

/**
 * What happens to content outside the window.
 *
 * One vocabulary for Overlays and sequential layouts, which used to disagree about the word `keep`:
 * an Overlay's `keep-alive` mounted on first opening, a Stack's `keep` mounted everything at load.
 * The rename to `lazy-keep` is the whole reason this file exists -- no validator could have caught a
 * stored `keep`, because the string was legal in both vocabularies and meant opposite things.
 */

function mounted(policy: PhiCmsMountPolicy, insideWindow: boolean, hasEnteredWindow: boolean) {
  return shouldPhiCmsContentStayMounted({ policy, insideWindow, hasEnteredWindow });
}

describe("what stays mounted", () => {
  it("shows what is inside the window under every policy", () => {
    for (const policy of ["remount", "lazy-keep", "eager"] as const) {
      expect(mounted(policy, true, false)).toBe(true);
    }
  });

  it("drops what has left, under remount", () => {
    expect(mounted("remount", false, true)).toBe(false);
  });

  it("keeps what has been shown, under lazy-keep", () => {
    expect(mounted("lazy-keep", false, true)).toBe(true);
  });

  it("does not mount what lazy-keep has never shown", () => {
    // The half that distinguishes it from `eager`, and the reason for the `lazy` in its name: a slot
    // nobody has reached yet is not in the document, so nothing in it is listening or searchable.
    expect(mounted("lazy-keep", false, false)).toBe(false);
  });

  it("mounts everything under eager, seen or not", () => {
    expect(mounted("eager", false, false)).toBe(true);
  });
});

describe("reading a stored value", () => {
  it("takes the caller's fallback rather than one of its own", () => {
    // An Overlay is shut most of the time and an Carousel is walked through, so the cheap end is
    // right for one and the sticky end for the other. The vocabulary has no opinion.
    expect(readPhiCmsMountPolicy(undefined, "remount")).toBe("remount");
    expect(readPhiCmsMountPolicy(undefined, "lazy-keep")).toBe("lazy-keep");
  });

  it("refuses every word of the two vocabularies it replaced", () => {
    /*
     * Including `keep`, which is the point. It was valid in both worlds with two different meanings,
     * so a stored one now lands on the fallback where somebody can see it, instead of quietly turning
     * "everything is mounted" into "only what was visited".
     */
    for (const legacy of ["on-open", "keep-alive", "active", "keep"]) {
      expect(readPhiCmsMountPolicy(legacy, "remount")).toBe("remount");
    }
  });

  it("keeps eager, which is the one word that survived unchanged", () => {
    expect(readPhiCmsMountPolicy("eager", "remount")).toBe("eager");
  });
});
