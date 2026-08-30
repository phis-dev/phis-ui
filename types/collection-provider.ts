import type { PhiRuntimeDataProviderBinding } from "./runtime-data-provider";

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
