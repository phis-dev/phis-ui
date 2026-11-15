import { describe, expect, it } from "vitest";

import { resolvePhiBuilderActivePageKey, type PhiPresetPageNode } from "./cms-page-catalog";

/*
 * `/shop/product/:slug` and `/shop/cart` make the folders `shop` and `product`; a folder is no Page, and a
 * workspace opened on one drew a Page with empty Regions.
 */
const pages: PhiPresetPageNode[] = [
  { key: "home", title: "Home", storagePath: "/home" },
  {
    key: "shop",
    title: "Shop",
    children: [
      { key: "cart", title: "Cart", storagePath: "/shop/cart" },
      { key: "product", title: "Product", children: [{ key: "page-product", title: "Product", storagePath: "/shop/product/:slug" }] },
    ],
  },
];

describe("the Builder's active Page", () => {
  it("keeps a Page that is asked for", () => {
    expect(resolvePhiBuilderActivePageKey("page-product", pages)).toBe("page-product");
  });

  it("opens the first Page inside a folder rather than the folder", () => {
    expect(resolvePhiBuilderActivePageKey("product", pages)).toBe("page-product");
    expect(resolvePhiBuilderActivePageKey("shop", pages)).toBe("cart");
  });

  it("falls back to the first Page for a key nobody knows", () => {
    expect(resolvePhiBuilderActivePageKey("nope", pages)).toBe("home");
  });
});
