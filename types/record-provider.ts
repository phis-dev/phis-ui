import type { PhiRuntimeDataProviderKey } from "./runtime-data-provider";
import type { PhiBlockRuntime } from "./widget-runtime";

/*
 * A Provider of one record, read on the server while the page is drawn (MODULES.md, Record Providers).
 *
 * The other Provider kinds are Client code: a Widget mounts them in the browser and asks after the page
 * has loaded. That is the wrong place for a record a Page is about -- an entry, a product, an event --
 * because the record decides what the server answers before anything is drawn: the Page's title, its
 * description, a 404 for an address that names nothing. So a `record` Provider is a server function, and
 * a Widget bound to one receives what it answered rather than fetching for itself.
 *
 * Its descriptor stays in `dataProviders` with the others, so the Builder offers it where a field asks
 * for `providerKind: "record"` and the parameters it takes are its `settingsFields`. What a descriptor
 * cannot carry is the function, which is server code: that is the catalog entry's `recordProviders`.
 */

/** What a record Provider is asked with, besides its parameters: whose Site, in which language. */
export type PhiRuntimeRecordProviderContext = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  locale: string;
  /** The render's own runtime, for a Provider that prepares what it read the way the page reads it. */
  runtime: PhiBlockRuntime;
};

/**
 * One record for the parameters given, or `null` where they name none.
 *
 * `null` is an answer -- "there is no such entry" -- and a throw is not: a Provider that cannot reach its
 * store throws, and the Widget says the record is unavailable rather than that it does not exist.
 */
export type PhiRuntimeRecordProviderResolver = (
  params: Readonly<Record<string, unknown>>,
  context: PhiRuntimeRecordProviderContext,
) => Promise<unknown>;

/** The server half of a `record` descriptor, loaded only when a page binds it. */
export type PhiRuntimeModuleRecordProviderServerDefinition = {
  key: PhiRuntimeDataProviderKey;
  load: () => Promise<PhiRuntimeRecordProviderResolver>;
};
