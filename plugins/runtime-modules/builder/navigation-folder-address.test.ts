import { describe, expect, it } from "vitest";

import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiRuntimeModuleId } from "../../../types/cms-plugins";
import { createPhiPageReference, type PhiPageReference } from "../../../types/references";
import {
  applyPhiBuilderNavigationFolderTargets,
  findPhiBuilderNavigationFolderChoice,
  listPhiBuilderNavigationFolderChoices,
  refreshPhiBuilderNavigationFolderAddresses,
  resolvePhiBuilderNavigationFolderAddress,
} from "./navigation-folder-address";

const id = (value: string) => value as PhiCmsInstanceId;
const sitePage = (scopeId: number) => createPhiPageReference({ kind: "site", pageScopeId: scopeId });

function link(key: string, path: string | null, reference?: PhiPageReference): PhiBuilderNavigationItem {
  return {
    id: id(key), source: "custom", ownerModuleId: null, kind: "link", label: key, href: path, hidden: false,
    ...(reference ? { targetReference: reference } : {}), children: [],
  };
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
  it("offers what each direct child stands for: a Page by reference, a sub-container by address", () => {
    const docs = container("docs", [
      container("guides", [link("a", "/docs/guides/a", sitePage(3))]),
      link("api", "/docs/api", sitePage(4)),
      link("external", null),
    ]);
    expect(listPhiBuilderNavigationFolderChoices(docs, resolveLinkPath)).toEqual([
      { value: "folder:/docs/guides", label: "/docs/guides", target: { kind: "folder", address: "/docs/guides" } },
      { value: `page:${sitePage(4)}`, label: "/docs/api", target: { kind: "page", reference: sitePage(4) } },
    ]);
  });

  it("offers a Module link by the reference of its Page", () => {
    const moduleLink: PhiBuilderNavigationItem = {
      ...link("start", "/phis/docs/start"),
      source: "module",
      ownerModuleId: "@phis/ui/modules/docs" as PhiRuntimeModuleId,
      targetPreset: { ownerModuleId: "@phis/ui/modules/docs" as PhiRuntimeModuleId, presetKey: "start" },
    };
    const [choice] = listPhiBuilderNavigationFolderChoices(container("docs", [moduleLink]), resolveLinkPath);
    expect(choice?.target).toEqual({
      kind: "page",
      reference: createPhiPageReference({ kind: "module", ownerModuleId: "@phis/ui/modules/docs", presetKey: "start" }),
    });
  });

  it("offers a target once when two children stand for it", () => {
    const docs = container("docs", [link("a", "/docs/a", sitePage(5)), link("again", "/docs/a", sitePage(5))]);
    expect(listPhiBuilderNavigationFolderChoices(docs, resolveLinkPath)).toHaveLength(1);
  });
});

describe("findPhiBuilderNavigationFolderChoice", () => {
  it("matches a stored target to the child that stands for it, whichever Navigation wrote it", () => {
    const docs = container(
      "docs",
      [link("header-api", "/docs/api", sitePage(4)), container("header-guides", [link("x", "/docs/guides/x", sitePage(9))])],
      { address: "/docs", target: { kind: "folder", address: "/docs/guides" } },
    );
    expect(findPhiBuilderNavigationFolderChoice(docs, resolveLinkPath)?.value).toBe("folder:/docs/guides");
  });

  it("finds nothing, which reads as 404, when no child stands for the stored target", () => {
    const docs = container("docs", [link("api", "/docs/api", sitePage(4))], {
      address: "/docs",
      target: { kind: "page", reference: sitePage(99) },
    });
    expect(findPhiBuilderNavigationFolderChoice(docs, resolveLinkPath)).toBeNull();
  });
});

describe("refreshPhiBuilderNavigationFolderAddresses", () => {
  it("updates a stored address to the children as they are now, and leaves the target alone", () => {
    const target = { kind: "page" as const, reference: sitePage(7) };
    const [refreshed] = refreshPhiBuilderNavigationFolderAddresses(
      [container("docs", [link("a", "/manual/a")], { address: "/docs", target })],
      resolveLinkPath,
    );
    expect(refreshed?.folder).toEqual({ address: "/manual", target });
  });

  it("gives a container that has an address a folder without a target, so a carried target can find it", () => {
    const [refreshed] = refreshPhiBuilderNavigationFolderAddresses([container("docs", [link("a", "/docs/a")])], resolveLinkPath);
    expect(refreshed?.folder).toEqual({ address: "/docs", target: null });
  });

  it("drops a folder that has neither an address nor a target any more", () => {
    const [refreshed] = refreshPhiBuilderNavigationFolderAddresses(
      [container("mixed", [link("a", "/docs/a"), link("b", "/about/b")], { address: "/docs", target: null })],
      resolveLinkPath,
    );
    expect(refreshed?.folder).toBeNull();
  });

  it("returns the same objects when nothing changed", () => {
    const items = [container("docs", [link("a", "/docs/a")], { address: "/docs", target: { kind: "page", reference: sitePage(1) } })];
    expect(refreshPhiBuilderNavigationFolderAddresses(items, resolveLinkPath)[0]).toBe(items[0]);
  });
});

describe("applyPhiBuilderNavigationFolderTargets", () => {
  it("sets the target on every container standing for the folder, and leaves other folders alone", () => {
    const target = { kind: "folder" as const, address: "/docs/guides" };
    const items = [
      container("header-docs", [], { address: "/docs", target: null }),
      container("group", [container("nested-docs", [], { address: "/docs", target: null })]),
      container("manual", [], { address: "/manual", target: null }),
    ];
    const applied = applyPhiBuilderNavigationFolderTargets(items, [{ address: "/docs", target }]);
    expect(applied[0]?.folder).toEqual({ address: "/docs", target });
    expect(applied[1]?.children[0]?.folder).toEqual({ address: "/docs", target });
    expect(applied[2]).toBe(items[2]);
  });

  it("returns the same objects when every container already leads there", () => {
    const target = { kind: "page" as const, reference: sitePage(2) };
    const items = [container("docs", [], { address: "/docs", target })];
    expect(applyPhiBuilderNavigationFolderTargets(items, [{ address: "/docs", target }])).toBe(items);
  });
});
