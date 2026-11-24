import type { PhisPaymentMoney } from "@phis/contracts/payments";

import type { PhiRecordFieldKind } from "../constants/record-field-kinds";
import type { PhiRuntimeDataProviderBinding, PhiRuntimeDataProviderKey } from "./runtime-data-provider";
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
  /**
   * A few records to show a template with while it is edited; the Builder's Preview takes the first.
   * Optional: without one a template previews with its Widgets' own content. Only where the descriptor
   * declares `record` (fields): a sample stands in for the record a Page is about.
   */
  loadSamples?: () => Promise<PhiRuntimeRecordSamplesReader>;
};

/**
 * One record to show a template with: what the Builder calls it, and the parameters of the Provider that
 * name it (`{ slug: "chair" }`) -- the Provider's own, not a route's.
 */
export type PhiRecordSample = { label: string; params: Readonly<Record<string, string>> };

/** The samples a Provider offers, best first; the Builder's Preview takes the first. */
export type PhiRuntimeRecordSamplesReader = (
  context: PhiRuntimeRecordProviderContext,
) => Promise<readonly PhiRecordSample[]>;

/*
 * The fields of a record, declared (MODULES.md, "The fields of a record, and the record a Page is about").
 *
 * A Provider that declares them says what a Widget may show of its record without knowing the record: a
 * text, a picture, a date. That is what lets a Page laid out once serve every record -- its Widgets name a
 * field -- and what a list of such records binds its cards to.
 */

/** A picture as a record names it: where it is served from -- Site-relative or absolute -- and what it shows. */
export type PhiRecordPicture = { src: string; alt?: string };

/** A short state said in a word, with the tone it is said in. */
export type PhiRecordTag = { label: string; tone?: "default" | "success" | "warning" | "error" };

/** Somewhere a record leads: an address, Site-relative or absolute, and the words for it. */
export type PhiRecordLink = { href: string; label?: string };

/**
 * What a field of each kind holds. A `date` is an ISO instant, a `number` a number and a `money` the
 * payment contract's amount (`{ currency, minor }`, `minor` an integer string of minor units): Core writes
 * all three in the page's language -- a date in the Site's time zone, money with its currency's own
 * places (`formatPhisMoney`). What a domain formats itself is a `text`.
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
  money: PhisPaymentMoney;
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

/**
 * Which declared fields a link to a Page about the record shows (NEXT_INTEGRATION.md, "Link previews"):
 * `titleField` and `descriptionField` name `text` fields, `imageField` a `picture`. Each is optional, and
 * a field the record lacks leaves the Page's own answer standing. The picture is shown only where it is a
 * publicly delivered image of the Site Space (`/api/site/media/<id>/...`), as its share variant.
 */
export type PhiRecordShareDeclaration = {
  titleField?: string;
  descriptionField?: string;
  imageField?: string;
};

/** What a `record` descriptor declares about its record. */
export type PhiRecordDeclaration = {
  audience: PhiRecordAudience;
  fields: readonly PhiRecordFieldDescriptor[];
  share?: PhiRecordShareDeclaration;
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

/**
 * The record a Page is about, as `runtime.page.record` carries it: the Provider and the parameters the
 * address filled in, plus the names of the fields the route's `pageRecord` makes the Page's title and
 * description. Absent where the route names none, never empty.
 *
 * The two names say what the Page takes from the record, not what is asked of the Provider, so they are no
 * part of what a read is keyed by. A Table or Form binding stays the general `PhiRuntimeDataProviderBinding`.
 */
export type PhiPageRecordBinding = PhiRuntimeDataProviderBinding & {
  titleField?: string;
  descriptionField?: string;
};

export type { PhiRecordFieldKind } from "../constants/record-field-kinds";
