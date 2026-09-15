/**
 * What a Site process keeps of the published data it reads from Core on every render: its Site config
 * and its Navigation overlays.
 *
 * Next's data cache is not used for these, because nothing could clear it everywhere: `revalidateTag`
 * reaches only the Site process that ran it. This cache is cleared by the same process whenever a write
 * passes its `/api/site` proxy (gateway/site-proxy.ts), so the author sees the change at once, and every
 * other process of the Site catches up within the TTL.
 *
 * Kept on `globalThis`: the proxy's Route Handler and the pages that read the cache can be bundled
 * separately, and a module-level Map would then not be the same Map in both.
 */

export const PHI_SITE_READ_CACHE_TTL_MS = 60_000;

type PhiSiteReadCacheEntry = {
  expiresAt: number;
  value: Promise<unknown>;
};

const STORE_KEY = Symbol.for("phis-ui.site-read-cache");

function readStore(): Map<string, PhiSiteReadCacheEntry> {
  const holder = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, PhiSiteReadCacheEntry> };
  holder[STORE_KEY] ??= new Map();
  return holder[STORE_KEY];
}

/**
 * The cached value under `key`, or what `load` produces. Concurrent readers share one load; a load that
 * fails is not kept, so the next reader asks Core again.
 */
export function readPhiSiteReadCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  const store = readStore();
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as Promise<T>;
  }

  const entry: PhiSiteReadCacheEntry = {
    expiresAt: now + PHI_SITE_READ_CACHE_TTL_MS,
    value: load(),
  };
  store.set(key, entry);
  entry.value.catch(() => {
    if (store.get(key) === entry) {
      store.delete(key);
    }
  });
  return entry.value as Promise<T>;
}

export function clearPhiSiteReadCache() {
  readStore().clear();
}
