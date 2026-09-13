import { describe, expect, it } from "vitest";

import { buildPhiAreaPageMetadata } from "./phi-metadata";

/**
 * What an Area writes into the head of one of its Pages.
 *
 * The title is absolute on purpose: the Root Layout states a template for the whole Site, and an Area
 * that stated its own has to replace it rather than be wrapped by it. These say what "replace" means
 * in each of the cases an Area can be in.
 */
describe("the head of a Page in an Area", () => {
  it("puts the Page's own title into the Area's template", () => {
    expect(buildPhiAreaPageMetadata({
      area: "public",
      meta: { titleTemplate: "%s — Phi Systems" },
      siteName: "phis.dev",
      pageTitle: "Contact",
    }).title).toEqual({ absolute: "Contact — Phi Systems" });
  });

  it("appends the Site's name when the Area stated no template", () => {
    // What the Root Layout has always done, restated because the title is absolute from here on.
    expect(buildPhiAreaPageMetadata({
      area: "public",
      meta: null,
      siteName: "phis.dev",
      pageTitle: "Contact",
    }).title).toEqual({ absolute: "Contact | phis.dev" });
  });

  it("gives a Page without a title of its own the Area's default rather than the template", () => {
    expect(buildPhiAreaPageMetadata({
      area: "admin",
      meta: { titleTemplate: "%s — Phi", defaultTitle: "Administration" },
      siteName: "phis.dev",
      pageTitle: "  ",
    }).title).toEqual({ absolute: "Administration" });
  });

  it("falls back to the Site's name when the Area named no default either", () => {
    expect(buildPhiAreaPageMetadata({
      area: "public",
      meta: {},
      siteName: "phis.dev",
    }).title).toEqual({ absolute: "phis.dev" });
  });

  it("keeps every authenticated Area out of the index whatever is stored", () => {
    // Only Public is ever asked, so a stored `index: true` from Public cannot leak into the Admin.
    expect(buildPhiAreaPageMetadata({
      area: "admin",
      meta: { index: true },
      siteName: "phis.dev",
    }).robots).toEqual({ index: false, follow: false });
  });

  it("lets Public be found unless it said otherwise", () => {
    expect(buildPhiAreaPageMetadata({ area: "public", meta: null, siteName: "phis.dev" }).robots)
      .toBeUndefined();
    expect(buildPhiAreaPageMetadata({
      area: "public",
      meta: { index: false },
      siteName: "phis.dev",
    }).robots).toEqual({ index: false, follow: false });
  });

  it("lets one Public Page withdraw itself from an open Area", () => {
    // What a sign-in Form is: the Area wants to be found, this Page does not.
    expect(buildPhiAreaPageMetadata({
      area: "public",
      meta: null,
      siteName: "phis.dev",
      pageTitle: "Login",
      pageNoindex: true,
    }).robots).toEqual({ index: false, follow: false });
  });

  it("does not let a Page reopen an Area that was closed", () => {
    // The two rungs only ever add up. A Page that never asked to stay out is not an argument for
    // going in, in Public or anywhere else.
    expect(buildPhiAreaPageMetadata({
      area: "public",
      meta: { index: false },
      siteName: "phis.dev",
      pageNoindex: false,
    }).robots).toEqual({ index: false, follow: false });
    expect(buildPhiAreaPageMetadata({
      area: "admin",
      meta: { index: true },
      siteName: "phis.dev",
      pageNoindex: false,
    }).robots).toEqual({ index: false, follow: false });
  });

  const address = {
    publicBase: "https://phis.dev",
    path: "/kontakt",
    locale: "de",
    availableLocales: ["de", "en"],
    defaultLocale: "en",
  };

  it("names an indexable Public Page's own address and every language version of it", () => {
    expect(buildPhiAreaPageMetadata({ area: "public", meta: null, publicAddress: address }).alternates).toEqual({
      canonical: "https://phis.dev/de/kontakt",
      languages: {
        de: "https://phis.dev/de/kontakt",
        en: "https://phis.dev/en/kontakt",
        "x-default": "https://phis.dev/en/kontakt",
      },
    });
  });

  it("names no address for a Page that stays out of the index, or outside Public", () => {
    expect(buildPhiAreaPageMetadata({
      area: "public",
      meta: null,
      pageNoindex: true,
      publicAddress: address,
    }).alternates).toBeUndefined();
    expect(buildPhiAreaPageMetadata({ area: "admin", meta: null, publicAddress: address }).alternates)
      .toBeUndefined();
  });

  it("names no address when the Site has no public base to put in front of it", () => {
    expect(buildPhiAreaPageMetadata({
      area: "public",
      meta: null,
      publicAddress: { ...address, publicBase: null },
    }).alternates).toBeUndefined();
  });
});
