import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPhiBreadcrumbPathItems } from "./client";
import { listPhiBreadcrumbFolderPaths } from "./server";

describe("breadcrumb path segments", () => {
  it("names the folders a Page lies in, not the Page itself", () => {
    expect(listPhiBreadcrumbFolderPaths("/docs/guides/a")).toEqual(["/docs", "/docs/guides"]);
    expect(listPhiBreadcrumbFolderPaths("/a")).toEqual([]);
  });

  it("links exactly the folders that lead to a Page, keeping the visitor's prefix", () => {
    const items = buildPhiBreadcrumbPathItems("/de/app/docs/guides/a", "/docs/guides/a", ["/docs"]);
    expect(items).toEqual([
      { key: "/docs", title: "docs", href: "/de/app/docs" },
      { key: "/docs/guides", title: "guides" },
      { key: "/docs/guides/a", title: "a" },
    ]);
  });

  it("links nothing when the address does not end with the Page path", () => {
    const items = buildPhiBreadcrumbPathItems("/elsewhere", "/docs/a", ["/docs"]);
    expect(items.every((item) => !("href" in item))).toBe(true);
  });

  it("puts the record's title on the last item only, keeping the folders and their links", () => {
    const items = buildPhiBreadcrumbPathItems("/de/app/docs/chair", "/docs/chair", ["/docs"], "  The Chair ");
    expect(items).toEqual([
      { key: "/docs", title: "docs", href: "/de/app/docs" },
      { key: "/docs/chair", title: "The Chair" },
    ]);
  });

  it("keeps the segment where the title is empty or absent", () => {
    for (const title of [undefined, null, "", "   "]) {
      expect(buildPhiBreadcrumbPathItems("/docs/chair%20x", "/docs/chair%20x", [], title).at(-1))
        .toEqual({ key: "/docs/chair%20x", title: "chair x" });
    }
  });
});
