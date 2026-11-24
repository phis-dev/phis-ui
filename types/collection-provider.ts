import type { PhiSignalValueSchema } from "./signals";
import type { PhiTableProviderRecordRequest } from "./table-widget";

/**
 * A renderer a Module offers for Collection items, its own or somebody else's.
 *
 * `key` is the Render Client the Module registers; `rendersItemsOf` is the resource `itemRendererKey`
 * it can stand in for. The two are the same for the renderer a provider ships with its own resource,
 * and differ for every alternative -- which is the whole point: a Module states that it can draw items
 * it does not own, and says so by naming the contract rather than the provider, so it never has to
 * import the Module that owns them.
 *
 * Declaring is not registering. This is what the Builder reads to offer a choice; the component itself
 * is an ordinary Render Client entry in the Area's manifest.
 */
export type PhiCollectionItemRendererDescriptor = {
  key: `${string}/${string}`;
  rendersItemsOf: `${string}/${string}`;
  title: string;
  description?: string;
};

export type PhiCollectionProviderFilterType = "string" | "enum" | "enum[]" | "path";

export type PhiCollectionProviderFilterDescriptor = {
  key: string;
  title: string;
  type: PhiCollectionProviderFilterType;
};

export type PhiCollectionProviderActionDescriptor = {
  key: string;
  title: string;
  scope: "resource" | "item" | "selection";
  panelKey?: string;
};

export type PhiCollectionProviderPanelDescriptor = {
  key: string;
  title: string;
};

export type PhiCollectionProviderResourceDescriptor = {
  resourceKey: string;
  title: string;
  description?: string;
  itemIdentityPath: string;
  itemRendererKey: `${string}/${string}`;
  /**
   * The schema a selection from this resource travels under.
   *
   * It belongs here and not on the Widget, because the Widget is generic: `collection-view` shows
   * whatever provider is bound to it, so a selection means whatever the bound resource says it means. A
   * Module names its own schema -- one from this package through the ownership registry, one from
   * another repository through `createPhiSignalValueSchema` and its own package name -- and Core passes
   * it through without ever having to know the word.
   *
   * Absent means this resource announces no selection, and the Builder offers no route for one.
   */
  selectionValueSchema?: PhiSignalValueSchema;
  /**
   * Whether one item can be read on its own, by its key, as a Table resource's `recordRead` says it of a
   * row: the Provider Client then has `readRecord`, and a record-bound Form opened from one of the
   * View's items reads the item through it (FORMS.md, "A record opened from a Collection View"). Absent
   * is no record read, and a Form bound to the resource fails with the reason rather than open empty.
   */
  recordRead?: boolean;
  defaultForWidget?: boolean;
  query: {
    search?: boolean;
    filterFields?: readonly PhiCollectionProviderFilterDescriptor[];
    pagination?: boolean;
  };
  actions?: readonly PhiCollectionProviderActionDescriptor[];
  panels?: readonly PhiCollectionProviderPanelDescriptor[];
};

export type PhiCollectionProviderQueryValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | null
  | undefined;

export type PhiCollectionProviderQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortKey?: string;
  sortOrder?: "ascending" | "descending";
  filters?: Record<string, PhiCollectionProviderQueryValue>;
};

export type PhiCollectionProviderData = {
  resourceKey: string;
  items: Record<string, unknown>[];
  total: number;
  loading: boolean;
  error: string | null;
  meta?: Record<string, unknown>;
};

export type PhiCollectionProviderQueryRequest = {
  resourceKey: string;
  query: PhiCollectionProviderQuery;
  params?: Record<string, unknown>;
  /**
   * The reader's language and the Site's time zone (`usePhiIntlLocale`, `usePhiIntlTimeZone`), filled by
   * the binding, for a Provider that writes words, amounts or dates into what it answers. Part of the
   * binding's load key: a live language switch asks again.
   */
  locale: string;
  timeZone: string;
  signal: AbortSignal;
};

export type PhiCollectionProviderActionRequest = {
  resourceKey: string;
  actionKey: string;
  itemKey?: string | number | null;
  item?: Record<string, unknown> | null;
  selectedItemKeys?: (string | number)[];
  /**
   * Every item key of the collection, in the order a reader dragged them into (`collection-view`'s
   * `features.reorder`): the whole collection, never a page of it or a search's share. Sent with the
   * reorder action's key; the Provider stores the order or refuses, and answers the collection as it
   * now stands.
   */
  itemKeys?: (string | number)[];
  query?: PhiCollectionProviderQuery;
  params?: Record<string, unknown>;
  signal: AbortSignal;
};

/**
 * One item read on its own (`readRecord` on the Provider Client), the shape a Table Provider's record
 * read already has: the resource, the item's key as `rowIdentity`, the binding's params, the reader's
 * language and the Site's time zone, and the abort. One shape for both kinds, so a record-bound Form
 * asks either the same way and a Provider that serves both writes one function.
 */
export type PhiCollectionProviderRecordRequest = PhiTableProviderRecordRequest;

/**
 * What a Collection View announces on its `actionActivate` output (`collection-action`): which action,
 * and for an item action the item's key, as the resource's `itemIdentityPath` reads it. A toolbar action
 * names no item. `query` is the View's query as it stood, for a Controller that acts in its context (the
 * Media library's new Folder in the open one). Read with `readPhiCollectionActionSignalValue`
 * (`types/collection-signal-values.ts`).
 */
export type PhiCollectionActionSignalValue = {
  actionKey: string;
  itemKey?: string | number | null;
  query?: PhiCollectionProviderQuery;
};

export type PhiCollectionViewBindingModel = {
  query: PhiCollectionProviderQuery;
  data: PhiCollectionProviderData | null;
  loading: boolean;
  error: string | null;
  openPanelKey: string | null;
  setQuery: (
    updater: PhiCollectionProviderQuery | ((current: PhiCollectionProviderQuery) => PhiCollectionProviderQuery),
  ) => void;
  setOpenPanelKey: (panelKey: string | null) => void;
  reload: () => void;
  activate: (
    request: Omit<PhiCollectionProviderActionRequest, "resourceKey" | "params" | "signal">,
  ) => Promise<PhiCollectionProviderData>;
};
