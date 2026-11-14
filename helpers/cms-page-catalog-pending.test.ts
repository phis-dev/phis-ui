import { describe, expect, it } from "vitest";

import { createPhiPageReference } from "../types/references";
import { formatPhiBuilderPagePathWithPending, resolvePhiBuilderActivePageCatalog } from "./cms-page-catalog";

/**
 * A rename waits for the publish. Until then the Page answers on its old address, and the Builder shows
 * both wherever it shows the address, so an author does not read the old path as a lost rename.
 */
describe("a pending Page address in the Builder catalog", () => {
  it("is carried from the persisted Page onto its catalog node", () => {
    const reference = createPhiPageReference({ kind: "site", pageScopeId: 41 });
    const catalog = resolvePhiBuilderActivePageCatalog("public", { public: [] }, null, {
      public: [{ id: 41, reference, path: "/about", pendingPath: "/team/", tombstoned: false }],
    });
    const node = catalog.flatMap(function walk(entry): typeof catalog {
      return [entry, ...(entry.children ?? []).flatMap(walk)];
    }).find((entry) => entry.pageScopeId === 41);
    expect(node?.pendingPath).toBe("/team");
  });

  it("is shown beside the current address, and not at all where there is none", () => {
    expect(formatPhiBuilderPagePathWithPending("/about", "/team")).toBe("/about → /team");
    expect(formatPhiBuilderPagePathWithPending("/about", null)).toBe("/about");
    expect(formatPhiBuilderPagePathWithPending("/about", "/about")).toBe("/about");
  });
});
