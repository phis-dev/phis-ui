import { describe, expect, it, vi } from "vitest";

/*
 * What a page is told when a Module cannot answer for its features.
 *
 * Absent features leave a condition `unavailable`, and `unavailable` is also what a node waiting for the
 * browser reads -- so a resolver that threw used to be indistinguishable from a node that had not been
 * decided yet. The resolution now names the namespaces that have no answer, and the log carries the
 * failure; the renderer turns the names into a diagnostic in a workspace.
 */

vi.mock("server-only", () => ({}));
vi.mock("./phi-runtime", () => ({
  phiRuntime: () => ({ apiBaseUrl: "http://core.test", internalToken: "token", siteKey: "site" }),
}));

import { collectPhiCmsFeatureNamespaces, resolvePhiCmsTreeFeatures } from "./cms-node-features";
import type { PhiCmsContentWidgetNode, PhiResolvedCmsRenderableTree } from "../types/cms";

function widget(visibleWhen: unknown): PhiCmsContentWidgetNode {
  return { config: { visibleWhen } } as unknown as PhiCmsContentWidgetNode;
}

function treeWith(...widgets: PhiCmsContentWidgetNode[]) {
  return {
    layoutNodes: [],
    overlays: [],
    contentWidgets: widgets,
  } as unknown as Pick<PhiResolvedCmsRenderableTree, "layoutNodes" | "contentWidgets" | "overlays">;
}

const runtime = {
  site: { key: "site" },
  locale: { current: "en" },
  area: "public",
} as unknown as Parameters<typeof resolvePhiCmsTreeFeatures>[2];

const authCondition = { source: "feature", valuePath: "auth.password", operator: "truthy" };
const shopCondition = { source: "feature", valuePath: "shop.checkout", operator: "truthy" };

describe("collectPhiCmsFeatureNamespaces", () => {
  it("reads the namespace off every feature condition and nothing else", () => {
    const namespaces = collectPhiCmsFeatureNamespaces(treeWith(
      widget(authCondition),
      widget({ source: "page", valuePath: "query.tab", operator: "equals", value: "x" }),
      widget({ match: "all", conditions: [shopCondition, authCondition] }),
    ));
    expect([...namespaces].sort()).toEqual(["auth", "shop"]);
  });
});

describe("resolvePhiCmsTreeFeatures", () => {
  it("asks nothing and names no failure for a tree without feature conditions", async () => {
    const resolution = await resolvePhiCmsTreeFeatures(
      treeWith(widget(null)),
      { featureResolverLoadersByNamespace: new Map() },
      runtime,
    );
    expect(resolution).toEqual({ features: null, failures: new Map() });
  });

  it("names a namespace whose resolver threw, beside the answers that arrived", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const resolution = await resolvePhiCmsTreeFeatures(
      treeWith(widget(authCondition), widget(shopCondition)),
      {
        featureResolverLoadersByNamespace: new Map([
          ["auth", async () => async () => ({ password: true })],
          ["shop", async () => async () => {
            throw new Error("checkout service is down");
          }],
        ]),
      },
      runtime,
    );
    expect(resolution.features).toEqual({ auth: { password: true } });
    expect(resolution.failures.get("shop")).toBe("checkout service is down");
    expect(resolution.failures.has("auth")).toBe(false);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain("cms.features.resolve_failed");
    error.mockRestore();
  });

  it("names a namespace no active Module publishes", async () => {
    const resolution = await resolvePhiCmsTreeFeatures(
      treeWith(widget(shopCondition)),
      { featureResolverLoadersByNamespace: new Map() },
      runtime,
    );
    expect(resolution.features).toEqual({});
    expect(resolution.failures.get("shop")).toMatch(/No active Module publishes/);
  });
});
