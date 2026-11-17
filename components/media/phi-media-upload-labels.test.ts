import { describe, expect, it } from "vitest";

import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "./media-widget-labels";
import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  resolvePhiAreaUploadLabels,
  resolvePhiUploadStatusLabel,
} from "./phi-media-upload";

const upload = PHI_MEDIA_WIDGET_DEFAULT_LABELS.upload;

describe("the wording the Media upload surfaces share", () => {
  it("reads the Widget's own texts for the refusals it has, the shared ones for the rest", () => {
    const labels = resolvePhiAreaUploadLabels({ ...upload, uploadFailedText: "Broke.", assetExistsLabel: "Twice." });
    expect(labels.errorGeneric).toBe("Broke.");
    expect(labels.errorDuplicate).toBe("Twice.");
    expect(labels.errorTooLarge).toBe(PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorTooLarge);
  });

  it("says the percentage on the way, Failed on error and Done after", () => {
    expect(resolvePhiUploadStatusLabel({ status: "uploading", progress: 40 }, upload)).toBe("40%");
    expect(resolvePhiUploadStatusLabel({ status: "error", progress: 100 }, upload)).toBe(upload.failedLabel);
    expect(resolvePhiUploadStatusLabel({ status: "done", progress: 100 }, upload)).toBe(upload.doneLabel);
  });
});
