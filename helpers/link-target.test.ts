import { describe, expect, it } from "vitest";

import {
  createPhiPageReference,
  type PhiPageReference,
  type PhiResolvedLinkTargets,
} from "../types/references";
import { collectPhiLinkTargetReferences, resolvePhiLinkHref } from "./link-target";

const PAGE = createPhiPageReference({ kind: "site", pageScopeId: 41 });
const OTHER = createPhiPageReference({ kind: "site", pageScopeId: 42 });

const resolved = (entries: Array<readonly [PhiPageReference, string]>): PhiResolvedLinkTargets =>
  new Map(entries);

const askedFor = (value: unknown) =>
  [...collectPhiLinkTargetReferences(value).values()]
    .map((entry) => `${entry.area ?? "-"}|${entry.reference}`)
    .sort();

/**
 * What a render has to ask about before it draws anything.
 *
 * The collector is half of a pair: the server's indexes what a Page is pointed at by, this gathers what
 * this render has to resolve. Both go by the field name, and they have to agree -- a target one sees and
 * the other misses is either a link that draws nothing or a Page that outlives the guard on it.
 */
describe("the Pages a tree's configs point at", () => {
  it("finds a target wherever in a config it sits", () => {
    expect(askedFor({
      layoutNodes: [{ config: { linkTarget: { kind: "page", reference: PAGE } } }],
    })).toEqual([`-|${PAGE}`]);
  });

  it("finds a second link on the same Widget", () => {
    expect(askedFor({
      linkTarget: { kind: "page", reference: PAGE },
      actionLinkTarget: { kind: "page", reference: OTHER },
    })).toEqual([`-|${PAGE}`, `-|${OTHER}`].sort());
  });

  it("asks about each Page once, however many Widgets point at it", () => {
    expect(askedFor([
      { linkTarget: { kind: "page", reference: PAGE } },
      { linkTarget: { kind: "page", reference: PAGE } },
    ])).toEqual([`-|${PAGE}`]);
  });

  it("has nothing to ask about an external address", () => {
    expect(askedFor({ linkTarget: { kind: "external", href: "https://example.com" } })).toEqual([]);
  });

  /*
   * The same guard the index keeps. A target is read whole; descending into an external one would pick
   * up whatever was typed into its URL box and resolve a Page the Widget does not link to.
   */
  it("does not read a reserved scheme out of an external address", () => {
    expect(askedFor({ linkTarget: { kind: "external", href: `phis:page/${PAGE}` } })).toEqual([]);
  });

  /*
   * The Area travels with the reference, because the question is answered per Area: a resolver told the
   * wrong one finds nothing, and finding nothing reads exactly like the Page being gone. The same Page
   * asked about in two Areas is two questions, and only one of them has an answer.
   */
  it("carries the Area a target named, and asks separately where two differ", () => {
    expect(askedFor({
      linkTarget: { kind: "page", reference: PAGE, area: "admin" },
      actionLinkTarget: { kind: "page", reference: PAGE },
    })).toEqual([`-|${PAGE}`, `admin|${PAGE}`].sort());
  });

  it("drops an Area that is not one, which leaves the asking Area", () => {
    expect(askedFor({ linkTarget: { kind: "page", reference: PAGE, area: "nowhere" } }))
      .toEqual([`-|${PAGE}`]);
  });

  it("has nothing to ask about a config that links nowhere", () => {
    expect(askedFor({ title: "Pricing", href: "/pricing" })).toEqual([]);
  });
});

/**
 * Where a target leads once the render has its answers.
 *
 * `null` is a Control drawing no link at all, which is the contract's answer for a Page that did not
 * resolve: an unresolved reference renders non-interactive text. The alternative -- keeping the anchor
 * and pointing it somewhere plausible -- is how a deleted Page becomes a 404 a reader is invited to hit.
 */
describe("where a link target leads", () => {
  it("takes an external address as it stands", () => {
    expect(resolvePhiLinkHref({ kind: "external", href: "https://example.com", newTab: true }))
      .toEqual({ href: "https://example.com", newTab: true, external: true });
  });

  it("takes the address the Page answers on now", () => {
    expect(resolvePhiLinkHref(
      { kind: "page", reference: PAGE },
      resolved([[PAGE, "/en/pricing"]]),
    )).toEqual({ href: "/en/pricing", newTab: false, external: false });
  });

  it("keeps the place inside the Page, which the move did not change", () => {
    expect(resolvePhiLinkHref(
      { kind: "page", reference: PAGE, fragment: "plans" },
      resolved([[PAGE, "/en/pricing"]]),
    )).toEqual({ href: "/en/pricing#plans", newTab: false, external: false });
  });

  it("draws no link for a Page that did not resolve", () => {
    expect(resolvePhiLinkHref({ kind: "page", reference: PAGE }, resolved([]))).toBeNull();
    expect(resolvePhiLinkHref({ kind: "page", reference: PAGE })).toBeNull();
  });

  it("draws no link where there is no target", () => {
    expect(resolvePhiLinkHref(null)).toBeNull();
    expect(resolvePhiLinkHref(undefined, resolved([[PAGE, "/en/pricing"]]))).toBeNull();
  });
});
