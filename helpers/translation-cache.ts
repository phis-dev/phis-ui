/**
 * A process-wide cache for resolved translations, keyed per message rather than per label set.
 *
 * The gateway asks `/api/v1/tr` on every request, and the server's own cache is a database table -- so
 * a warm translation still costs one HTTP round trip plus one query, per Navigation surface, per
 * request. That is invisible on a page with a declared label set (`gateway/label-set.ts` caches those
 * in the process), and it is the whole cost on a Navigation surface, whose label set is assembled from
 * the resolved tree and therefore cannot be declared up front.
 *
 * Keying per message rather than per set is what makes a dynamic set cacheable: a Module switched on or
 * a Navigation revision published changes *which* messages are asked for, never what a given message
 * translates to. A new label is then simply a miss, and a label that fell away is dead weight the size
 * limit collects. Neither event needs to invalidate anything.
 *
 * What does change a stored value is a write to the translation store -- an edit, a delete, a changed
 * translation configuration. Entries do not expire for it. Core keeps a change marker per store, one
 * global and one per Site, and hands both out with the Site config; `syncPhiTranslationChangeMarkers`
 * empties a store whose marker differs from the one this process saw last. The process that forwarded
 * an edit reads the Site config fresh on its next render (its proxy cleared the read cache), and every
 * other process within the read cache's TTL -- without asking for a single translation again until one
 * actually changed.
 *
 * Kept on `globalThis`, like gateway/site-read-cache.ts: the proxy's Route Handler and the pages that
 * read the cache can be bundled separately, and a module-level Map would then not be the same Map.
 *
 * Only the translated text is cached, never the viewer-facing structure it ends up in. A resolved
 * Navigation surface is filtered by viewer access and must not be shared between requests; the
 * message-to-translation mapping it needs has no viewer in it.
 */

/**
 * Enough for every label of every Area in a handful of locales, and small enough that an `html` body
 * passed through `tr` cannot grow the process without bound.
 */
export const PHI_TRANSLATION_CACHE_MAX_ENTRIES = 5_000;

/** ASCII unit separator: the one character a locale, a context, or a format will never contain. */
const SEPARATOR = String.fromCharCode(31);

type PhiTranslationCacheState = {
  entries: Map<string, string>;
  /** Moves on every clear, so a request that began before it cannot write what it read into the cache. */
  generation: number;
  markers: { global: string | null; sites: Map<string, string> };
};

// Named for its shape: a process that outlives a code change (a dev server's HMR) still holds the old
// value under the old name, and must not hand it to code that expects this one.
const TRANSLATION_CACHE_STORE_KEY = Symbol.for("phis-ui.translation-cache.entries-generation-markers");
const STATE: PhiTranslationCacheState = (() => {
  const holder = globalThis as typeof globalThis & {
    [TRANSLATION_CACHE_STORE_KEY]?: PhiTranslationCacheState;
  };
  holder[TRANSLATION_CACHE_STORE_KEY] ??= {
    entries: new Map(),
    generation: 0,
    markers: { global: null, sites: new Map() },
  };
  return holder[TRANSLATION_CACHE_STORE_KEY];
})();
const TRANSLATION_CACHE = STATE.entries;

export type PhiTranslationCacheKeyInput = {
  /** The Site the translation belongs to, or an empty string for a global one. */
  scope: string;
  sourceLocale: string;
  targetLocale: string;
  ctx: string;
  format: string;
  msg: string;
};

export function buildPhiTranslationCacheKey({
  scope,
  sourceLocale,
  targetLocale,
  ctx,
  format,
  msg,
}: PhiTranslationCacheKeyInput) {
  // The message goes last because it is the only part that may contain anything at all.
  return [scope, sourceLocale, targetLocale, ctx, format, msg].join(SEPARATOR);
}

export function readPhiTranslationCache(key: string) {
  const value = TRANSLATION_CACHE.get(key);
  if (value == null) {
    return null;
  }
  // Re-inserting moves the entry to the end, so the size limit evicts what is least recently read
  // rather than what was written first -- a Navigation label read on every request outlives a one-off.
  TRANSLATION_CACHE.delete(key);
  TRANSLATION_CACHE.set(key, value);
  return value;
}

/** Taken before a request to Core, and handed back to `writePhiTranslationCache` with its answer. */
export function readPhiTranslationCacheGeneration() {
  return STATE.generation;
}

/**
 * Keeps a translation. With a `generation`, the write is dropped when the cache was cleared since it was
 * taken: the answer was read before the change that cleared it and would otherwise stay for good.
 */
export function writePhiTranslationCache(key: string, value: string, generation?: number) {
  if (generation != null && generation !== STATE.generation) {
    return;
  }
  TRANSLATION_CACHE.delete(key);
  TRANSLATION_CACHE.set(key, value);
  while (TRANSLATION_CACHE.size > PHI_TRANSLATION_CACHE_MAX_ENTRIES) {
    const oldest = TRANSLATION_CACHE.keys().next();
    if (oldest.done) {
      break;
    }
    TRANSLATION_CACHE.delete(oldest.value);
  }
}

/**
 * Drops cached translations.
 *
 * Without arguments it empties the cache. `targetLocale` and `scope` narrow it to what a change actually
 * touched; `scope: ""` is the global store alone, not every store.
 */
export function clearPhiTranslationCache(options?: { targetLocale?: string; scope?: string }) {
  const targetLocale = options?.targetLocale?.trim().toLowerCase() ?? "";
  const scope = options?.scope?.trim();
  STATE.generation += 1;

  if (!targetLocale && scope == null) {
    TRANSLATION_CACHE.clear();
    return;
  }

  for (const key of [...TRANSLATION_CACHE.keys()]) {
    const [keyScope = "", , keyTargetLocale = ""] = key.split(SEPARATOR);
    if ((scope == null || keyScope === scope) && (!targetLocale || keyTargetLocale === targetLocale)) {
      TRANSLATION_CACHE.delete(key);
    }
  }
}

/**
 * Compares the change markers of a Site config Core just answered with the ones this process saw last,
 * and empties the store whose marker moved: the global entries for the global marker, that Site's
 * entries for its own. They are separate stores in Core, and one moving says nothing about the other.
 * The first markers a process sees empty their stores too, since nothing says what was cached before
 * them.
 */
export function syncPhiTranslationChangeMarkers(input: { siteKey: string; global: string; site: string }) {
  const siteKey = input.siteKey.trim();
  if (STATE.markers.global !== input.global) {
    STATE.markers.global = input.global;
    clearPhiTranslationCache({ scope: "" });
  }
  if (STATE.markers.sites.get(siteKey) !== input.site) {
    STATE.markers.sites.set(siteKey, input.site);
    clearPhiTranslationCache({ scope: siteKey });
  }
}

/** The number of live entries. Exists for the tests and for a diagnostic, not for a caller's logic. */
export function getPhiTranslationCacheSize() {
  return TRANSLATION_CACHE.size;
}
