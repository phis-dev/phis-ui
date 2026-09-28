import { describe, expect, it } from "vitest";

import {
  createPhiPageReference,
  createPhiPresetCmsPageId,
  isPhiLinkTargetConfigKey,
  isPhiStorableExternalHref,
  readPhiLinkTarget,
  readPhiPageReference,
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

/**
 * What a Page reference is made of, and why it is as short as it is.
 *
 * It was base64-encoded JSON carrying the whole identity, which for a Module Page ran to 98 characters
 * in every body that linked to one. The envelope bought nothing it was credited with: encoding is not
 * signing, and Site and Area are revalidated on every resolution regardless. What it really bought was
 * a payload the server could unpack -- and the server stopped needing to, because a Module Page target
 * is not indexed and a Module Page already has a name both sides recompute.
 */
describe("a Page reference", () => {
  const MODULE_IDENTITY = {
    ownerModuleId: "@phis/ui/modules/public",
    presetKey: "public-contact-page",
  } as const;

  it("names a Site Page by the Scope id itself, because a foreign key has to read it", () => {
    const reference = createPhiPageReference({ kind: "site", pageScopeId: 41 });

    expect(reference).toBe("v1s41");
    expect(readPhiPageReference(reference)?.target).toEqual({ kind: "site", pageScopeId: 41 });
  });

  it("names a Module Page by the CMS Page id the whole house already derives", () => {
    const reference = createPhiPageReference({ kind: "module", ...MODULE_IDENTITY });

    expect(readPhiPageReference(reference)?.target)
      .toEqual({ kind: "module", pageId: createPhiPresetCmsPageId(MODULE_IDENTITY) });
  });

  /* The number that made this worth doing, kept where a change to it would be noticed. */
  it("is short enough to sit in a body without being the body", () => {
    expect(createPhiPageReference({ kind: "site", pageScopeId: 41 })).toHaveLength(5);
    expect(createPhiPageReference({ kind: "module", ...MODULE_IDENTITY })).toHaveLength(19);
  });

  /*
   * The long form does not quietly still work. Nothing was written in it, and a reader that accepted
   * both would be the fallback the house does not keep -- two formats, one of them unreachable from
   * anything that writes, and no way to tell which a stored value came from.
   */
  it("does not read the form it replaced", () => {
    expect(readPhiPageReference(
      "v1.eyJ2IjoxLCJrIjoibSIsIm0iOiJAcGhpcy91aS9tb2R1bGVzL3B1YmxpYyIsInAiOiJwdWJsaWMtY29udGFjdC1wYWdlIn0",
    )).toBeNull();
  });

  it("reads nothing out of a tag it does not know, or a body that does not fit it", () => {
    for (const value of ["v1x41", "v1s0", "v1s", "v1s41x", "v1pnope", "v1p", "41", "", null]) {
      expect(readPhiPageReference(value)).toBeNull();
    }
  });

  /*
   * Checked when the reference is made, because afterwards nobody can. A malformed owner id hashes
   * perfectly well and yields a reference that resolves to nothing, for a reason the token no longer
   * carries -- the one real cost of a one-way id, paid at the only place that still sees what went in.
   */
  it("refuses a malformed Module id while it can still say so", () => {
    expect(() => createPhiPageReference({
      kind: "module",
      ownerModuleId: "phis/ui/modules/public",
      presetKey: "public-contact-page",
    })).toThrow(/Module id/);
  });

  it("refuses a Page Scope id that is not one", () => {
    for (const pageScopeId of [0, -1, 1.5, Number.NaN]) {
      expect(() => createPhiPageReference({ kind: "site", pageScopeId })).toThrow(/Page Scope/);
    }
  });
});
