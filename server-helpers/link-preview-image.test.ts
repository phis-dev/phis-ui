import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ resolveSiteInternalReferences: vi.fn() }));
vi.mock("../gateway/internal-references", () => ({
  resolveSiteInternalReferences: mocks.resolveSiteInternalReferences,
}));

import { readPhiMediaDeliveryAssetId, resolvePhiLinkPreviewImage } from "./link-preview-image";

/*
 * The picture of a link preview (NEXT_INTEGRATION.md, "Link previews"): the first candidate the public
 * reference projection answers, as its 1200 x 630 share variant on the Site's own address.
 */

function asset(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    deliveryUrl: `/api/site/media/${id}/content`,
    deliveryRevision: 3,
    variantVersion: 2,
    contentType: "image/png",
    kind: "image",
    originalName: "picture.png",
    width: 2400,
    height: 1600,
    blurDataUrl: null,
    title: "Picture title",
    altText: "Picture alt",
    thumbnailUrl: null,
    previewUrl: null,
    focalRect: null,
    font: null,
    ...overrides,
  };
}

const request = {
  apiBaseUrl: "http://core.test",
  internalToken: "token",
  siteKey: "site",
  publicBase: "https://phis.dev",
  fallbackAlt: "Contact",
};

describe("resolvePhiLinkPreviewImage", () => {
  beforeEach(() => {
    mocks.resolveSiteInternalReferences.mockReset();
  });

  it("takes the first candidate the projection answers, as its share variant", async () => {
    // 4 is not public (absent), 5 is: the record's picture gives way to the Page's own.
    mocks.resolveSiteInternalReferences.mockResolvedValue({ pages: [], assets: new Map([[5, asset(5)], [6, asset(6)]]) });
    const image = await resolvePhiLinkPreviewImage({
      ...request,
      candidates: [{ assetId: 4 }, null, { assetId: 5, alt: "Our office" }, { assetId: 6 }],
    });
    expect(mocks.resolveSiteInternalReferences).toHaveBeenCalledWith(expect.objectContaining({ assetIds: [4, 5, 6] }));
    expect(image).toEqual({
      url: "https://phis.dev/api/site/media/5/variants/11?v=2&r=3",
      width: 1200,
      height: 630,
      alt: "Our office",
      type: "image/jpeg",
    });
  });

  it("says what the Asset says where the candidate does not, and the preview's title last", async () => {
    mocks.resolveSiteInternalReferences.mockResolvedValue({ pages: [], assets: new Map([[5, asset(5)]]) });
    expect(await resolvePhiLinkPreviewImage({ ...request, candidates: [{ assetId: 5 }] }))
      .toMatchObject({ alt: "Picture alt" });
    mocks.resolveSiteInternalReferences.mockResolvedValue({
      pages: [],
      assets: new Map([[5, asset(5, { altText: null, title: null })]]),
    });
    expect(await resolvePhiLinkPreviewImage({ ...request, candidates: [{ assetId: 5 }] }))
      .toMatchObject({ alt: "Contact" });
  });

  it("shows no Asset that is no image, and asks nothing without a candidate or a public base", async () => {
    mocks.resolveSiteInternalReferences.mockResolvedValue({ pages: [], assets: new Map([[5, asset(5, { kind: "pdf" })]]) });
    expect(await resolvePhiLinkPreviewImage({ ...request, candidates: [{ assetId: 5 }] })).toBeNull();
    mocks.resolveSiteInternalReferences.mockClear();
    expect(await resolvePhiLinkPreviewImage({ ...request, candidates: [null, null] })).toBeNull();
    expect(await resolvePhiLinkPreviewImage({ ...request, publicBase: null, candidates: [{ assetId: 5 }] })).toBeNull();
    expect(mocks.resolveSiteInternalReferences).not.toHaveBeenCalled();
  });
});

describe("readPhiMediaDeliveryAssetId", () => {
  it("reads the Asset of a Media delivery address of the Site", () => {
    expect(readPhiMediaDeliveryAssetId("/api/site/media/12/content?r=4", "https://phis.dev")).toBe(12);
    expect(readPhiMediaDeliveryAssetId("/api/site/media/12/variants/4?v=1", null)).toBe(12);
    expect(readPhiMediaDeliveryAssetId("https://phis.dev/api/site/media/12/content", "https://phis.dev")).toBe(12);
  });

  it("reads no Asset from any other address", () => {
    expect(readPhiMediaDeliveryAssetId("https://cdn.example/api/site/media/12/content", "https://phis.dev")).toBeNull();
    expect(readPhiMediaDeliveryAssetId("/api/site/media/0/content", null)).toBeNull();
    expect(readPhiMediaDeliveryAssetId("/media/12.png", null)).toBeNull();
    expect(readPhiMediaDeliveryAssetId("/api/site/media/12/subsets/1", null)).toBeNull();
  });
});
