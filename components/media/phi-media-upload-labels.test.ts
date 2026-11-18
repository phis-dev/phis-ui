import { describe, expect, it } from "vitest";

import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS } from "./media-upload-labels";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "./media-widget-labels";
import { resolvePhiUploadStatusLabel } from "./phi-media-upload";

const upload = PHI_MEDIA_WIDGET_DEFAULT_LABELS.upload;

describe("the wording the Media upload surfaces share", () => {
  it("carries the upload's own refusals rather than a wording of its own", () => {
    expect(upload.refusals).toEqual(PHI_MEDIA_UPLOAD_DEFAULT_LABELS);
  });

  it("says the percentage on the way, Failed on error and Done after", () => {
    expect(resolvePhiUploadStatusLabel({ status: "uploading", progress: 40 }, upload)).toBe("40%");
    expect(resolvePhiUploadStatusLabel({ status: "error", progress: 100 }, upload)).toBe(upload.failedLabel);
    expect(resolvePhiUploadStatusLabel({ status: "done", progress: 100 }, upload)).toBe(upload.doneLabel);
  });
});
