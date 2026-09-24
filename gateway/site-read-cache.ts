/**
 * What a Site process keeps of the published data it reads from Core on every render: its Site config
 * and its Navigation overlays.
 *
 * Next's data cache is not used for these, because nothing could clear it everywhere: `revalidateTag`
 * reaches only the Site process that ran it. This cache is cleared by the same process whenever a write
 * passes its `/api/site` proxy (gateway/site-proxy.ts), so the author sees the change at once. Every other
 * process of the Site refreshes its config every few seconds and clears the rest once the config's read
 * marker moved (gateway/site-config.ts). The TTL ends what the marker does not see.
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
export function readPhiSiteReadCache<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs: number = PHI_SITE_READ_CACHE_TTL_MS,
): Promise<T> {
  const store = readStore();
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as Promise<T>;
  }

  const entry: PhiSiteReadCacheEntry = {
    expiresAt: now + ttlMs,
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

/**
 * What is already there, without asking for it.
 *
 * `readPhiSiteReadCache` cannot answer "do you happen to know" -- it is given a loader and will run it.
 * A caller that must not perform the load, because it has no way to perform it, needs the question asked
 * plainly instead. `undefined` means nobody has put it here yet or it has expired, which is an answer
 * and not a failure: the caller falls back to whatever it did before.
 *
 * The value is a promise because that is what the store holds; a peeked entry is already settled, so
 * awaiting it costs nothing.
 */
export function peekPhiSiteReadCache<T>(key: string): Promise<T> | undefined {
  const cached = readStore().get(key);
  return cached && cached.expiresAt > Date.now() ? (cached.value as Promise<T>) : undefined;
}

/**
 * What one render worked out, left where another request can find it.
 *
 * Unlike a read, nothing is fetched: the value is already in hand. It expires with the same TTL and is
 * dropped by the same read-marker sweep as everything else here, so a publish takes it with it.
 */
export function writePhiSiteReadCache<T>(
  key: string,
  value: T,
  ttlMs: number = PHI_SITE_READ_CACHE_TTL_MS,
) {
  readStore().set(key, { expiresAt: Date.now() + ttlMs, value: Promise.resolve(value) });
}

/** Empties the cache; `keep` spares one entry, such as the load that found out the rest is stale. */
export function clearPhiSiteReadCache(options: { keep?: string } = {}) {
  const store = readStore();
  if (options.keep === undefined) {
    store.clear();
    return;
  }
  for (const key of [...store.keys()]) {
    if (key !== options.keep) {
      store.delete(key);
    }
  }
}
