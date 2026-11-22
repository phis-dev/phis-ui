import { describe, expect, it } from "vitest";

import { PhiMediaDeliveryPolicy, PhiMediaKind, PhiMediaLifecycleStatus } from "../../../constants/media";
import { isPhiConfigError } from "../../../components/widgets/config/strict-config-reader";
import type { PhiMediaCollectionItem } from "../../../types/media";
import { PHI_MEDIA_ASSETS_FIELD_MOST } from "./form-providers";
import {
  addPhiMediaAssetsFieldIds,
  orderPhiMediaAssetsFieldTiles,
  readPhiMediaAssetsFieldConfig,
  readPhiMediaAssetsFieldValue,
} from "./media-assets-field";

function configError(config: Record<string, unknown>) {
  try {
    readPhiMediaAssetsFieldConfig(config);
  } catch (error) {
    return isPhiConfigError(error) ? error.path : `not a config error: ${String(error)}`;
  }
  return "read without an error";
}

function tile(id: number): PhiMediaCollectionItem {
  return {
    id,
    kind: PhiMediaKind.Image,
    originalName: `${id}.png`,
    title: null,
    altText: null,
    contentType: "image/png",
    deliveryUrl: `/media/${id}.png`,
    thumbnailUrl: null,
    previewUrl: null,
    blurDataUrl: null,
    deliveryPolicy: PhiMediaDeliveryPolicy.Public,
    lifecycleStatus: PhiMediaLifecycleStatus.Ready,
    width: 10,
    height: 10,
  };
}

describe("the media-assets field's config", () => {
  it("offers images into no Folder, up to the most the list answers, when nothing is set", () => {
    expect(readPhiMediaAssetsFieldConfig(undefined))
      .toEqual({ mediaType: PhiMediaKind.Image, folderPath: [], max: PHI_MEDIA_ASSETS_FIELD_MOST });
  });

  it("reads the kind, the Folder path and max as media-asset reads its own", () => {
    expect(readPhiMediaAssetsFieldConfig({ mediaType: PhiMediaKind.Pdf, folderPath: " Shop Images / {product} ", max: 8 }))
      .toEqual({ mediaType: PhiMediaKind.Pdf, folderPath: ["Shop Images", "{product}"], max: 8 });
  });

  it("refuses a max that is no whole number from 1 to the most, and what media-asset refuses, naming the field", () => {
    expect(configError({ max: 0 })).toBe("config.max");
    expect(configError({ max: 2.5 })).toBe("config.max");
    expect(configError({ max: "8" })).toBe("config.max");
    expect(configError({ max: PHI_MEDIA_ASSETS_FIELD_MOST + 1 })).toBe("config.max");
    expect(configError({ mediaType: PhiMediaKind.Archive })).toBe("config.mediaType");
    expect(configError({ folderPath: "Shop / {a" })).toBe("config.folderPath");
  });

  it("knows no publicOnly: the Site Space is public from the start", () => {
    expect(readPhiMediaAssetsFieldConfig({})).not.toHaveProperty("publicOnly");
  });
});

describe("the media-assets field's value", () => {
  it("is the Asset ids in order, each once, and none for anything that is no list", () => {
    expect(readPhiMediaAssetsFieldValue([3, 1, 2])).toEqual([3, 1, 2]);
    expect(readPhiMediaAssetsFieldValue([3, 1, 3])).toEqual([3, 1]);
    expect(readPhiMediaAssetsFieldValue([3, "4", 0, 1.5, null, 5])).toEqual([3, 5]);
    expect(readPhiMediaAssetsFieldValue(undefined)).toEqual([]);
    expect(readPhiMediaAssetsFieldValue(null)).toEqual([]);
    expect(readPhiMediaAssetsFieldValue(42)).toEqual([]);
  });

  it("adds at its end what it does not hold yet, while there is room", () => {
    expect(addPhiMediaAssetsFieldIds([1, 2], [3], 5)).toEqual({ ids: [1, 2, 3], refused: [] });
    expect(addPhiMediaAssetsFieldIds([1, 2], [2, 3], 5)).toEqual({ ids: [1, 2, 3], refused: [] });
    expect(addPhiMediaAssetsFieldIds([1, 2], [3, 4, 5], 3)).toEqual({ ids: [1, 2, 3], refused: [4, 5] });
    expect(addPhiMediaAssetsFieldIds([1, 2, 3], [4], 2)).toEqual({ ids: [1, 2, 3], refused: [4] });
  });
});

describe("the tiles of the value", () => {
  it("follow the value's order, not the answer's, and stand in for an id the list did not answer", () => {
    const answered = new Map([[2, tile(2)], [1, tile(1)]]);
    const shown = orderPhiMediaAssetsFieldTiles([1, 9, 2], answered, "The file could not be read.");
    expect(shown.map(({ tile: entry }) => entry.id)).toEqual([1, 9, 2]);
    expect(shown.map(({ available }) => available)).toEqual([true, false, true]);
    const missing = shown[1]!.tile;
    expect(missing.originalName).toBe("The file could not be read.");
    expect(missing.deliveryUrl).toBe("");
    // Not an image: the tile draws the kind's icon instead of asking for a picture that is not there.
    expect(missing.kind).not.toBe(PhiMediaKind.Image);
  });
});
