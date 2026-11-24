import { describe, expect, it, vi } from "vitest";

import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsRoutePresetBinding, PhiCmsRoutePresetDescriptor } from "../../types/cms-module-descriptors";
import type { PhiResolvedCmsPageTree } from "../../types/cms";
import { compilePhiCmsRoutePattern, instantiatePhiCmsRoutePreset } from "./descriptor-compiler";

/*
 * A route's own meta (THIRD_PARTY_MODULES.md, route presets): the description and the share picture fill
 * in what the tree leaves out, the description translated as the title is, the picture resolved by the
 * key of the package's own media.
 */

const ownerModuleId = "@acme/site/modules/site";
const runtime = { site: { key: "site", id: 1 }, locale: { current: "de" }, area: "public" } as unknown as PhiBlockRuntime;
const catalog = { formDefinitionsById: new Map() } as never;

function descriptor(
  overrides: Partial<PhiCmsRoutePresetDescriptor> = {},
  tree: Partial<PhiResolvedCmsPageTree> = {},
  layoutConfig?: Record<string, unknown>,
) {
  return {
    ownerModuleId,
    presetKey: "landing",
    presetVersion: 1,
    area: "public",
    path: "/",
    title: "Welcome",
    loadTree: ({ page }) => ({
      page: layoutConfig ? { ...page, layoutConfig } : page,
      regions: [],
      overlays: [],
      layoutNodes: [],
      contentWidgets: [],
      ...tree,
    }),
    ...overrides,
  } as PhiCmsRoutePresetDescriptor;
}

async function instantiate(route: PhiCmsRoutePresetDescriptor, assets: Record<string, number> = {}) {
  const loadModuleMedia = vi.fn(async () => ({ assets: { "@acme/site": assets }, folders: {} }));
  const tree = await instantiatePhiCmsRoutePreset({
    binding: { descriptor: route, params: {} } as PhiCmsRoutePresetBinding,
    catalog,
    activeModuleIds: new Set(),
    siteId: 1,
    path: "/",
    runtime,
    loadModuleMedia,
    translateRouteText: (source) => `de:${source}`,
  });
  return { tree, loadModuleMedia };
}

describe("a route's own meta", () => {
  it("gives the Page the route's description and share picture, the description translated", async () => {
    const { tree } = await instantiate(
      descriptor({ description: "What we do.", shareImage: { asset: "share" } }),
      { share: 42 },
    );
    expect(tree.pageMeta).toEqual({
      title: { msgId: 0, source: "Welcome", value: "de:Welcome" },
      description: { msgId: 0, source: "What we do.", value: "de:What we do." },
    });
    expect(tree.page.layoutConfig).toEqual({ shareImage: { assetId: 42 } });
  });

  it("leaves what the tree states standing, and asks for no picture the tree already names", async () => {
    const { tree } = await instantiate(descriptor(
      { description: "What we do.", shareImage: { asset: "share" } },
      { pageMeta: { title: null, description: { msgId: 0, source: "Own.", value: "Eigen." } } },
    ));
    expect(tree.pageMeta?.description?.value).toBe("Eigen.");

    const named = await instantiate(descriptor({ shareImage: { asset: "share" } }, {}, { shareImage: { assetId: 7 } }));
    expect(named.tree.page.layoutConfig).toEqual({ shareImage: { assetId: 7 } });
    expect(named.loadModuleMedia).not.toHaveBeenCalled();
  });

  it("states no picture the Site has not imported", async () => {
    const { tree } = await instantiate(descriptor({ shareImage: { asset: "share" } }), {});
    expect(tree.page.layoutConfig).toEqual({});
    expect(tree.pageMeta?.description).toBeNull();
  });

  it("refuses an empty description or a share picture without a key", () => {
    expect(() => compilePhiCmsRoutePattern(descriptor({ description: " " }))).toThrow(/description must not be empty/);
    expect(() => compilePhiCmsRoutePattern(descriptor({ shareImage: { asset: "" } }))).toThrow(/share image must name/);
  });
});
