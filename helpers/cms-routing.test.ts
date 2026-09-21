import { describe, expect, it } from "vitest";

import { canonicalHrefUnlessCurrent } from "./cms-routing";

/*
 * The forward that costs nothing to get wrong and everything to leave wrong.
 *
 * A canonical address naming the address that asked for it is not a mistake anyone sees. The client
 * applies the forward, asks again and is told the same thing -- and where the forward is streamed into
 * a client navigation rather than answered with a status, nothing counts the hops: no browser redirect
 * limit is reached, because from the browser's side these are not redirects. Measured on a Site whose
 * Area switch did this, it ran at some thirty-five navigations per second in a production build.
 *
 * So the property worth holding is not "the roots differ" but "the answer never names its own caller",
 * and it is worth holding in a test because the two are the same thing only until somebody changes how
 * either side is built.
 */
describe("canonicalHrefUnlessCurrent", () => {
  it("says nothing when the canonical address is the one that asked", () => {
    expect(canonicalHrefUnlessCurrent("/en/contact", "/en/contact")).toBeNull();
  });

  it("says nothing at an Area root either", () => {
    expect(canonicalHrefUnlessCurrent("/app", "/app")).toBeNull();
  });

  it("names the canonical address when the request used another one", () => {
    expect(canonicalHrefUnlessCurrent("/en/contact", "/de/contact")).toBe("/en/contact");
  });

  it("does not treat a prefix as the same address", () => {
    expect(canonicalHrefUnlessCurrent("/en/contact", "/en")).toBe("/en/contact");
    expect(canonicalHrefUnlessCurrent("/en", "/en/contact")).toBe("/en");
  });

  /*
   * Case matters here, and that is deliberate rather than overlooked: both sides are built from
   * segments that have already been normalised, so two spellings arriving different means the request
   * really did name something else, and the forward onto the normalised spelling is the point.
   */
  it("forwards a request that differs only in spelling", () => {
    expect(canonicalHrefUnlessCurrent("/en/contact", "/EN/contact")).toBe("/en/contact");
  });
});
