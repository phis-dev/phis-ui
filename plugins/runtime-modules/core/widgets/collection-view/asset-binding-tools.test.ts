import { describe, expect, it } from "vitest";

import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import {
  PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS,
  PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY,
} from "../../../../../constants/media-library-provider-keys";
import { PhiMediaDeliveryPolicy, PhiMediaLifecycleStatus } from "../../../../../constants/media";
import type { PhiCollectionProviderResourceDescriptor } from "../../../../../types/collection-provider";
import { readPhiMediaCollectionItems } from "../../../../../components/media/phi-image-preview-data";
import { PHI_MEDIA_LIBRARY_ASSET_RESOURCE } from "../../../../../components/media/media-library-resource";
import { isPhiConfigError } from "../../../../../components/widgets/config/strict-config-reader";
import { collectPhiRuntimeDataProviderKeys } from "../../../resolver";
import { PHI_COLLECTION_VIEW_WIDGET_DEFINITION } from "./config";
import { readPhiMediaRendererResourceActions, readPhiMediaRendererToolFailure } from "./asset-binding-tools";

/**
 * The Media renderer for any Collection of Assets: its tools follow what the bound resource declares,
 * its items are read in the Media tile shape, its settings (`features.media`) are read strictly, and a
 * Page that places it mounts the Media library its picker and upload read.
 */

const gallery = {
  resourceKey: "listing-pictures",
  title: "Gallery",
  itemIdentityPath: "id",
  itemRendererKey: PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY,
  query: { search: false, pagination: false },
  actions: [
    { key: "add", title: "Add", scope: "resource" },
    { key: "delete", title: "Remove", scope: "item" },
    { key: "reorder", title: "Order", scope: "resource" },
    { key: "upload", title: "Upload", scope: "resource", panelKey: "upload" },
  ],
  panels: [{ key: "upload", title: "Upload" }],
} satisfies PhiCollectionProviderResourceDescriptor;

// The Media library's own resource, as the Asset Module declares it.
const library = PHI_MEDIA_LIBRARY_ASSET_RESOURCE;

function features(input: {
  toolbar?: string[];
  filters?: { key: string; actions?: string[] }[];
}) {
  return {
    features: {
      tools: { mode: "self-contained" as const },
      actions: { toolbar: (input.toolbar ?? []).map((key) => ({ key })) },
      filters: (input.filters ?? []).map((filter) => ({
        key: filter.key,
        control: "cascader" as const,
        actions: (filter.actions ?? []).map((key) => ({ key })),
      })),
    },
  };
}

describe("the Media renderer's tools", () => {
  it("are drawn where the resource declares them", () => {
    expect(readPhiMediaRendererToolFailure({ config: features({ toolbar: ["upload", "add"] }), resource: gallery })).toBeNull();
    expect(readPhiMediaRendererToolFailure({
      config: features({ toolbar: ["upload"], filters: [{ key: "folderId", actions: ["lockFolder", "createFolder"] }] }),
      resource: library,
    })).toBeNull();
  });

  it("refuse a Folder tool, a lock or a pick the resource does not declare", () => {
    expect(readPhiMediaRendererToolFailure({ config: features({ filters: [{ key: "folderId" }] }), resource: gallery }))
      .toBe('The bound resource declares no filter "folderId".');
    expect(readPhiMediaRendererToolFailure({ config: features({ toolbar: ["add"] }), resource: library }))
      .toBe('The bound resource declares no action "add".');
    const lockOnly = { ...library, actions: library.actions.filter((action) => action.key !== "unlockFolder") };
    expect(readPhiMediaRendererToolFailure({
      config: features({ filters: [{ key: "folderId", actions: ["lockFolder"] }] }),
      resource: lockOnly,
    })).toBe('The bound resource declares no action "unlockFolder".');
  });

  it("refuse an upload whose action opens no upload panel, and a tool it has no control for", () => {
    const noPanel = { ...gallery, actions: gallery.actions.map((action) => action.key === "upload" ? { ...action, panelKey: undefined } : action) };
    expect(readPhiMediaRendererToolFailure({ config: features({ toolbar: ["upload"] }), resource: noPanel }))
      .toBe('The bound resource\'s "upload" action opens no "upload" panel.');
    expect(readPhiMediaRendererToolFailure({ config: features({ toolbar: ["export"] }), resource: gallery }))
      .toBe('Asset collection action "export" is not supported.');
  });

  it("declare nothing where the Area declares no resource", () => {
    expect(readPhiMediaRendererToolFailure({ config: features({ toolbar: ["upload"] }), resource: null }))
      .toBe('The bound resource declares no action "upload".');
    expect(readPhiMediaRendererResourceActions(null)).toEqual({ delete: false, add: false });
    expect(readPhiMediaRendererResourceActions(gallery)).toEqual({ delete: true, add: true });
    expect(readPhiMediaRendererResourceActions(library)).toEqual({ delete: true, add: false });
  });
});

