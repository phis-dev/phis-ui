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
  /** The reader of the fields the descriptor declares; present exactly where it declares any. */
  loadFields?: () => Promise<PhiRuntimeRecordFieldsReader>;
};

/*
 * The fields of a record, declared (MODULES.md, "The fields of a record, and the record a Page is about").
 *
 * A Provider that declares them says what a Widget may show of its record without knowing the record: a
 * text, a picture, a date. That is what lets a Page laid out once serve every record -- its Widgets name a
 * field -- and what a list of such records binds its cards to.
 */

/** The kinds a field can be. Closed: a Widget says which of them it draws, and the Builder offers only those. */
export const PHI_RECORD_FIELD_KINDS = [
  "text", "markdown", "picture", "pictures", "list", "tag", "date", "number", "link",
] as const;
export type PhiRecordFieldKind = (typeof PHI_RECORD_FIELD_KINDS)[number];

/** A picture as a record names it: where it is served from -- Site-relative or absolute -- and what it shows. */
export type PhiRecordPicture = { src: string; alt?: string };

/** A short state said in a word, with the tone it is said in. */
export type PhiRecordTag = { label: string; tone?: "default" | "success" | "warning" | "error" };

/** Somewhere a record leads: an address, Site-relative or absolute, and the words for it. */
export type PhiRecordLink = { href: string; label?: string };

/**
 * What a field of each kind holds. A `date` is an ISO instant and a `number` a number: Core writes both in
 * the page's language. What a domain formats itself is a `text`.
 */
export type PhiRecordFieldValueByKind = {
  text: string;
  markdown: string;
  picture: PhiRecordPicture;
  pictures: readonly PhiRecordPicture[];
  list: readonly string[];
  tag: PhiRecordTag;
  date: string;
  number: number;
  link: PhiRecordLink;
};

export type PhiRecordFieldDescriptor = {
  /** The field's name in a Widget's config; unique within its Provider. */
  key: string;
  /** What the Builder calls it. */
  label: string;
  kind: PhiRecordFieldKind;
  description?: string;
};

/**
 * Whose a record is: `public` is the same for everybody, so a page about it may be rendered once;
 * `viewer` is the signed-in account's own and is read for each request.
 */
export type PhiRecordAudience = "public" | "viewer";

/** What a `record` descriptor declares about its record. */
export type PhiRecordDeclaration = {
  audience: PhiRecordAudience;
  fields: readonly PhiRecordFieldDescriptor[];
};

/**
 * From the record a resolver answered to its declared fields' values, by field key. A field the record
 * does not have is left out; a value that is not of its declared kind is dropped by Core and logged.
 */
export type PhiRuntimeRecordFieldsReader = (
  record: unknown,
  context: PhiRuntimeRecordProviderContext,
) => Readonly<Record<string, unknown>> | Promise<Readonly<Record<string, unknown>>>;

/** One field of a record as Core hands it to a Widget: its declared kind and a value of that kind. */
export type PhiRecordField = {
  [K in PhiRecordFieldKind]: { kind: K; value: PhiRecordFieldValueByKind[K] };
}[PhiRecordFieldKind];

/**
 * The record a Page is about, named by a route that has a parameter.
 *
 * `params` maps each parameter the Provider takes to the route parameter that fills it. `titleField` and
 * `descriptionField` name `text` fields that become the Page's title and description.
 */
export type PhiCmsPageRecordDescriptor = {
  providerKey: PhiRuntimeDataProviderKey;
  params: Readonly<Record<string, string>>;
  titleField?: string;
  descriptionField?: string;
};
