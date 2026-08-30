import assert from "node:assert/strict";

import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  readPhiMediaUploadErrorMessage,
  readPhiMediaUploadRejection,
  resolvePhiMediaUploadAccept,
} from "../components/media/phi-media-upload";
import { PhiMediaKind } from "../constants/media";

const labels = PHI_MEDIA_UPLOAD_DEFAULT_LABELS;
const file = (type: string, size = 10) =>
  ({ name: "x", type, size } as unknown as File);

/**
 * The `accept` attribute is derived, not written out by each surface. Three callers used to spell it
 * three ways, and one of them checked `image/*` by hand afterwards.
 */
{
  assert.equal(resolvePhiMediaUploadAccept(undefined), "*/*");
  assert.equal(resolvePhiMediaUploadAccept({ kinds: [PhiMediaKind.Image] }), "image/*");
  assert.equal(resolvePhiMediaUploadAccept({ kinds: [PhiMediaKind.Pdf] }), "application/pdf");
  assert.equal(
    resolvePhiMediaUploadAccept({ kinds: [PhiMediaKind.Image], contentTypes: ["application/pdf"] }),
    "application/pdf,image/*",
  );
  // A kind and an explicit type that overlap collapse to one entry rather than repeating it.
  assert.equal(
    resolvePhiMediaUploadAccept({ kinds: [PhiMediaKind.Image], contentTypes: ["image/*"] }),
    "image/*",
  );
}

/**
 * A Module's declaration refuses before a request is made. It is a courtesy and not a boundary: the
 * Site's own limits are enforced by the control plane whatever this says.
 */
{
  assert.equal(readPhiMediaUploadRejection(file("image/png"), { kinds: [PhiMediaKind.Image] }, labels), null);
  assert.equal(
    readPhiMediaUploadRejection(file("text/plain"), { kinds: [PhiMediaKind.Image] }, labels),
    labels.errorTypeNotAllowed,
  );
  assert.equal(
    readPhiMediaUploadRejection(file("image/png", 2_000), { maxBytes: 1_000 }, labels),
    labels.errorTooLarge,
  );
  assert.equal(readPhiMediaUploadRejection(file("image/png"), undefined, labels), null);
  // Family matching, and parameters ignored, the same way the control plane matches.
  assert.equal(
    readPhiMediaUploadRejection(file("image/png; charset=x"), { contentTypes: ["image/*"] }, labels),
    null,
  );
  assert.equal(
    readPhiMediaUploadRejection(file("video/mp4"), { contentTypes: ["image/*"] }, labels),
    labels.errorTypeNotAllowed,
  );
}

/**
 * One reading of every refusal. Each surface used to know a different subset, so the same refusal read
 * differently depending on where a person was standing -- and unknown ones leaked a server string.
 */
{
  const codes: Array<[string, string]> = [
    ["media_asset_exists", labels.errorDuplicate],
    ["media_asset_too_large", labels.errorTooLarge],
    ["content_type_not_allowed", labels.errorTypeNotAllowed],
    ["media_quota_exceeded", labels.errorQuotaExceeded],
    ["space_kind_unavailable", labels.errorSpaceUnavailable],
    ["space_forbidden", labels.errorSpaceUnavailable],
    ["storage_unreachable", labels.errorStorageUnreachable],
    ["storage_rejected", labels.errorStorageUnreachable],
  ];
  for (const [code, expected] of codes) {
    assert.equal(readPhiMediaUploadErrorMessage({ code }, labels), expected, code);
  }
  assert.equal(readPhiMediaUploadErrorMessage(new TypeError("failed"), labels), labels.errorNetwork);
  // Anything unrecognized is generic rather than the server's own words.
  assert.equal(
    readPhiMediaUploadErrorMessage(new Error("relation does not exist"), labels),
    labels.errorGeneric,
  );
  assert.equal(readPhiMediaUploadErrorMessage({ code: "something_new" }, labels), labels.errorGeneric);
}

console.log("Media upload contracts validated.");
