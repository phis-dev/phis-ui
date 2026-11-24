import { describe, expect, it } from "vitest";

import { formatPhiCountLabel, formatPhiTranslation, type PhiCountLabel } from "./translation-format";

describe("formatPhiTranslation", () => {
  it("reads positional tokens in one pass, so %1 does not eat %10", () => {
    const values = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    expect(formatPhiTranslation("%1 and %10", values)).toBe("a and j");
    expect(formatPhiTranslation("{0} and {9}", values)).toBe("a and j");
  });

  it("does not replace inside a value it just inserted", () => {
    expect(formatPhiTranslation("%1 %2", ["%2", "x"])).toBe("%2 x");
  });

  it("leaves a token nothing answers", () => {
    expect(formatPhiTranslation("%1 %3", ["a", "b"])).toBe("a %3");
    expect(formatPhiTranslation("{name} {other}", { name: "n" })).toBe("n {other}");
  });

  it("takes a single value as the first position", () => {
    expect(formatPhiTranslation("%1 / {0} / %2", 7)).toBe("7 / 7 / %2");
  });
});

describe("formatPhiCountLabel", () => {
  const pages: PhiCountLabel = { one: "%1 page", other: "%1 pages" };

  it("reads English one and other, the count as %1", () => {
    expect(formatPhiCountLabel(pages, 1, "en")).toBe("1 page");
    expect(formatPhiCountLabel(pages, 0, "en")).toBe("0 pages");
    expect(formatPhiCountLabel(pages, 2, "en")).toBe("2 pages");
  });

  it("writes the count as the locale writes numbers", () => {
    expect(formatPhiCountLabel(pages, 1234, "en")).toBe("1,234 pages");
    expect(formatPhiCountLabel({ one: "%1 Seite", other: "%1 Seiten" }, 1234, "de")).toBe("1.234 Seiten");
  });

  it("picks the category of the reader's locale, not the number 1", () => {
    // French reads 0 as `one`, Russian 21: the `one` template carries the count for that reason.
    expect(formatPhiCountLabel({ one: "%1 page", other: "%1 pages" }, 0, "fr")).toBe("0 page");
    expect(formatPhiCountLabel({ one: "%1 страница", other: "%1 страниц" }, 21, "ru")).toBe("21 страница");
  });

  it("reads every category a locale has where the label states it", () => {
    const polish: PhiCountLabel = { one: "%1 strona", few: "%1 strony", many: "%1 stron", other: "%1 strony" };
    expect(formatPhiCountLabel(polish, 1, "pl")).toBe("1 strona");
    expect(formatPhiCountLabel(polish, 3, "pl")).toBe("3 strony");
    expect(formatPhiCountLabel(polish, 5, "pl")).toBe("5 stron");
    expect(formatPhiCountLabel(polish, 22, "pl")).toBe("22 strony");
    expect(formatPhiCountLabel(polish, 1.5, "pl")).toBe("1,5 strony");
  });

  it("falls back to other for a category the label does not state", () => {
    // An English source states one and other; translated, Polish few and many read other.
    const translated: PhiCountLabel = { one: "%1 strona", other: "%1 stron" };
    expect(formatPhiCountLabel(translated, 1, "pl")).toBe("1 strona");
    expect(formatPhiCountLabel(translated, 3, "pl")).toBe("3 stron");
    expect(formatPhiCountLabel(translated, 5, "pl")).toBe("5 stron");
    expect(formatPhiCountLabel({ other: "%1 件" }, 1, "ja")).toBe("1 件");
  });

  it("never reads one in a locale that has no such category", () => {
    expect(formatPhiCountLabel({ one: "%1 page", other: "%1 ページ" }, 1, "ja")).toBe("1 ページ");
  });
});
