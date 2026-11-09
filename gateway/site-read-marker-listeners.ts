import "server-only";

/**
 * Who wants to know that a Site's read marker was seen (gateway/site-config.ts).
 *
 * The config read is where a process learns that something was published, possibly through another
 * process, and it empties its caches there. Other work follows the same signal -- the search index is
 * rebuilt from it (server-helpers/search-index.ts) -- but the config read must not know about it: the
 * gateway is the floor of the house, and a reader of it that imported the indexer would pull the whole
 * page resolution into every config fetch. So the read says what it saw, and whoever registered listens.
 *
 * On `globalThis`, like the read cache: the config read and the listener can be bundled separately.
 */
export type PhiSiteReadMarkerEvent = {
  siteKey: string;
  marker: string;
  /** `false` the first time this process sees the Site's marker; `true` when it differs from the last one. */
  moved: boolean;
};

type Listener = (event: PhiSiteReadMarkerEvent) => void;

const LISTENERS_KEY = Symbol.for("phis-ui.site-read-marker-listeners");

function readListeners(): Set<Listener> {
  const holder = globalThis as typeof globalThis & { [LISTENERS_KEY]?: Set<Listener> };
  holder[LISTENERS_KEY] ??= new Set();
  return holder[LISTENERS_KEY];
}

/** Registers `listener`; registering the same function twice registers it once. */
export function onPhiSiteReadMarker(listener: Listener) {
  readListeners().add(listener);
}

/** Tells every listener; a listener that throws is reported and does not stop the others or the read. */
export function emitPhiSiteReadMarker(event: PhiSiteReadMarkerEvent) {
  for (const listener of readListeners()) {
    try {
      listener(event);
    } catch (error) {
      console.error("[phis-ui] A read marker listener failed.", error);
    }
  }
}
