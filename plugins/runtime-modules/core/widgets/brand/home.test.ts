import { describe, expect, it } from "vitest";

import { createPhiPageReference, type PhiResolvedLinkTargets } from "../../../../../types/references";
import type { PhiLinkTarget } from "../../../../../types/references";
import { resolvePhiBrandWidgetHome } from "./home";

const PAGE = createPhiPageReference({ kind: "site", pageScopeId: 41 });

const runtimeWith = (homeLinkTarget?: PhiLinkTarget) => ({
  locale: { current: "de" },
  site: { theme: { brand: homeLinkTarget ? { homeLinkTarget } : {} } },
}) as unknown as Parameters<typeof resolvePhiBrandWidgetHome>[0];

const links: PhiResolvedLinkTargets = new Map([[PAGE, "/de/ueber-uns"]]);

describe("where the Brand leads", () => {
  it("leads to the Site root in the language being read where the Theme names nothing", () => {
    expect(resolvePhiBrandWidgetHome(runtimeWith(), links))
      .toEqual({ href: "/de", newTab: false, external: false });
  });

  it("leads to the address the Page answers on now", () => {
    expect(resolvePhiBrandWidgetHome(runtimeWith({ kind: "page", reference: PAGE, area: "public" }), links))
      .toEqual({ href: "/de/ueber-uns", newTab: false, external: false });
  });

  it("leads to the Site root when the Page no longer resolves", () => {
    expect(resolvePhiBrandWidgetHome(runtimeWith({ kind: "page", reference: PAGE }), new Map()))
      .toEqual({ href: "/de", newTab: false, external: false });
    expect(resolvePhiBrandWidgetHome(runtimeWith({ kind: "page", reference: PAGE }), null))
      .toEqual({ href: "/de", newTab: false, external: false });
  });

  it("takes an external address as it stands", () => {
    expect(resolvePhiBrandWidgetHome(
      runtimeWith({ kind: "external", href: "https://example.com", newTab: true }),
      null,
    )).toEqual({ href: "https://example.com", newTab: true, external: true });
  });
});
