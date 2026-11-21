import { describe, expect, it } from "vitest";

import { PhiMediaDeliveryPolicy, PhiMediaKind, PhiMediaLifecycleStatus } from "../../../constants/media";
import { isPhiConfigError } from "../../../components/widgets/config/strict-config-reader";
import {
  isPhiMediaAssetFieldSelectable,
  readPhiMediaAssetFieldConfig,
  readPhiMediaAssetFieldUploadRefusal,
  readPhiMediaAssetFieldValue,
  resolvePhiMediaAssetFieldFolderPath,
} from "./media-asset-field";

function configError(config: Record<string, unknown> | undefined) {
  try {
    readPhiMediaAssetFieldConfig(config);
  } catch (error) {
    return isPhiConfigError(error) ? error.path : `not a config error: ${String(error)}`;
  }
  return "read without an error";
}

describe("the media-asset field's config", () => {
  it("offers images, and every Asset, when nothing is set", () => {
    const none = { mediaType: PhiMediaKind.Image, publicOnly: false, folderPath: [] };
    expect(readPhiMediaAssetFieldConfig(undefined)).toEqual(none);
    expect(readPhiMediaAssetFieldConfig({})).toEqual(none);
  });

  it("reads the kind and publicOnly as written", () => {
    expect(readPhiMediaAssetFieldConfig({ mediaType: PhiMediaKind.Pdf, publicOnly: true }))
      .toEqual({ mediaType: PhiMediaKind.Pdf, publicOnly: true, folderPath: [] });
  });

  it("reads the Folder path as names from the root, and a blank one as none", () => {
    expect(readPhiMediaAssetFieldConfig({ folderPath: " Shop Images /  Products " }).folderPath)
      .toEqual(["Shop Images", "Products"]);
    expect(readPhiMediaAssetFieldConfig({ folderPath: " / " }).folderPath).toEqual([]);
  });

  it("refuses a kind the picker does not list and a publicOnly that is no boolean, naming the field", () => {
    expect(configError({ mediaType: "imag" })).toBe("config.mediaType");
    expect(configError({ mediaType: PhiMediaKind.Archive })).toBe("config.mediaType");
    expect(configError({ publicOnly: "yes" })).toBe("config.publicOnly");
    expect(configError({ folderPath: ["Shop Images"] })).toBe("config.folderPath");
    expect(configError({ folderPath: "Shop Images / {}" })).toBe("config.folderPath");
    expect(configError({ folderPath: "Shop Images / {category" })).toBe("config.folderPath");
    expect(configError({ folderPath: "Shop Images / category}" })).toBe("config.folderPath");
    expect(configError({ folderPath: "Shop Images / {a{b}}" })).toBe("config.folderPath");
  });
});

describe("the media-asset field's value", () => {
  it("is an Asset id as a number, and null for anything else", () => {
    expect(readPhiMediaAssetFieldValue(42)).toBe(42);
    expect(readPhiMediaAssetFieldValue(null)).toBeNull();
    expect(readPhiMediaAssetFieldValue(undefined)).toBeNull();
    expect(readPhiMediaAssetFieldValue("42")).toBeNull();
    expect(readPhiMediaAssetFieldValue(0)).toBeNull();
    expect(readPhiMediaAssetFieldValue(1.5)).toBeNull();
    expect(readPhiMediaAssetFieldValue([42])).toBeNull();
  });
});

describe("which Assets the picker lets be chosen", () => {
  const ready = PhiMediaLifecycleStatus.Ready;
  const publicAsset = { deliveryPolicy: PhiMediaDeliveryPolicy.Public, lifecycleStatus: ready };
  const privateAsset = { deliveryPolicy: PhiMediaDeliveryPolicy.Authenticated, lifecycleStatus: ready };

  it("lets every Asset be chosen unless the field is publicOnly", () => {
    const config = readPhiMediaAssetFieldConfig({});
    expect(isPhiMediaAssetFieldSelectable(config, publicAsset)).toBe(true);
    expect(isPhiMediaAssetFieldSelectable(config, privateAsset)).toBe(true);
  });

  it("lets only a public, ready Asset be chosen when the field is publicOnly", () => {
    const config = readPhiMediaAssetFieldConfig({ publicOnly: true });
    expect(isPhiMediaAssetFieldSelectable(config, publicAsset)).toBe(true);
    expect(isPhiMediaAssetFieldSelectable(config, privateAsset)).toBe(false);
    expect(isPhiMediaAssetFieldSelectable(config, { ...publicAsset, lifecycleStatus: PhiMediaLifecycleStatus.Pending })).toBe(false);
  });
});

