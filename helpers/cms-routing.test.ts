import { describe, expect, it } from "vitest";

import { canonicalHrefUnlessCurrent, isPhiReservedCmsRoot } from "./cms-routing";

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

/*
 * Which first segments the Site is allowed to read as an address of its own.
 *
 * Anything that is neither an Area nor a locale is an unprefixed Public address and gets forwarded to
 * the default locale. That rule is what sends `/imprint` to `/en/imprint`, and it used to swallow the
 * framework's own trees with it: a static asset that was merely missing fell out of the file handler,
 * matched the catch-all, and was answered with a forward to the Site's home page -- so a browser asking
 * for a script was handed HTML, and every stale chunk after a deploy paid for a root resolution to say
 * it.
 *
 * Both halves are worth holding. A reserved root that stopped being refused brings the forward back;
 * a locale or an Area that started being refused takes the Site down.
 */
describe("isPhiReservedCmsRoot", () => {
  it("refuses the framework's own roots", () => {
    expect(isPhiReservedCmsRoot("_next")).toBe(true);
    expect(isPhiReservedCmsRoot("api")).toBe(true);
  });

  it("refuses a first segment that names a file", () => {
    expect(isPhiReservedCmsRoot("favicon.ico")).toBe(true);
    expect(isPhiReservedCmsRoot("robots.txt")).toBe(true);
    expect(isPhiReservedCmsRoot("sitemap.xml")).toBe(true);
  });

  // A root arrives from the URL, so it arrives in whatever case and padding the request carried.
  it("reads a root the way the request spelled it", () => {
    expect(isPhiReservedCmsRoot("_NEXT")).toBe(true);
    expect(isPhiReservedCmsRoot(" _next ")).toBe(true);
  });

  it("leaves Areas, locales and Public addresses alone", () => {
    for (const root of ["public", "app", "admin", "builder", "editor", "accounting"]) {
      expect(isPhiReservedCmsRoot(root)).toBe(false);
    }
    expect(isPhiReservedCmsRoot("en")).toBe(false);
    expect(isPhiReservedCmsRoot("de-ch")).toBe(false);
    expect(isPhiReservedCmsRoot("imprint")).toBe(false);
  });
});
