import { describe, expect, it } from "vitest";

import { readPhiRecordFieldValue } from "./record-fields";

describe("a record field's value against its kind", () => {
  it("takes a value of its kind", () => {
    expect(readPhiRecordFieldValue("text", "CHF 12.00")).toBe("CHF 12.00");
    expect(readPhiRecordFieldValue("number", 3)).toBe(3);
    expect(readPhiRecordFieldValue("date", "2026-11-15T10:00:00Z")).toBe("2026-11-15T10:00:00Z");
    expect(readPhiRecordFieldValue("picture", { src: "/media/a/8?r=2", alt: "Cover" })).toEqual({ src: "/media/a/8?r=2", alt: "Cover" });
    expect(readPhiRecordFieldValue("pictures", [{ src: "https://cdn.example/a.png" }])).toEqual([{ src: "https://cdn.example/a.png" }]);
    expect(readPhiRecordFieldValue("list", ["one", "two"])).toEqual(["one", "two"]);
    expect(readPhiRecordFieldValue("tag", { label: "Available", tone: "success" })).toEqual({ label: "Available", tone: "success" });
    expect(readPhiRecordFieldValue("link", { href: "/downloads/a", label: "Download" })).toEqual({ href: "/downloads/a", label: "Download" });
  });

  it("refuses a value of another kind", () => {
    expect(readPhiRecordFieldValue("text", 12)).toBeUndefined();
    expect(readPhiRecordFieldValue("number", "12")).toBeUndefined();
    expect(readPhiRecordFieldValue("date", "next week")).toBeUndefined();
    expect(readPhiRecordFieldValue("tag", { label: "x", tone: "loud" })).toBeUndefined();
    expect(readPhiRecordFieldValue("list", ["one", 2])).toBeUndefined();
  });

  it("refuses an address that is neither Site-relative nor http(s)", () => {
    expect(readPhiRecordFieldValue("picture", { src: "javascript:alert(1)" })).toBeUndefined();
    expect(readPhiRecordFieldValue("picture", { src: "//elsewhere.example/a.png" })).toBeUndefined();
    expect(readPhiRecordFieldValue("link", { href: "mailto:a@example.com" })).toBeUndefined();
    expect(readPhiRecordFieldValue("pictures", [{ src: "/a.png" }, { src: "data:image/png;base64,AAAA" }])).toBeUndefined();
  });
});