describe("a Collection's items as Media tiles", () => {
  const item = {
    id: 7,
    originalName: "shoe.png",
    title: null,
    altText: null,
    deliveryUrl: "/media/7/shoe.png",
    thumbnailUrl: "/media/7/thumb.webp",
    previewUrl: null,
    blurDataUrl: null,
    contentType: "image/png",
    kind: "image",
    width: 800,
    height: 600,
    lifecycleStatus: PhiMediaLifecycleStatus.Ready,
    deliveryPolicy: PhiMediaDeliveryPolicy.Public,
  };

  it("are read field by field, a Folder only where an item has one", () => {
    expect(readPhiMediaCollectionItems([item], "The gallery")).toEqual([item]);
    expect(readPhiMediaCollectionItems([{ ...item, folderId: 3 }], "The gallery")[0]?.folderId).toBe(3);
    expect(readPhiMediaCollectionItems([{ ...item, deliveryUrl: "" }], "The gallery")[0]?.deliveryUrl).toBe("");
  });

  it("are refused with the field named where one is missing or of the wrong type", () => {
    expect(() => readPhiMediaCollectionItems([{ ...item, kind: undefined }], "The gallery")).toThrow(/items\[0\]\.kind/u);
    expect(() => readPhiMediaCollectionItems([{ ...item, id: "7" }], "The gallery")).toThrow(/items\[0\]\.id/u);
    expect(() => readPhiMediaCollectionItems([{ ...item, deliveryUrl: null }], "The gallery")).toThrow(/deliveryUrl/u);
  });
});

describe("features.media", () => {
  const parse = (media: unknown) => PHI_COLLECTION_VIEW_WIDGET_DEFINITION.parseConfig({ features: { media } }).features.media;

  it("is read as written", () => {
    expect(parse({ folderPath: " Shop Images / {category} / {product} ", mediaType: "image", publicOnly: true }))
      .toEqual({ folderPath: "Shop Images / {category} / {product}", mediaType: "image", publicOnly: true });
    expect(parse(undefined)).toBeUndefined();
  });

  it("refuses a broken placeholder, an unknown kind and a publicOnly that is not a boolean", () => {
    for (const media of [{ folderPath: "Shop / {category" }, { mediaType: "picture" }, { publicOnly: "yes" }]) {
      let failure: unknown = null;
      try {
        parse(media);
      } catch (error) {
        failure = error;
      }
      expect(isPhiConfigError(failure)).toBe(true);
    }
  });
});

describe("the Media library a Media-rendered Collection reads", () => {
  const collection = PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection;
  const galleryProvider = "@acme/shop/collections/gallery";

  function scan(config: Record<string, unknown>, rendererKey: string = PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY) {
    const moduleSet = {
      dataProviderDescriptorsByKey: new Map<string, unknown>([
        [collection, { key: collection, kind: "collection", resources: [] }],
        [galleryProvider, { key: galleryProvider, kind: "collection", resources: [{ ...gallery, itemRendererKey: rendererKey }] }],
      ]),
      widgetDefinitionsByType: new Map(),
      formDefinitionsById: new Map(),
    };
    return collectPhiRuntimeDataProviderKeys({
      moduleSet: moduleSet as never,
      trees: [{ contentWidgets: [{ widgetType: PhiCmsWidgetType.CollectionView, config }], layoutNodes: [] }] as never,
    });
  }

  it("is mounted for a Collection whose resource names the Media renderer", () => {
    const keys = scan({ source: { providerKey: galleryProvider, resourceKey: "listing-pictures" } });
    expect(keys.has(collection)).toBe(true);
    expect(keys.has(galleryProvider as never)).toBe(true);
  });

  it("is mounted where the placement names the Media renderer, and not for another renderer", () => {
    const source = { providerKey: galleryProvider, resourceKey: "listing-pictures" };
    expect(scan({ source, itemRendererKey: PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY }, "@acme/shop/renderers/card").has(collection)).toBe(true);
    expect(scan({ source }, "@acme/shop/renderers/card").has(collection)).toBe(false);
  });
});
