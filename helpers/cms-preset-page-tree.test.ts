import { describe, expect, it } from "vitest";

import type { PhiPresetPageNode } from "./cms-page-catalog";
import { insertPhiPresetPageTarget } from "./cms-preset-page-tree";

const route = (presetKey: string, path: string) => ({
  path,
  area: "public",
  title: presetKey,
  ownerModuleId: "@acme/site/modules/site" as const,
  presetKey,
  presetVersion: 1,
});

function tree(...routes: ReturnType<typeof route>[]) {
  const roots: PhiPresetPageNode[] = [];
  for (const entry of routes) insertPhiPresetPageTarget(roots, entry);
  return roots;
}

const shape = (nodes: readonly PhiPresetPageNode[]): unknown[] => nodes.map((node) => ({
  title: node.title,
  ...(node.storagePath ? {} : { folder: true }),
  ...(node.routeParameter ? { routeParameter: node.routeParameter } : {}),
  ...(node.children?.length ? { children: shape(node.children) } : {}),
}));

describe("a list and its entries in the Builder's Page tree", () => {
  it("hangs the entries beneath the list's Page, as their kind, whichever route comes first", () => {
    const expected = [{ title: "blog", children: [{ title: "post", routeParameter: "slug" }] }];
    expect(shape(tree(route("blog", "/blog"), route("post", "/blog/:slug")))).toEqual(expected);
    expect(shape(tree(route("post", "/blog/:slug"), route("blog", "/blog")))).toEqual(expected);
  });

  it("keeps a folder where no Page answers on its address", () => {
    expect(shape(tree(route("cart", "/shop/cart"), route("product", "/shop/product/:slug")))).toEqual([{
      title: "Shop",
      folder: true,
      children: [
        { title: "cart" },
        { title: "Product", folder: true, children: [{ title: "product", routeParameter: "slug" }] },
      ],
    }]);
  });

  it("draws one node for a Page and a folder of the same address, not two side by side", () => {
    expect(shape(tree(route("cart", "/shop/cart"), route("shop", "/shop")))).toEqual([
      { title: "shop", children: [{ title: "cart" }] },
    ]);
  });
});
