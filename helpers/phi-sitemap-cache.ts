/**
 * A value kept until what it was built from changes.
 *
 * The sitemap resolves every candidate like a page view, which is the expensive part, and its answer
 * only changes when something is published. There is no message for that -- the Core does not call
 * Sites -- so the caller hands in a fingerprint of the inputs a publish moves, read cheaply on every
 * request, and the value is rebuilt only when it differs.
 *
 * One entry: a Site process serves one Site, and only the latest answer is ever worth keeping.
 * Requests arriving while a build runs for the same fingerprint wait for that build instead of
 * starting their own. A failed build is not kept, and a build that finishes after a newer fingerprint
 * was asked for does not overwrite the newer answer.
 */
export function createPhiFingerprintCache<T>() {
  let entry: { fingerprint: string; value: T } | null = null;
  let pending: { fingerprint: string; promise: Promise<T> } | null = null;
  let latest: string | null = null;

  return {
    resolve(fingerprint: string, build: () => Promise<T>): Promise<T> {
      latest = fingerprint;
      if (entry?.fingerprint === fingerprint) {
        return Promise.resolve(entry.value);
      }
      if (pending?.fingerprint === fingerprint) {
        return pending.promise;
      }

      const promise = build().then((value) => {
        if (latest === fingerprint) {
          entry = { fingerprint, value };
        }
        return value;
      }).finally(() => {
        if (pending?.promise === promise) {
          pending = null;
        }
      });
      pending = { fingerprint, promise };
      return promise;
    },
  };
}
