import { beforeEach, describe, expect, it } from "vitest";

import {
  buildPhiTranslationCacheKey,
  clearPhiTranslationCache,
  getPhiTranslationCacheSize,
  PHI_TRANSLATION_CACHE_MAX_ENTRIES,
  PHI_TRANSLATION_CACHE_TTL_MS,
  readPhiTranslationCache,
  writePhiTranslationCache,
} from "./translation-cache";

function key(overrides: Partial<Parameters<typeof buildPhiTranslationCacheKey>[0]> = {}) {
  return buildPhiTranslationCacheKey({
    scope: "",
    sourceLocale: "en",
    targetLocale: "de",
    ctx: "Web UI label",
    format: "text",
    msg: "Home",
    ...overrides,
  });
}

beforeEach(() => {
  clearPhiTranslationCache();
});

describe("translation cache key", () => {
  it("separates a Site translation from a global one", () => {
    expect(key({ scope: "acme" })).not.toBe(key({ scope: "" }));
  });

  it("separates the parts, so no two inputs can collide by concatenation", () => {
    // Without a separator "a" + "bc" and "ab" + "c" would be the same string.
    expect(key({ ctx: "a", format: "bc" })).not.toBe(key({ ctx: "ab", format: "c" }));
  });

  it("keeps a message that contains the separator addressable", () => {
    const withSeparator = key({ msg: `Home${String.fromCharCode(31)}Away` });
    expect(withSeparator).not.toBe(key({ msg: "Home" }));
    writePhiTranslationCache(withSeparator, "Zuhause");
    expect(readPhiTranslationCache(withSeparator)).toBe("Zuhause");
  });

  it("distinguishes the target locale, the source locale, and the format", () => {
    const keys = new Set([
      key(),
      key({ targetLocale: "fr" }),
      key({ sourceLocale: "de" }),
      key({ format: "html" }),
    ]);
    expect(keys.size).toBe(4);
  });
});

describe("translation cache", () => {
  it("answers a written entry and reports a miss for an unknown one", () => {
    writePhiTranslationCache(key(), "Startseite");
    expect(readPhiTranslationCache(key())).toBe("Startseite");
    expect(readPhiTranslationCache(key({ msg: "Away" }))).toBeNull();
  });

  it("stops answering once the entry is older than the window", () => {
    const now = 1_000_000;
    writePhiTranslationCache(key(), "Startseite", now);
    expect(readPhiTranslationCache(key(), now + PHI_TRANSLATION_CACHE_TTL_MS - 1)).toBe("Startseite");
    expect(readPhiTranslationCache(key(), now + PHI_TRANSLATION_CACHE_TTL_MS)).toBeNull();
    // The expired entry is dropped rather than left to be read again.
    expect(getPhiTranslationCacheSize()).toBe(0);
  });

  it("evicts what was least recently read, not what was written first", () => {
    const oldest = key({ msg: "read-on-every-request" });
    writePhiTranslationCache(oldest, "first");
    for (let index = 0; index < PHI_TRANSLATION_CACHE_MAX_ENTRIES - 1; index += 1) {
      writePhiTranslationCache(key({ msg: `filler-${index}` }), String(index));
    }
    // Reading it moves it to the end, so the next write evicts the filler behind it instead.
    expect(readPhiTranslationCache(oldest)).toBe("first");
    writePhiTranslationCache(key({ msg: "one-too-many" }), "last");

    expect(getPhiTranslationCacheSize()).toBe(PHI_TRANSLATION_CACHE_MAX_ENTRIES);
    expect(readPhiTranslationCache(oldest)).toBe("first");
    expect(readPhiTranslationCache(key({ msg: "filler-0" }))).toBeNull();
  });

  it("overwrites rather than duplicating when the same message is written twice", () => {
    writePhiTranslationCache(key(), "erst");
    writePhiTranslationCache(key(), "dann");
    expect(getPhiTranslationCacheSize()).toBe(1);
    expect(readPhiTranslationCache(key())).toBe("dann");
  });
});

describe("clearing", () => {
  beforeEach(() => {
    writePhiTranslationCache(key({ targetLocale: "de" }), "de-global");
    writePhiTranslationCache(key({ targetLocale: "fr" }), "fr-global");
    writePhiTranslationCache(key({ scope: "acme", targetLocale: "de" }), "de-acme");
  });

  it("drops one locale and leaves the others", () => {
    clearPhiTranslationCache({ targetLocale: "de" });
    expect(readPhiTranslationCache(key({ targetLocale: "de" }))).toBeNull();
    expect(readPhiTranslationCache(key({ scope: "acme", targetLocale: "de" }))).toBeNull();
    expect(readPhiTranslationCache(key({ targetLocale: "fr" }))).toBe("fr-global");
  });

  it("drops one Site and leaves the global entries", () => {
    clearPhiTranslationCache({ scope: "acme" });
    expect(readPhiTranslationCache(key({ scope: "acme", targetLocale: "de" }))).toBeNull();
    expect(readPhiTranslationCache(key({ targetLocale: "de" }))).toBe("de-global");
  });

  it("takes an uppercase locale, because a caller reads it off a request", () => {
    clearPhiTranslationCache({ targetLocale: "DE" });
    expect(readPhiTranslationCache(key({ targetLocale: "de" }))).toBeNull();
  });

  it("empties everything without arguments", () => {
    clearPhiTranslationCache();
    expect(getPhiTranslationCacheSize()).toBe(0);
  });
});
