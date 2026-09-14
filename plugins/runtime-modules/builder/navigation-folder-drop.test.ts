import { describe, expect, it } from "vitest";

import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";
import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import type { PhiPageReference } from "../../../types/references";
import {
  buildPhiBuilderNavigationContainerFromCatalogFolder,
  findPhiBuilderCatalogNode,
  type PhiBuilderCatalogNavigationFactory,
} from "./navigation-folder-drop";

type Id = PhiBuilderNavigationItem["id"];

function page(key: string, title: string, children?: PhiPresetPageNode[], tombstoned = false): PhiPresetPageNode {
  return { key, title, reference: `ref:${key}` as PhiPageReference, tombstoned, children };
}

function folder(key: string, title: string, children: PhiPresetPageNode[]): PhiPresetPageNode {
  return { key, title, children };
}

/** Records allocation order and reduces items to what the drop decides: kind, label and nesting. */
function createFactory() {
  let sequence = 0;
  const factory: PhiBuilderCatalogNavigationFactory = {
    allocateId: async () => `id-${++sequence}` as Id,
    createPageItem: (id, node) => ({
      id, source: "custom", ownerModuleId: null, kind: "link", label: node.title,
      href: `/${node.key}`, hidden: false, children: [],
    }),
    createContainerItem: (id, label, children) => ({
      id, source: "custom", ownerModuleId: null, kind: "container", label,
      href: null, hidden: false, children,
    }),
  };
  return factory;
}

type Shape = { id: string; kind: string; label: string; children?: Shape[] };

function shape(item: PhiBuilderNavigationItem | null): Shape | null {
  if (!item) return null;
  return {
    id: String(item.id),
    kind: item.kind,
    label: item.label,
    ...(item.children.length > 0 ? { children: item.children.map((child) => shape(child)!) } : {}),
  };
}

describe("buildPhiBuilderNavigationContainerFromCatalogFolder", () => {
  it("brings a folder's Pages along as links inside a container named after it", async () => {
    const error = folder("error", "Error", [page("error/404", "Not found"), page("error/500", "Server error")]);

    expect(shape(await buildPhiBuilderNavigationContainerFromCatalogFolder(error, createFactory()))).toEqual({
      id: "id-1", kind: "container", label: "Error",
      children: [
        { id: "id-2", kind: "link", label: "Not found" },
        { id: "id-3", kind: "link", label: "Server error" },
      ],
    });
  });

  it("turns a sub-folder into a nested container", async () => {
    const docs = folder("docs", "Docs", [folder("docs/guides", "Guides", [page("docs/guides/start", "Start")])]);

    expect(shape(await buildPhiBuilderNavigationContainerFromCatalogFolder(docs, createFactory()))).toEqual({
      id: "id-1", kind: "container", label: "Docs",
      children: [{
        id: "id-2", kind: "container", label: "Guides",
        children: [{ id: "id-3", kind: "link", label: "Start" }],
      }],
    });
  });

  it("wraps a Page with Pages beneath it in a container that links the Page first", async () => {
    const docs = folder("docs", "Docs", [page("docs/api", "API", [page("docs/api/v1", "v1")])]);

    expect(shape(await buildPhiBuilderNavigationContainerFromCatalogFolder(docs, createFactory()))).toEqual({
      id: "id-1", kind: "container", label: "Docs",
      children: [{
        id: "id-2", kind: "container", label: "API",
        children: [
          { id: "id-3", kind: "link", label: "API" },
          { id: "id-4", kind: "link", label: "v1" },
        ],
      }],
    });
  });

  it("leaves deleted Pages out but keeps what lives beneath them, one level up", async () => {
    const shop = folder("shop", "Shop", [page("shop/old", "Old", [page("shop/old/item", "Item")], true)]);

    expect(shape(await buildPhiBuilderNavigationContainerFromCatalogFolder(shop, createFactory()))).toEqual({
      id: "id-1", kind: "container", label: "Shop",
      children: [{ id: "id-2", kind: "link", label: "Item" }],
    });
  });

  it("builds nothing, and allocates nothing, for a folder with no live Page beneath it", async () => {
    const factory = createFactory();
    const empty = folder("gone", "Gone", [page("gone/a", "A", undefined, true), folder("gone/b", "B", [])]);

    expect(await buildPhiBuilderNavigationContainerFromCatalogFolder(empty, factory)).toBeNull();
    expect(await factory.allocateId()).toBe("id-1");
  });

  it("refuses a Page, which is dropped as a link rather than as a folder", async () => {
    expect(await buildPhiBuilderNavigationContainerFromCatalogFolder(page("about", "About"), createFactory())).toBeNull();
  });
});

describe("findPhiBuilderCatalogNode", () => {
  it("finds a node at any depth by its catalog key", () => {
    const catalog = [page("about", "About"), folder("error", "Error", [page("error/404", "Not found")])];

    expect(findPhiBuilderCatalogNode(catalog, "error/404")?.title).toBe("Not found");
    expect(findPhiBuilderCatalogNode(catalog, "error")?.title).toBe("Error");
    expect(findPhiBuilderCatalogNode(catalog, "missing")).toBeNull();
  });
});
