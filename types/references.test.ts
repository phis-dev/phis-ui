import { describe, expect, it } from "vitest";

import {
  createPhiPageReference,
  isPhiLinkTargetConfigKey,
  isPhiStorableExternalHref,
  readPhiLinkTarget,
} from "./references";

const PAGE = createPhiPageReference({ kind: "site", pageScopeId: 41 });
const MODULE_PAGE = createPhiPageReference({
  kind: "module",
  ownerModuleId: "@acme/shop/modules/site",
  presetKey: "pricing-page",
});

/**
 * What a Widget is allowed to have written down as a link.
 *
 * The reader is where the contract has teeth. A target that is merely shaped like one -- a path somebody
 * typed, a reference that no longer parses -- has to answer `null` here rather than further down, because
 * everything after this point treats what it gets as a target somebody chose: it is indexed, it is
 * resolved, and it is drawn as a link. A path that slipped through would be a link the delete guard
 * cannot see and the resolver cannot move.
 */
describe("a link target read back from stored config", () => {
  it("keeps a Page named by reference", () => {
    expect(readPhiLinkTarget({ kind: "page", reference: PAGE }))
      .toEqual({ kind: "page", reference: PAGE });
  });

  it("keeps a Module Page the same way, because identity is the only difference", () => {
    expect(readPhiLinkTarget({ kind: "page", reference: MODULE_PAGE }))
      .toEqual({ kind: "page", reference: MODULE_PAGE });
  });

  it("carries a fragment without its hash, and drops an empty one", () => {
    expect(readPhiLinkTarget({ kind: "page", reference: PAGE, fragment: "#pricing" }))
      .toEqual({ kind: "page", reference: PAGE, fragment: "pricing" });
    expect(readPhiLinkTarget({ kind: "page", reference: PAGE, fragment: "  " }))
      .toEqual({ kind: "page", reference: PAGE });
  });

  it("refuses a reference that no longer parses", () => {
    expect(readPhiLinkTarget({ kind: "page", reference: "v1.not-a-reference" })).toBeNull();
    expect(readPhiLinkTarget({ kind: "page", reference: "/pricing" })).toBeNull();
  });

  it("keeps an external address as the literal URL it is", () => {
    expect(readPhiLinkTarget({ kind: "external", href: "https://example.com/pricing" }))
      .toEqual({ kind: "external", href: "https://example.com/pricing" });
  });

  /*
   * The middle shape, which is the one the contract exists to refuse. `/pricing` reads as an ordinary
   * external address and means a Page, so nothing about it announces that it has thrown its identity
   * away -- until the Page moves and the link stays behind.
   */
  it("refuses a root-relative path dressed as an external address", () => {
    expect(readPhiLinkTarget({ kind: "external", href: "/pricing" })).toBeNull();
    expect(readPhiLinkTarget({ kind: "external", href: "en/pricing" })).toBeNull();
  });

  it("refuses the reserved scheme in the field where a literal URL belongs", () => {
    expect(readPhiLinkTarget({ kind: "external", href: `phis:page/${PAGE}` })).toBeNull();
    expect(readPhiLinkTarget({ kind: "external", href: "PHIS:page/anything" })).toBeNull();
  });

  it("carries the new-tab decision on the target itself, and only when it was made", () => {
    expect(readPhiLinkTarget({ kind: "external", href: "https://example.com", newTab: true }))
      .toEqual({ kind: "external", href: "https://example.com", newTab: true });
    expect(readPhiLinkTarget({ kind: "external", href: "https://example.com", newTab: false }))
      .toEqual({ kind: "external", href: "https://example.com" });
  });

  it("answers nothing for anything that is not one of the two kinds", () => {
    for (const value of [null, undefined, "https://example.com", 41, [], {}, { kind: "asset", assetId: 1 }]) {
      expect(readPhiLinkTarget(value)).toBeNull();
    }
  });
});

/**
 * Which addresses may be written down as external at all.
 *
 * Separate from whether an address renders as a plain anchor: a string can be perfectly renderable and
 * still be one the Site is forbidden to keep, and folding the two questions together is how the
 * root-relative form gets back in through the rendering door.
 */
describe("an address offered as external", () => {
  it("takes an absolute address, a protocol-relative one, mail and telephone", () => {
    for (const href of [
      "https://example.com",
      "http://example.com",
      "//example.com/logo.svg",
      "mailto:hello@example.com",
      "tel:+49301234567",
    ]) {
      expect(isPhiStorableExternalHref(href)).toBe(true);
    }
  });

  /* A fragment is not a second Page format: it names a place in the document already open. */
  it("takes an anchor on the document the reader already has", () => {
    expect(isPhiStorableExternalHref("#pricing")).toBe(true);
  });

  it("takes nothing that is merely a path", () => {
    for (const href of ["/pricing", "pricing", "../pricing", "", "   "]) {
      expect(isPhiStorableExternalHref(href)).toBe(false);
    }
  });
});

/**
 * The names the reference collector goes by.
 *
 * The server reads persisted config and has no Widget catalogue to ask, so the field name is the whole
 * of what tells it a target is there. A Widget that invents a name authors a link nothing guards.
 */
describe("the field a link target may stand under", () => {
  it("is the plain name, or one that ends in it", () => {
    expect(isPhiLinkTargetConfigKey("linkTarget")).toBe(true);
    expect(isPhiLinkTargetConfigKey("actionLinkTarget")).toBe(true);
  });

  it("is not a name that merely contains it, and not the suffix alone", () => {
    expect(isPhiLinkTargetConfigKey("linkTargetLabel")).toBe(false);
    expect(isPhiLinkTargetConfigKey("LinkTarget")).toBe(false);
    expect(isPhiLinkTargetConfigKey("href")).toBe(false);
  });
});
