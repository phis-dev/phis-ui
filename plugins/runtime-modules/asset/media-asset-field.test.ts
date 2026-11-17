import { describe, expect, it } from "vitest";

import { PhiMediaDeliveryPolicy, PhiMediaKind, PhiMediaLifecycleStatus } from "../../../constants/media";
import { isPhiConfigError } from "../../../components/widgets/config/strict-config-reader";
import {
  isPhiMediaAssetFieldSelectable,
  readPhiMediaAssetFieldConfig,
  readPhiMediaAssetFieldValue,
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
    expect(readPhiMediaAssetFieldConfig(undefined)).toEqual({ mediaType: PhiMediaKind.Image, publicOnly: false });
    expect(readPhiMediaAssetFieldConfig({})).toEqual({ mediaType: PhiMediaKind.Image, publicOnly: false });
  });

  it("reads the kind and publicOnly as written", () => {
    expect(readPhiMediaAssetFieldConfig({ mediaType: PhiMediaKind.Pdf, publicOnly: true }))
      .toEqual({ mediaType: PhiMediaKind.Pdf, publicOnly: true });
  });

  it("refuses a kind the picker does not list and a publicOnly that is no boolean, naming the field", () => {
    expect(configError({ mediaType: "imag" })).toBe("config.mediaType");
    expect(configError({ mediaType: PhiMediaKind.Archive })).toBe("config.mediaType");
    expect(configError({ publicOnly: "yes" })).toBe("config.publicOnly");
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
