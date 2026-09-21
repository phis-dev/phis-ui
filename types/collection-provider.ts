import type { PhiRuntimeDataProviderBinding } from "./runtime-data-provider";
import type { PhiSignalValueSchema } from "./signals";

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
  sortOrder?: "ascend" | "descend";
  filters?: Record<string, PhiCollectionProviderQueryValue>;
};

export type PhiCollectionProviderDataSource = PhiRuntimeDataProviderBinding & {
  resourceKey: string;
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
  signal: AbortSignal;
};

export type PhiCollectionProviderActionRequest = {
  resourceKey: string;
  actionKey: string;
  itemKey?: string | number | null;
  item?: Record<string, unknown> | null;
  selectedItemKeys?: (string | number)[];
  query?: PhiCollectionProviderQuery;
  params?: Record<string, unknown>;
  signal: AbortSignal;
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
