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
 * What does change a stored value is an edit in `/editor/translations`, and that happens in another
 * process than the ones holding this cache. Rather than push an invalidation into a fleet -- which
 * would need a channel that does not exist -- entries expire. The window is the delay between
 * translating a label and seeing it live; `clearPhiTranslationCache` is there for the process that
 * knows better.
 *
 * Only the translated text is cached, never the viewer-facing structure it ends up in. A resolved
 * Navigation surface is filtered by viewer access and must not be shared between requests; the
 * message-to-translation mapping it needs has no viewer in it.
 */

export const PHI_TRANSLATION_CACHE_TTL_MS = 60_000;

/**
 * Enough for every label of every Area in a handful of locales, and small enough that an `html` body
 * passed through `tr` cannot grow the process without bound.
 */
export const PHI_TRANSLATION_CACHE_MAX_ENTRIES = 5_000;

/** ASCII unit separator: the one character a locale, a context, or a format will never contain. */
const SEPARATOR = String.fromCharCode(31);

const TRANSLATION_CACHE = new Map<string, { value: string; expiresAt: number }>();

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

export function readPhiTranslationCache(key: string, now = Date.now()) {
  const entry = TRANSLATION_CACHE.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= now) {
    TRANSLATION_CACHE.delete(key);
    return null;
  }
  // Re-inserting moves the entry to the end, so the size limit evicts what is least recently read
  // rather than what was written first -- a Navigation label read on every request outlives a one-off.
  TRANSLATION_CACHE.delete(key);
  TRANSLATION_CACHE.set(key, entry);
  return entry.value;
}

export function writePhiTranslationCache(key: string, value: string, now = Date.now()) {
  TRANSLATION_CACHE.delete(key);
  TRANSLATION_CACHE.set(key, { value, expiresAt: now + PHI_TRANSLATION_CACHE_TTL_MS });
  while (TRANSLATION_CACHE.size > PHI_TRANSLATION_CACHE_MAX_ENTRIES) {
    const oldest = TRANSLATION_CACHE.keys().next();
    if (oldest.done) {
      break;
    }
    TRANSLATION_CACHE.delete(oldest.value);
  }
}

/**
 * Drops cached translations ahead of their expiry.
 *
 * Without arguments it empties the cache. `targetLocale` and `scope` narrow it to what an edit actually
 * touched, on the same terms as `clearPhiLabelSetCache`.
 */
export function clearPhiTranslationCache(options?: { targetLocale?: string; scope?: string }) {
  const targetLocale = options?.targetLocale?.trim().toLowerCase() ?? "";
  const scope = options?.scope?.trim() ?? "";

  if (!targetLocale && !scope) {
    TRANSLATION_CACHE.clear();
    return;
  }

  for (const key of [...TRANSLATION_CACHE.keys()]) {
    const [keyScope = "", , keyTargetLocale = ""] = key.split(SEPARATOR);
    if ((!scope || keyScope === scope) && (!targetLocale || keyTargetLocale === targetLocale)) {
      TRANSLATION_CACHE.delete(key);
    }
  }
}

/** The number of live entries. Exists for the tests and for a diagnostic, not for a caller's logic. */
export function getPhiTranslationCacheSize() {
  return TRANSLATION_CACHE.size;
}
