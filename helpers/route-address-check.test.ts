import { describe, expect, it } from "vitest";

import { checkPhiRouteAddresses } from "./route-address-check";

const route = (presetKey: string, path: string, area = "public" as const) => ({ area, path, presetKey });

describe("a Page is never a folder, among a Module's routes", () => {
  it("finds a route beneath another in the same Area", () => {
    const findings = checkPhiRouteAddresses([route("faq", "/faq"), route("hosting", "/faq/hosting")]);
    expect(findings.map(({ route: beneath, above }) => [beneath, above])).toEqual([["hosting", "faq"]]);
  });

  it("lets siblings stand, a parameter among them, and the root slot above everything", () => {
    expect(checkPhiRouteAddresses([
      route("root", "/"),
      route("overview", "/faq/overview"),
      route("hosting", "/faq/hosting"),
      route("entry", "/faq/:slug"),
    ])).toEqual([]);
  });

  it("lets a list's entries stand directly beneath the list, and nothing further down", () => {
    expect(checkPhiRouteAddresses([route("blog", "/blog"), route("post", "/blog/:slug")])).toEqual([]);
    expect(checkPhiRouteAddresses([route("blog", "/blog"), route("edit", "/blog/:slug/edit")])).toHaveLength(1);
    expect(checkPhiRouteAddresses([route("blog", "/blog"), route("archive", "/blog/archive")])).toHaveLength(1);
  });

  it("reads a parameter as a segment: a route beneath one is beneath it", () => {
    expect(checkPhiRouteAddresses([route("entry", "/docs/:slug"), route("edit", "/docs/:slug/edit")]))
      .toHaveLength(1);
  });

  it("compares within one Area: the same path in two Areas is two addresses", () => {
    expect(checkPhiRouteAddresses([route("public", "/docs"), route("admin", "/docs/a", "admin" as never)])).toEqual([]);
  });

});
