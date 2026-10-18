import "server-only";

import { cache } from "react";

/*
 * A read that several parts of one render ask for, done once per request.
 *
 * `React.cache` compares its arguments by identity. A Gateway read takes an options object, and every
 * caller builds that object fresh, so `cache(async ({ ... }) => ...)` never once returned a kept result:
 * the duplicate Core calls it was meant to prevent were absorbed only where Next's fetch memo happened to
 * see the same GET (AUDIT-2026-10-13, PU10). This keys by what the options say instead: plain values by
 * value, in any order, nested plain objects included. Anything that is not plain data -- a function, a
 * class instance -- has no value to compare and is refused rather than compared by identity, which is the
 * mistake this replaces.
 *
 * The scope is `React.cache`'s: one server render. Outside a render (a Route Handler, a Server Action
 * before it renders) every call loads, as it did before. Nothing outlives the request, so nothing goes
 * stale; what outlives it belongs in the Site read cache (gateway/site-read-cache.ts).
 */

function toPhiRequestMemoKey(value: unknown): string {
  if (value === undefined) return "u";
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(toPhiRequestMemoKey).join(",")}]`;
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${toPhiRequestMemoKey((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  throw new TypeError(`A request memo keys plain data only; got ${typeof value}.`);
}

/**
 * `load`, answered once per request for options that say the same thing. A rejected load stays rejected
 * for the rest of the request, as with `React.cache`.
 */
export function definePhiRequestMemo<TOptions extends object, TResult>(
  load: (options: TOptions) => Promise<TResult>,
): (options: TOptions) => Promise<TResult> {
  const readRequestStore = cache(() => new Map<string, Promise<TResult>>());
  return (options) => {
    const store = readRequestStore();
    const key = toPhiRequestMemoKey(options);
    let result = store.get(key);
    if (!result) {
      result = load(options);
      store.set(key, result);
    }
    return result;
  };
}

/**
 * `load`, answered once per request for a `key` that says the same thing, with `with` handed through.
 *
 * For a read that needs something besides its question to be answered -- the render's registry, its
 * runtime -- and those are not plain data, so they cannot be part of the key. They must not change what
 * the answer is within one request; the registry and runtime of one render do not.
 */
export function definePhiRequestMemoWith<TKey extends object, TWith, TResult>(
  load: (key: TKey, using: TWith) => Promise<TResult>,
): (key: TKey, using: TWith) => Promise<TResult> {
  const readRequestStore = cache(() => new Map<string, Promise<TResult>>());
  return (key, using) => {
    const store = readRequestStore();
    const memoKey = toPhiRequestMemoKey(key);
    let result = store.get(memoKey);
    if (!result) {
      result = load(key, using);
      store.set(memoKey, result);
    }
    return result;
  };
}
