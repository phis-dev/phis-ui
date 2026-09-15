import { describe, expect, it } from "vitest";

import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import {
  listPhiBuilderNavigationFolderChoices,
  refreshPhiBuilderNavigationFolderAddresses,
  resolvePhiBuilderNavigationFolderAddress,
} from "./navigation-folder-address";

const id = (value: string) => value as PhiCmsInstanceId;

function link(key: string, path: string | null): PhiBuilderNavigationItem {
  return { id: id(key), source: "custom", ownerModuleId: null, kind: "link", label: key, href: path, hidden: false, children: [] };
}

function container(key: string, children: PhiBuilderNavigationItem[], folder?: PhiBuilderNavigationItem["folder"]): PhiBuilderNavigationItem {
  return {
    id: id(key), source: "custom", ownerModuleId: null, kind: "container", label: key, href: null, hidden: false,
    ...(folder ? { folder } : {}), children,
  };
}

const resolveLinkPath = (item: PhiBuilderNavigationItem) => item.href;

describe("resolvePhiBuilderNavigationFolderAddress", () => {
  it("is the folder the direct children share", () => {
    const docs = container("docs", [link("a", "/docs/a"), link("b", "/docs/b")]);
    expect(resolvePhiBuilderNavigationFolderAddress(docs, resolveLinkPath)).toBe("/docs");
  });

  it("counts a sub-container by its own address, so Docs holding only Guides is still /docs", () => {
    const docs = container("docs", [container("guides", [link("a", "/docs/guides/a")])]);
    expect(resolvePhiBuilderNavigationFolderAddress(docs, resolveLinkPath)).toBe("/docs");
  });

  it("keeps a namespaced module path whole", () => {
    const docs = container("docs", [link("a", "/phis/docs/start"), link("b", "/phis/docs/faq")]);
    expect(resolvePhiBuilderNavigationFolderAddress(docs, resolveLinkPath)).toBe("/phis/docs");
  });

  it("has none when the children lie in different folders or at the Area root", () => {
    expect(resolvePhiBuilderNavigationFolderAddress(
      container("mixed", [link("a", "/docs/a"), link("b", "/about/b")]), resolveLinkPath,
    )).toBeNull();
    expect(resolvePhiBuilderNavigationFolderAddress(
      container("root", [link("a", "/about"), link("b", "/contact")]), resolveLinkPath,
    )).toBeNull();
  });

  it("ignores children that stand for no path", () => {
    const docs = container("docs", [link("external", null), link("a", "/docs/a")]);
    expect(resolvePhiBuilderNavigationFolderAddress(docs, resolveLinkPath)).toBe("/docs");
  });
});

describe("listPhiBuilderNavigationFolderChoices", () => {
  it("offers the direct children, links and sub-containers, by the path each stands for", () => {
    const docs = container("docs", [
      container("guides", [link("a", "/docs/guides/a")]),
      link("api", "/docs/api"),
      link("external", null),
    ]);
    expect(listPhiBuilderNavigationFolderChoices(docs, resolveLinkPath)).toEqual([
      { value: "guides", label: "/docs/guides" },
      { value: "api", label: "/docs/api" },
    ]);
  });
});

describe("refreshPhiBuilderNavigationFolderAddresses", () => {
  it("updates a stored address to the children as they are now, and leaves the choice alone", () => {
    const items = [container("docs", [link("a", "/manual/a")], { address: "/docs", choice: id("gone") })];
    const [refreshed] = refreshPhiBuilderNavigationFolderAddresses(items, resolveLinkPath);
    expect(refreshed?.folder).toEqual({ address: "/manual", choice: "gone" });
  });

  it("returns the same objects when nothing changed", () => {
    const items = [container("docs", [link("a", "/docs/a")], { address: "/docs", choice: id("a") })];
    expect(refreshPhiBuilderNavigationFolderAddresses(items, resolveLinkPath)[0]).toBe(items[0]);
  });
});
