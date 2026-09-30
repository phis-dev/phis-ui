import { describe, expect, it } from "vitest";

import { isPhiNavPathActive } from "./nav-selection";

/*
 * A CMS path can carry a locale and an Area at once. Stripping only whichever came first left
 * `/de/admin/users` looking like a different page from `/admin/users`.
 */
describe("which nav entry is the current page", () => {
  const locales = ["de", "en"];

  it("strips the locale and then the Area", () => {
    expect(isPhiNavPathActive("/de/admin/users", "/admin/users", locales)).toBe(true);
    expect(isPhiNavPathActive("/de/admin/users/7", "/users", locales)).toBe(true);
    expect(isPhiNavPathActive("/admin/users", "/de/admin/users", locales)).toBe(true);
  });

  it("strips either prefix on its own", () => {
    expect(isPhiNavPathActive("/de/about", "/about", locales)).toBe(true);
    expect(isPhiNavPathActive("/public/about", "/about", locales)).toBe(true);
  });

  it("does not take an Area segment after the page for a prefix", () => {
    expect(isPhiNavPathActive("/de/about/admin", "/admin", locales)).toBe(false);
  });
});
