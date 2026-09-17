/**
 * The cache Next keeps rendered pages in: this process's memory, bounded, least recently read first out.
 *
 * Not the filesystem. Several Site processes behind one balancer run out of one build directory, and
 * Next's default handler would have every one of them writing the same files. Nor anything shared: a page
 * is addressed by the Site's change marker (next/site-proxy.ts), so a process that has not seen a publish
 * yet cannot serve a page another process rendered after it, and a new marker simply misses everywhere.
 * What an old marker left behind is never read again and leaves by the bound.
 *
 * A Site wires it in `next.config` as `cacheHandler`, with `cacheMaxMemorySize: 0` so Next does not keep
 * a second copy in front of it. Plain JavaScript, because Next loads it by path at runtime.
 */

const DEFAULT_MAX_MEGABYTES = 128;

function readMaxBytes() {
  const configured = Number(process.env.PHIS_RENDER_CACHE_MB);
  const megabytes = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_MEGABYTES;
  return megabytes * 1024 * 1024;
}

/** Roughly what an entry holds: its markup, its payloads and its segment data. */
function estimateBytes(value, depth = 0) {
  if (value == null || depth > 4) return 0;
  if (typeof value === "string") return value.length;
  if (value instanceof Uint8Array) return value.byteLength;
  if (value instanceof Map) {
    let total = 0;
    for (const [key, entry] of value) total += String(key).length + estimateBytes(entry, depth + 1);
    return total;
  }
  if (Array.isArray(value)) return value.reduce((total, entry) => total + estimateBytes(entry, depth + 1), 0);
  if (typeof value === "object") {
    let total = 0;
    for (const key of Object.keys(value)) total += key.length + estimateBytes(value[key], depth + 1);
    return total;
  }
  return 8;
}

/** One store per process, shared by every handler instance Next creates in it. */
const STORE_KEY = Symbol.for("phis-ui.render-cache");

function readStore() {
  globalThis[STORE_KEY] ??= { entries: new Map(), bytes: 0 };
  return globalThis[STORE_KEY];
}

function remove(store, key) {
  const entry = store.entries.get(key);
  if (!entry) return;
  store.entries.delete(key);
  store.bytes -= entry.bytes;
}

export default class PhisRenderCacheHandler {
  constructor() {
    this.maxBytes = readMaxBytes();
  }

  async get(key) {
    const store = readStore();
    const entry = store.entries.get(key);
    if (!entry) return null;
    // Read again: to the back of the line.
    store.entries.delete(key);
    store.entries.set(key, entry);
    return { value: entry.value, lastModified: entry.lastModified, tags: entry.tags };
  }

  async set(key, data, ctx) {
    const store = readStore();
    remove(store, key);
    if (data == null) return;
    const bytes = estimateBytes(data) + key.length;
    // An entry larger than the whole bound would only push everything else out and then leave itself.
    if (bytes > this.maxBytes) return;
    store.entries.set(key, { value: data, lastModified: Date.now(), tags: ctx?.tags ?? [], bytes });
    store.bytes += bytes;
    for (const oldest of store.entries.keys()) {
      if (store.bytes <= this.maxBytes) break;
      remove(store, oldest);
    }
  }

  async revalidateTag(tags) {
    const wanted = new Set(Array.isArray(tags) ? tags : [tags]);
    const store = readStore();
    for (const [key, entry] of store.entries) {
      if (entry.tags.some((tag) => wanted.has(tag))) remove(store, key);
    }
  }

  resetRequestCache() {}
}
