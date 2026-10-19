import { describe, expect, it } from "vitest";

import {
  collectPhiCmsRegionPageScopeReferences,
  phiCmsRegionPageScopeIncludes,
  readPhiCmsRegionPageScope,
  readPhiCmsRegionReveal,
  resolvePhiCmsRegionPageScope,
} from "./region-page-scope";
import { PhiCmsRegionPageScopeEntryFlag } from "../types/cms-presets";
import { createPhiPageReference, type PhiPageReference } from "../types/references";

/*
 * Which Pages a Shell Region stands on (SHELL.md "Region visibility per Page"). Pages are named by
 * reference and come back as the address they lead to now; a folder is the start of its Pages' paths and
 * takes everything below it. The cases pinned here are the ones an author would not see coming.
 */
const about = createPhiPageReference({ kind: "site", pageScopeId: 11 });
const gone = createPhiPageReference({ kind: "site", pageScopeId: 12 });
const docs = createPhiPageReference({ kind: "site", pageScopeId: 13 });
const locales = ["de", "en"];

function links(entries: Array<[PhiPageReference, string]>) {
  return new Map(entries);
}

describe("Region Page scope", () => {
  it("is no rule for every Page, or for a Page Region", () => {
    expect(readPhiCmsRegionPageScope("header_top", {})).toBeNull();
    expect(readPhiCmsRegionPageScope("header_top", { pageScope: { mode: "all" } })).toBeNull();
    expect(readPhiCmsRegionPageScope("header_bottom", { pageScope: { mode: "root" } })).toBeNull();
  });

  it("stands on the Area's own start page for `root`", () => {
    const scope = resolvePhiCmsRegionPageScope({ mode: "root" }, null, locales);
    expect(phiCmsRegionPageScopeIncludes(scope, "/")).toBe(true);
    expect(phiCmsRegionPageScopeIncludes(scope, "/about")).toBe(false);
  });

  it("follows a Page to the address it has now", () => {
    const stored = readPhiCmsRegionPageScope("header_top", {
      pageScope: { mode: "include", entries: [{ pageLinkTarget: { kind: "page", reference: about } }] },
    });
    expect(collectPhiCmsRegionPageScopeReferences(stored)).toEqual([about]);
    const scope = resolvePhiCmsRegionPageScope(stored, links([[about, "/de/ueber-uns"]]), locales);
    expect(phiCmsRegionPageScopeIncludes(scope, "/ueber-uns")).toBe(true);
    expect(phiCmsRegionPageScopeIncludes(scope, "/ueber-uns/team")).toBe(false);
  });

  it("takes everything below a folder, and below a Page marked as a subtree", () => {
    const scope = resolvePhiCmsRegionPageScope(
      readPhiCmsRegionPageScope("sider_left", {
        pageScope: {
          mode: "exclude",
          entries: [
            { folder: "blog/" },
            { pageLinkTarget: { kind: "page", reference: docs }, flags: PhiCmsRegionPageScopeEntryFlag.Subtree },
          ],
        },
      }),
      links([[docs, "/app/docs"]]),
      locales,
    );
    expect(phiCmsRegionPageScopeIncludes(scope, "/blog/first-post")).toBe(false);
    expect(phiCmsRegionPageScopeIncludes(scope, "/blogroll")).toBe(true);
    expect(phiCmsRegionPageScopeIncludes(scope, "/docs/setup")).toBe(false);
    expect(phiCmsRegionPageScopeIncludes(scope, "/")).toBe(true);
  });

  /*
   * A Page deleted or a Module switched off drops out of the list; nothing left is no rule, because an
   * author who named Pages that are gone did not ask for a Region on no Page.
   */
  it("stands on every Page once nothing it named resolves any more", () => {
    const stored = readPhiCmsRegionPageScope("header_top", {
      pageScope: { mode: "include", entries: [{ pageLinkTarget: { kind: "page", reference: gone } }] },
    });
    expect(resolvePhiCmsRegionPageScope(stored, links([]), locales)).toBeNull();
  });
});

describe("Region reveal", () => {
  it("belongs to `header_top` alone", () => {
    expect(readPhiCmsRegionReveal("header_top", { reveal: "hover" })).toBe("hover");
    expect(readPhiCmsRegionReveal("header_main", { reveal: "hover" })).toBe("always");
    expect(readPhiCmsRegionReveal("header_top", { reveal: "sideways" as never })).toBe("always");
  });
});
