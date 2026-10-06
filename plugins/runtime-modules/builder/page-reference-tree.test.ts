import { describe, expect, it } from "vitest";

import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import { createPhiPageReference } from "../../../types/references";
import { buildPhiBuilderPageReferenceTree } from "./page-reference-tree";

const reference = (pageScopeId: number) => createPhiPageReference({ kind: "site", pageScopeId });

const MODULE_REFERENCE = createPhiPageReference({
  kind: "module",
  ownerModuleId: "@acme/shop/modules/site",
  presetKey: "pricing-page",
});

function page(input: Partial<PhiPresetPageNode> & { key: string; title: string }): PhiPresetPageNode {
  return { storagePath: `/${input.key}`, ...input };
}

const tree = (nodes: PhiPresetPageNode[]) => buildPhiBuilderPageReferenceTree("public", nodes, nodes);

/**
 * What the Page picker offers, and on what terms.
 *
 * The list this replaced handed back a value that had to be resolved against the catalogue again, which
 * is the shape that already cost a Page: read against a second copy, a path answers with whichever entry
 * that copy holds first, and the Builder opened a Page nobody had clicked. Here the node carries what it
 * stands for, so there is nothing to resolve and nothing to get wrong.
 */
describe("the Pages a link picker offers", () => {
  it("names each Page by its reference, and says which address it is", () => {
    const [node] = tree([page({ key: "pricing", title: "Pricing", reference: reference(41) })]);

    expect(node).toMatchObject({
      value: reference(41),
      label: "Pricing",
      description: "/pricing",
      meta: { reference: reference(41), title: "Pricing", path: "/pricing" },
    });
  });

  it("names a Module Page the same way, because identity is the only difference", () => {
    const [node] = tree([page({ key: "pricing", title: "Pricing", reference: MODULE_REFERENCE })]);

    expect(node?.value).toBe(MODULE_REFERENCE);
    expect(node?.meta?.reference).toBe(MODULE_REFERENCE);
  });

  it("keeps the nesting, which is what tells two Pages of the same name apart", () => {
    const [shop] = tree([
      page({
        key: "shop",
        title: "Shop",
        reference: reference(1),
        children: [page({ key: "overview", title: "Overview", reference: reference(2) })],
      }),
    ]);

    expect(shop?.children?.[0]).toMatchObject({ label: "Overview", value: reference(2) });
  });

  /*
   * A path that carries no Page of its own is structure, not a target. Leaving it out would take the
   * branch its children hang from with it.
   */
  it("leaves a Page-less path standing, unchoosable, with its children reachable", () => {
    const [docs] = tree([
      page({
        key: "docs",
        title: "Docs",
        children: [page({ key: "guides", title: "Guides", reference: reference(7) })],
      }),
    ]);

    expect(docs).toMatchObject({ disabled: true });
    expect(docs?.meta).toBeUndefined();
    expect(docs?.children?.[0]).toMatchObject({ value: reference(7) });
  });

  /*
   * A published deletion keeps its Page Scope and its address, so the node stays -- but nothing new may
   * be pointed at it. The contract has Authoring resolve an existing reference to a deleted diagnostic;
   * offering a fresh one would author the diagnostic on purpose.
   */
  it("refuses a Page whose deletion has been published, and keeps it visible", () => {
    const [node] = tree([
      page({ key: "old", title: "Old", reference: reference(9), tombstoned: true }),
    ]);

    expect(node).toMatchObject({ label: "Old", value: "old", disabled: true });
    expect(node?.meta).toBeUndefined();
  });

  it("marks the root as the landing, so it is not a second Home beside /home", () => {
    const [root, home] = tree([
      page({ key: "welcome", title: "Home", storagePath: "/", reference: reference(1) }),
      page({ key: "home", title: "Home", reference: reference(2) }),
    ]);

    expect(root).toMatchObject({ label: "Home (Landing page)", meta: { title: "Home" } });
    expect(home).toMatchObject({ label: "Home" });
  });

  it("names an untitled root by its slot alone", () => {
    const [root] = tree([page({ key: "welcome", title: " ", storagePath: "/", reference: reference(1) })]);

    expect(root?.label).toBe("(Landing page)");
  });

  it("carries the Area into the address it shows", () => {
    const nodes = [page({ key: "users", title: "Users", reference: reference(3) })];
    const [node] = buildPhiBuilderPageReferenceTree("admin", nodes, nodes);

    expect(node?.description).toBe("/admin/users");
  });
});
