import { describe, expect, it } from "vitest";

import { maskPhiTextPlaceholders, resolvePhiTextPlaceholders } from "./text-placeholders";
import type { PhiBlockRuntime } from "../types";

const runtime = {
  site: { key: "acme", name: "Acme", hostname: "acme.test" },
} as PhiBlockRuntime;

/**
 * The round trip a sentence takes past a machine translator, pinned at both ends.
 *
 * The bug this exists for is not visible in either half alone: masking looks like renaming, filling
 * looks like a lookup, and the failure only shows when a translator sits between them and turns
 * `{year}` into `{Jahr}`. What is pinned is the contract that survives that -- names go out as `%n`,
 * values come back by position, and a name nothing answers comes back as itself.
 */
describe("Text placeholders", () => {
  it("sends names to the translator as tokens it will not translate", () => {
    const masked = maskPhiTextPlaceholders("© {year} {site.name}. All rights reserved.");
    expect(masked.text).toBe("© %1 %2. All rights reserved.");
    expect(masked.names).toEqual(["year", "site.name"]);
  });

  it("binds the values to where the translator left the tokens", () => {
    const masked = maskPhiTextPlaceholders("© {year} {site.name}");
    const translated = masked.text.replace("© %1 %2", "%2, %1 -- alle Rechte vorbehalten");
    expect(resolvePhiTextPlaceholders(translated, masked.names, runtime)).toBe(
      `Acme, ${new Date().getUTCFullYear()} -- alle Rechte vorbehalten`,
    );
  });

  it("gives a name nothing answers back as itself, so a typo stays findable", () => {
    const masked = maskPhiTextPlaceholders("© {jahr} {site.name}");
    expect(masked.text).toBe("© %1 %2");
    expect(resolvePhiTextPlaceholders(masked.text, masked.names, runtime)).toBe("© {jahr} Acme");
  });

  it("reads the tenth token as the tenth and not as the first", () => {
    const text = Array.from({ length: 10 }, () => "{site.name}").join(" ");
    const masked = maskPhiTextPlaceholders(text);
    expect(masked.text.endsWith("%10")).toBe(true);
    expect(resolvePhiTextPlaceholders(masked.text, masked.names, runtime)).toBe(
      Array.from({ length: 10 }, () => "Acme").join(" "),
    );
  });

  it("leaves a sentence without names untouched and unmasked", () => {
    const masked = maskPhiTextPlaceholders("All rights reserved.");
    expect(masked.text).toBe("All rights reserved.");
    expect(masked.names).toEqual([]);
    expect(resolvePhiTextPlaceholders(masked.text, masked.names, runtime)).toBe("All rights reserved.");
  });

  it("falls back to the Site key when the Site has no name", () => {
    const keyOnly = { site: { key: "acme", name: "  " } } as PhiBlockRuntime;
    const masked = maskPhiTextPlaceholders("{site.name}");
    expect(resolvePhiTextPlaceholders(masked.text, masked.names, keyOnly)).toBe("acme");
  });

  it("gives the host back as a name when the Site has none, rather than as an empty line", () => {
    const hostless = { site: { key: "acme", name: "Acme" } } as PhiBlockRuntime;
    const masked = maskPhiTextPlaceholders("{site.host}");
    expect(resolvePhiTextPlaceholders(masked.text, masked.names, hostless)).toBe("{site.host}");
  });
});
