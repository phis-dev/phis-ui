import { describe, expect, it } from "vitest";

import { PhiRecordMarkdownFlag } from "../constants/record-field-kinds";
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
    expect(readPhiRecordFieldValue("money", { currency: "CHF", minor: "1990" })).toEqual({ currency: "CHF", minor: "1990" });
    expect(readPhiRecordFieldValue("markdown", { text: "# Chaise", sourceLocale: "fr", flags: 0 }))
      .toEqual({ text: "# Chaise", sourceLocale: "fr", flags: 0 });
    expect(readPhiRecordFieldValue("markdown", { text: "# Cadeira", sourceLocale: "pt-BR", flags: PhiRecordMarkdownFlag.Translated }))
      .toEqual({ text: "# Cadeira", sourceLocale: "pt-BR", flags: PhiRecordMarkdownFlag.Translated });
  });

  it("refuses a markdown that does not say its language and what it is", () => {
    // The text alone is no markdown field: without its language it cannot be translated.
    expect(readPhiRecordFieldValue("markdown", "# Chaise")).toBeUndefined();
    expect(readPhiRecordFieldValue("markdown", { text: "# Chaise", flags: 0 })).toBeUndefined();
    expect(readPhiRecordFieldValue("markdown", { text: "# Chaise", sourceLocale: "", flags: 0 })).toBeUndefined();
    expect(readPhiRecordFieldValue("markdown", { text: "# Chaise", sourceLocale: "fr" })).toBeUndefined();
    expect(readPhiRecordFieldValue("markdown", { text: "# Chaise", sourceLocale: "fr", flags: -1 })).toBeUndefined();
    expect(readPhiRecordFieldValue("markdown", { text: "# Chaise", sourceLocale: "fr", flags: 0.5 })).toBeUndefined();
    expect(readPhiRecordFieldValue("markdown", { text: "# Chaise", sourceLocale: "fr", flags: 1 << 5 })).toBeUndefined();
    expect(readPhiRecordFieldValue("markdown", { text: 12, sourceLocale: "fr", flags: 0 })).toBeUndefined();
  });

  it("refuses a value of another kind", () => {
    expect(readPhiRecordFieldValue("text", 12)).toBeUndefined();
    expect(readPhiRecordFieldValue("number", "12")).toBeUndefined();
    expect(readPhiRecordFieldValue("date", "next week")).toBeUndefined();
    expect(readPhiRecordFieldValue("tag", { label: "x", tone: "loud" })).toBeUndefined();
    expect(readPhiRecordFieldValue("list", ["one", 2])).toBeUndefined();
    // Money is the contract's: minor units as an integer string, in a currency a payment accepts.
    expect(readPhiRecordFieldValue("money", { currency: "CHF", minor: 1990 })).toBeUndefined();
    expect(readPhiRecordFieldValue("money", { currency: "CHF", minor: "19.90" })).toBeUndefined();
    expect(readPhiRecordFieldValue("money", { currency: "XYZ", minor: "1990" })).toBeUndefined();
    expect(readPhiRecordFieldValue("money", { CHF: "1990" })).toBeUndefined();
  });

  it("refuses an address that is neither Site-relative nor http(s)", () => {
    expect(readPhiRecordFieldValue("picture", { src: "javascript:alert(1)" })).toBeUndefined();
    expect(readPhiRecordFieldValue("picture", { src: "//elsewhere.example/a.png" })).toBeUndefined();
    expect(readPhiRecordFieldValue("link", { href: "mailto:a@example.com" })).toBeUndefined();
    expect(readPhiRecordFieldValue("pictures", [{ src: "/a.png" }, { src: "data:image/png;base64,AAAA" }])).toBeUndefined();
  });
});

describe("a text, number, date or money field as words", () => {
  it("leaves a text as it is and writes a number, a date and money for the locale", async () => {
    const { formatPhiRecordFieldText } = await import("./record-fields");
    expect(formatPhiRecordFieldText({ kind: "text", value: "CHF 12.00" }, "de-CH", "UTC")).toBe("CHF 12.00");
    expect(formatPhiRecordFieldText({ kind: "number", value: 1234.5 }, "en-US", "UTC")).toBe("1,234.5");
    expect(formatPhiRecordFieldText({ kind: "date", value: "2026-11-15T10:00:00Z" }, "en-US", "UTC")).toBe("Nov 15, 2026");
    expect(formatPhiRecordFieldText({ kind: "money", value: { currency: "JPY", minor: "1990" } }, "en-US", "UTC")).toBe("¥1,990");
    expect(formatPhiRecordFieldText({ kind: "money", value: { currency: "USD", minor: "1990" } }, "en-US", "UTC")).toBe("$19.90");
  });

  it("writes a date on the Site's calendar, not the server's", async () => {
    const { formatPhiRecordFieldText } = await import("./record-fields");
    expect(formatPhiRecordFieldText({ kind: "date", value: "2026-11-15T23:30:00Z" }, "en-US", "UTC")).toBe("Nov 15, 2026");
    expect(formatPhiRecordFieldText({ kind: "date", value: "2026-11-15T23:30:00Z" }, "en-US", "Europe/Zurich")).toBe("Nov 16, 2026");
  });
});
