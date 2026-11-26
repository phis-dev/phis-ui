import { describe, expect, it } from "vitest";

import {
  PHI_CDN_UPLOAD_EMPTY_DRAFT,
  isPhiCdnUploadDraftComplete,
  readPhiCdnUploadDraft,
  readPhiCdnUploadDraftFromFile,
} from "./upload-fields";

describe("the CDN upload's draft", () => {
  it("starts from a picked file's name and platform, keeping the name typed before", () => {
    expect(readPhiCdnUploadDraftFromFile("tool_1.0_arm64.deb", "tool")).toEqual({
      name: "tool",
      version: "",
      fileName: "tool_1.0_arm64.deb",
      os: ["linux"],
      arch: ["arm64"],
    });
    expect(readPhiCdnUploadDraftFromFile("notes.txt", "")).toEqual({ ...PHI_CDN_UPLOAD_EMPTY_DRAFT, fileName: "notes.txt" });
  });

  it("reads the Form's values, leaving the held file and anything of another type out", () => {
    expect(readPhiCdnUploadDraft({
      heldFile: "tool.deb",
      name: "tool",
      version: 1,
      fileName: "tool.deb",
      os: ["linux", 4],
      arch: "x64",
    })).toEqual({ name: "tool", version: "", fileName: "tool.deb", os: ["linux"], arch: [] });
  });

  it("is complete once name, version and file name are segments Core takes, trimmed", () => {
    const draft = { ...PHI_CDN_UPLOAD_EMPTY_DRAFT, name: " tool ", version: "1.0", fileName: "tool.deb" };
    expect(isPhiCdnUploadDraftComplete(draft)).toBe(true);
    expect(isPhiCdnUploadDraftComplete({ ...draft, version: "" })).toBe(false);
    expect(isPhiCdnUploadDraftComplete({ ...draft, name: "api" })).toBe(false);
    expect(isPhiCdnUploadDraftComplete({ ...draft, fileName: "a/b" })).toBe(false);
  });
});
