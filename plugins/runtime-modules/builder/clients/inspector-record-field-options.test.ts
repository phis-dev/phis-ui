import { describe, expect, it } from "vitest";

import {
  buildPhiInspectorRecordFieldOptions,
  PHI_INSPECTOR_RECORD_FIELD_NONE,
  readPhiInspectorRecordFieldChoice,
} from "./inspector-record-field-options";

describe("the record-field select", () => {
  const fields = [
    { key: "title", label: "Title", kind: "text" as const },
    { key: "pictures", label: "Pictures", kind: "pictures" as const },
    { key: "summary", label: "Summary", kind: "text" as const, description: "The short text." },
  ];

  it("offers None first, then the fields of the kinds the Widget draws", () => {
    expect(buildPhiInspectorRecordFieldOptions(["text"], fields, "None")).toEqual([
      { value: PHI_INSPECTOR_RECORD_FIELD_NONE, label: "None" },
      { value: "title", label: "Title" },
      { value: "summary", label: "Summary", description: "The short text." },
    ]);
  });

  it("stores nothing for None and the key for a field", () => {
    expect(readPhiInspectorRecordFieldChoice(PHI_INSPECTOR_RECORD_FIELD_NONE)).toBeUndefined();
    expect(readPhiInspectorRecordFieldChoice(undefined)).toBeUndefined();
    expect(readPhiInspectorRecordFieldChoice("summary")).toBe("summary");
  });
});
