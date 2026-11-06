import { describe, expect, it } from "vitest";

import type { PhiRuntimeModuleDataProviderDescriptor } from "../../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../../types/runtime-data-provider";
import { readPhiCollectionViewDeclaredFailure } from "./collection-source-failure";

const providerKey = "assets/library" as PhiRuntimeDataProviderKey;
const descriptors = new Map([[providerKey, {
  key: providerKey,
  kind: "collection",
  resources: [{ resourceKey: "assets", itemRendererKey: "assets/card" }],
} as unknown as PhiRuntimeModuleDataProviderDescriptor]]);
const source = { providerKey, resourceKey: "assets", params: {} };

/** What the Builder can say about a Collection View's binding without reading any of its data. */
describe("a Collection View's declared failure", () => {
  it("names a missing source, an absent provider and an absent resource", () => {
    const judge = (input: Partial<Parameters<typeof readPhiCollectionViewDeclaredFailure>[0]>) =>
      readPhiCollectionViewDeclaredFailure({
        source,
        itemRendererKey: null,
        dataProviderDescriptorsByKey: descriptors,
        itemRendererKeys: null,
        ...input,
      });
    expect(judge({})).toBeNull();
    expect(judge({ source: null })).toBe("Collection data provider is not configured.");
    expect(judge({ dataProviderDescriptorsByKey: new Map() })).toContain('provider "assets/library"');
    expect(judge({ source: { ...source, resourceKey: "folders" } })).toContain('resource "folders"');
  });

  it("judges a chosen renderer only against renderers it was told about", () => {
    const judge = (itemRendererKey: string, itemRendererKeys: ReadonlySet<string> | null) =>
      readPhiCollectionViewDeclaredFailure({
        source,
        itemRendererKey,
        dataProviderDescriptorsByKey: descriptors,
        itemRendererKeys,
      });
    expect(judge("other/card", new Set(["assets/card"]))).toContain('Item renderer "other/card"');
    expect(judge("other/card", new Set(["other/card"]))).toBeNull();
    expect(judge("other/card", null)).toBeNull();
    // The resource's own renderer belongs to the provider just found active.
    expect(judge("assets/card", new Set())).toBeNull();
  });
});