describe("what an upload in the picker made", () => {
  const ready = PhiMediaLifecycleStatus.Ready;
  const image = { kind: PhiMediaKind.Image, deliveryPolicy: PhiMediaDeliveryPolicy.Public, lifecycleStatus: ready };

  it("is chosen when it is of the field's kind, and public where the field asks for that", () => {
    expect(readPhiMediaAssetFieldUploadRefusal(readPhiMediaAssetFieldConfig({}), image)).toBeNull();
    expect(readPhiMediaAssetFieldUploadRefusal(readPhiMediaAssetFieldConfig({ publicOnly: true }), image)).toBeNull();
  });

  it("is left unchosen when it is of another kind, or not public for a publicOnly field", () => {
    expect(readPhiMediaAssetFieldUploadRefusal(readPhiMediaAssetFieldConfig({}), { ...image, kind: PhiMediaKind.Other }))
      .toBe("kind");
    const privateImage = { ...image, deliveryPolicy: PhiMediaDeliveryPolicy.Authenticated };
    expect(readPhiMediaAssetFieldUploadRefusal(readPhiMediaAssetFieldConfig({}), privateImage)).toBeNull();
    expect(readPhiMediaAssetFieldUploadRefusal(readPhiMediaAssetFieldConfig({ publicOnly: true }), privateImage))
      .toBe("notPublic");
  });
});

describe("a Folder path with placeholders", () => {
  const template = readPhiMediaAssetFieldConfig({ folderPath: "Shop Images / {category} / {product}" }).folderPath;

  it("reads the names as written, placeholders unresolved", () => {
    expect(template).toEqual(["Shop Images", "{category}", "{product}"]);
  });

  it("puts the Form's values in, trimmed, a number as written", () => {
    expect(resolvePhiMediaAssetFieldFolderPath(template, { category: "  Shoes ", product: 42 }))
      .toEqual(["Shop Images", "Shoes", "42"]);
  });

  it("leaves out a whole name whose value is empty or missing", () => {
    expect(resolvePhiMediaAssetFieldFolderPath(template, { product: "Runner" })).toEqual(["Shop Images", "Runner"]);
    expect(resolvePhiMediaAssetFieldFolderPath(template, { category: "  ", product: "Runner" })).toEqual(["Shop Images", "Runner"]);
    expect(resolvePhiMediaAssetFieldFolderPath(template, { category: ["a"], product: null })).toEqual(["Shop Images"]);
    const mixed = readPhiMediaAssetFieldConfig({ folderPath: "Products / Item {sku}" }).folderPath;
    expect(resolvePhiMediaAssetFieldFolderPath(mixed, {})).toEqual(["Products"]);
    expect(resolvePhiMediaAssetFieldFolderPath(mixed, { sku: "A-1" })).toEqual(["Products", "Item A-1"]);
  });

  it("never lets a value add a level: its / becomes -", () => {
    expect(resolvePhiMediaAssetFieldFolderPath(template, { category: "Men/Shoes", product: " a / b " }))
      .toEqual(["Shop Images", "Men-Shoes", "a - b"]);
  });

  it("reads a dotted key into a value that is a record", () => {
    const nested = readPhiMediaAssetFieldConfig({ folderPath: "Shop / {product.slug}" }).folderPath;
    expect(resolvePhiMediaAssetFieldFolderPath(nested, { product: { slug: "runner" } })).toEqual(["Shop", "runner"]);
  });
});
