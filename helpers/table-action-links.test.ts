import { describe, expect, it } from "vitest";

import { createPhiPageReference } from "../types/references";
import type { PhiTableActionDefinition } from "../types/table-widget";
import { resolvePhiTableActionLinks } from "./table-action-links";
import { resolvePhiTableRowActionLink } from "./table-action-row-link";

const reference = createPhiPageReference({ kind: "site", pageScopeId: 3 });
const action = (extra: Partial<PhiTableActionDefinition>): PhiTableActionDefinition => ({
  key: "open", label: "Open", execution: "link", ...extra,
});

describe("a Table action that leads somewhere", () => {
  it("carries the address its target resolved to, or none for a Page that did not resolve", () => {
    const [toPage, toAddress, signal] = resolvePhiTableActionLinks([
      action({ linkTarget: { kind: "page", reference } }),
      action({ key: "docs", linkTarget: { kind: "external", href: "https://example.org", newTab: true } }),
      action({ key: "emit", execution: "signal" }),
    ], new Map([[reference, "/orders"]]))!;
    expect(toPage!.link).toEqual({ href: "/orders", newTab: false, external: false });
    expect(toAddress!.link).toEqual({ href: "https://example.org", newTab: true, external: true });
    expect(signal).not.toHaveProperty("link");
    expect(resolvePhiTableActionLinks([action({ linkTarget: { kind: "page", reference } })], new Map())![0]!.link).toBeNull();
  });

  it("takes a row's own address where it reads one, and a new tab opens as an anchor", () => {
    const rowAction = action({ hrefPath: "reviewHref", newTab: true });
    expect(resolvePhiTableRowActionLink(rowAction, "/editor/review/4").link).toEqual({ href: "/editor/review/4", newTab: true, external: true });
    expect(resolvePhiTableRowActionLink(action({ hrefPath: "url" }), "https://github.com/x").link)
      .toEqual({ href: "https://github.com/x", newTab: false, external: true });
    expect(resolvePhiTableRowActionLink(rowAction, "")).toBe(rowAction);
    expect(resolvePhiTableRowActionLink(action({}), "/ignored")).not.toHaveProperty("link");
  });
});
