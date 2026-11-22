import { describe, expect, it } from "vitest";

import { PhiMediaKind } from "../../../constants/media";
import { readPhiMediaUploadRejection } from "../../../components/media/phi-media-upload";
import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS } from "../../../components/media/media-upload-labels";
import { PHI_MEDIA_ASSETS_FIELD_MOST } from "./form-providers";
import { isPhiMediaFieldKindTaken, readPhiMediaFieldUploadAcceptance } from "./media-asset-field";
import { limitPhiMediaAssetsFieldConfig, readPhiMediaAssetsFieldConfig } from "./media-assets-field";

/**
 * The Media limits of the Add-on behind a Form, as its manifest states them and the capability snapshot
 * hands them on, applied in the `media-asset` and `media-assets` fields before anything is sent.
 */

const labels = PHI_MEDIA_UPLOAD_DEFAULT_LABELS;

function file(bytes: number, type: string) {
  return new File([new Uint8Array(bytes)], "picture", { type });
}

describe("the most Assets a media-assets field holds under the Add-on's maxPerField", () => {
  it("keeps the field's own max where it is lower, and takes the Add-on's where the field's is higher", () => {
    const own = readPhiMediaAssetsFieldConfig({ max: 4 });
    expect(limitPhiMediaAssetsFieldConfig(own, { maxPerField: 10 }).max).toBe(4);
    expect(limitPhiMediaAssetsFieldConfig(own, { maxPerField: 2 }).max).toBe(2);
    expect(limitPhiMediaAssetsFieldConfig(readPhiMediaAssetsFieldConfig({}), { maxPerField: 6 }).max).toBe(6);
  });

  it("leaves the field as it is where the Add-on states no maxPerField, or nothing at all", () => {
    const own = readPhiMediaAssetsFieldConfig({});
    expect(limitPhiMediaAssetsFieldConfig(own, undefined)).toBe(own);
    expect(limitPhiMediaAssetsFieldConfig(own, { maxFileBytes: 1024 })).toBe(own);
    expect(own.max).toBe(PHI_MEDIA_ASSETS_FIELD_MOST);
  });
});

describe("what an upload in a Media field takes under the Add-on's Media limits", () => {
  it("refuses a file larger than maxFileBytes before it is sent, as too large", () => {
    const acceptance = readPhiMediaFieldUploadAcceptance(PhiMediaKind.Image, false, { maxFileBytes: 1024 });
    expect(acceptance).toEqual({ kinds: [PhiMediaKind.Image], multiple: false, maxBytes: 1024 });
    expect(readPhiMediaUploadRejection(file(1025, "image/png"), acceptance, labels)).toBe(labels.errorTooLarge);
    expect(readPhiMediaUploadRejection(file(1024, "image/png"), acceptance, labels)).toBeNull();
  });

  it("states no size where the Add-on states none, and still refuses a file of another kind", () => {
    const acceptance = readPhiMediaFieldUploadAcceptance(PhiMediaKind.Image, true, undefined);
    expect(acceptance).toEqual({ kinds: [PhiMediaKind.Image], multiple: true });
    expect(readPhiMediaUploadRejection(file(10, "application/pdf"), acceptance, labels)).toBe(labels.errorTypeNotAllowed);
  });

  it("takes the field's kind only where the Add-on's kinds name it", () => {
    expect(isPhiMediaFieldKindTaken(PhiMediaKind.Image, undefined)).toBe(true);
    expect(isPhiMediaFieldKindTaken(PhiMediaKind.Image, { maxPerField: 3 })).toBe(true);
    expect(isPhiMediaFieldKindTaken(PhiMediaKind.Image, { kinds: [PhiMediaKind.Image, PhiMediaKind.Pdf] })).toBe(true);
    expect(isPhiMediaFieldKindTaken(PhiMediaKind.Video, { kinds: [PhiMediaKind.Image] })).toBe(false);
  });
});
