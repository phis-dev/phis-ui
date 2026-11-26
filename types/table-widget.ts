import type { PhiProviderResourceSource } from "./runtime-data-provider";
import { readPhiDotPath } from "../helpers/dot-path";
import type { PhiControlPresentationConfig, PhiFeedbackLevel } from "./control";
import type { PhiCssLength } from "./length";
import type { PhiControlOption, PhiControlOptionsProviderConfig } from "../components/controls/phi-control-options";
import type {
  PhiRuntimeDataProviderKey,
} from "./runtime-data-provider";
import type {
  PhiProviderDropMode,
  PhiProviderDropTargetCapability,
  PhiSignalRouteSet,
} from "./signals";
import type { PhiRuntimeConditionExpression } from "./runtime-condition";
import type { PhiLinkTarget } from "./references";
import type { PhiTableSurface } from "../components/tables/phi-table-surface";
import { isPhiRecord } from "../helpers/is-record";
import { isPhiTableQueryValue, readRowIdentities } from "./table-signal-values";

export type PhiTableRowIdentity = string | number;
export type PhiTableSortDirection = "ascending" | "descending";
export const PHI_TABLE_TAG_COLORS = [
  "default",
  "success",
  "processing",
  "warning",
  "error",
  "magenta",
  "red",
  "volcano",
  "orange",
  "gold",
  "lime",
  "green",
  "cyan",
  "blue",
  "geekblue",
  "purple",
] as const;
export const PHI_TABLE_TAG_VARIANTS = ["outlined", "filled", "solid"] as const;
export type PhiTablePresetTagColor = (typeof PHI_TABLE_TAG_COLORS)[number];
export type PhiTableTagColor = PhiTablePresetTagColor | { kind: "custom"; value: string };
export type PhiTableTagVariant = (typeof PHI_TABLE_TAG_VARIANTS)[number];

export type PhiTableQueryValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | null
  | undefined;

export type PhiTableSort = {
  key: string;
  direction: PhiTableSortDirection;
};

export type PhiTableColumnSizing =
  | {
      mode: "content";
      minWidth?: PhiCssLength;
      maxWidth?: PhiCssLength;
    }
  | {
      mode: "fixed";
      width: PhiCssLength;
    }
  | {
      mode: "fill";
      minWidth?: PhiCssLength;
      maxWidth?: PhiCssLength;
    };

export type PhiTableLayoutConfig = {
  mode: "auto" | "fixed";
  overflowX: "auto" | "visible";
};

export type PhiTableQuery = {
  page?: number;
  pageSize?: number;
  cursor?: string | null;
  search?: string;
  sorts?: readonly PhiTableSort[];
  filters?: Readonly<Record<string, PhiTableQueryValue>>;
  expandedRowIdentities?: readonly PhiTableRowIdentity[];
};

/**
 * How a Provider value is drawn. Named rather than written into the column, because a record of the
 * same rows draws the same values and must mean the same thing by `datetime` as the table does.
 */
export type PhiTableValueRenderer =
  | "text"
  | "email"
  | "date"
  | "datetime"
  | "badge"
  | "tags"
  | "link"
  | "code"
  | "json"
  | "switch"
  | "checkbox"
  | "icon"
  /**
   * A small picture from a Site-relative address the Provider answers ready to load -- an image variant
   * the server built with its cache revision (phis-server `resolvePhiMediaVariantUrl`, the `icon`
   * variant for a list), never an Asset id put together here. Drawn at a fixed square box, fitted whole,
   * lazily; any other address draws nothing. Bound to a `string` field.
   */
  | "image"
  /**
   * An amount of money, `{ currency, minor }` -- the payment contract's `PhisPaymentMoney`, with `minor`
   * an integer string or a safe integer of minor units -- written in the reader's language with the
   * currency's own number of places (`formatPhisMoney`). Bound to a `json` field.
   */
  | "money"
  /**
   * How long a period is, `PhiIntervalValue` (`{ unit: "month", count: 3 }`), in Core's words: "per
   * month", "every 3 months". Bound to a `json` field.
   */
  | "interval";

/** The unit of a `PhiIntervalValue`. */
export type PhiIntervalUnit = "day" | "week" | "month" | "year";

/** A period of `count` (a whole number, one or more) `unit`s, as the `interval` renderer draws it. */
export type PhiIntervalValue = { unit: PhiIntervalUnit; count: number };

export type PhiTableColumnDefinition = {
  key: string;
  title: string;
  fieldKey: string;
  sortField?: string;
  /**
   * An icon field rendered ahead of this column's own value, so that a name and the icon standing for
   * it read as one thing rather than as two columns that happen to be adjacent. Mirrors the Tree
   * Control's node `iconFieldKey`.
   */
  iconFieldKey?: string;
  /**
   * A picture field drawn ahead of this column's own value, as `iconFieldKey` draws a named icon: the
   * declared `string` field holding the Site-relative address the `image` renderer draws -- a product's
   * icon beside its title. It stands for the value beside it, so it is decorative (empty `alt`).
   */
  imageFieldKey?: string;
  /**
   * An icon for the column heading itself, from the same icon vocabulary as everything else
   * (`antd:info-circle`, `@phis/ui/widgets:table`).
   *
   * With `titleDisplay: "icon"` the heading is the icon alone and `title` becomes its accessible name
   * and its tooltip -- for a column whose heading is longer than anything under it, six checkbox
   * columns wearing Area names being the case that asked for it. The title is never dropped, only
   * moved: a heading nobody can read is worse than a wide one.
   */
  titleIcon?: string;
  titleDisplay?: "icon-label" | "icon";
  /**
   * A hint on the heading, for a column whose title cannot say everything -- a switch whose effect
   * needs a sentence. Shown as the description glyph beside the heading, with the text on hover and
   * as its accessible name; the heading itself stays as short as the column is narrow.
   */
  description?: string;
  renderer?: PhiTableValueRenderer;
  editor?: {
    control?: PhiTableColumnEditorControl;
    disabledWhen?: PhiRuntimeConditionExpression;
    /**
     * The unit beside a number editor -- "days", "ms" -- already in the reader's language.
     *
     * The value's and not the column's: a title saying "Window (days)" leaves the number unitless the
     * moment the header scrolls away, and invites somebody to type the unit in as well.
     */
    prefix?: string;
    /**
     * The choices of a `select` editor where the Site decides them, set by the placement at render.
     *
     * A resource field states its options once for every Site; which Storage Profiles a Site has is the
     * Site's. The placement already says how a value reads (`valueMap`), so it may say what can be chosen
     * too. Absent, the field's own options apply.
     */
    options?: readonly { label: string; value: string }[];
  };
  sizing?: PhiTableColumnSizing;
  align?: "left" | "center" | "right";
  sticky?: "left" | "right";
  sortable?: boolean;
  hidden?: boolean;
  ellipsis?: boolean;
  valueMap?: Readonly<Record<string, string>>;
  tagColorMap?: Readonly<Record<string, PhiTableTagColor>>;
  tagVariant?: PhiTableTagVariant;
  /**
   * What the cell says where the row holds no value -- `null`, an empty text or an empty list --
   * already in the reader's language: "Unlimited" for an expiry that is open.
   *
   * For every renderer alike, because a missing value is none of theirs to draw: a `datetime` has no
   * date to format and `valueMap` maps values, not their absence. Absent, the cell stays empty.
   */
  emptyText?: string;
};

export type PhiTableColumnEditorControl =
  | "switch"
  | "checkbox"
  | "select"
  | "radio"
  | "segmented"
  | "multi-select"
  | "checkbox-group"
  | "icon-picker"
  /** A `string` field edited over several lines: the cell grows with its text and wraps it. */
  | "textarea";

type PhiTableFilterCommon = {
  key: string;
  label: string;
  /*
   * Where the label goes. `above` is the default and reads as a form field. `inline` hands the label
   * to the Control, which sets it before itself -- what a switch wants, since a switch on its own says
   * nothing. `none` drops it, for a Control whose own value already asks the question ("All areas").
   */
  labelPlacement?: "above" | "inline" | "none";
  /**
   * What the filter does, for a reader the label does not tell enough -- already in their language.
   *
   * Carried the way every Control carries a description: the information glyph after a label that is
   * shown, the hover text of the Control itself where `labelPlacement` is `none`.
   */
  description?: string;
};

export type PhiTableFilterDefinition = PhiTableFilterCommon & (
  | {
      type: "text";
      placeholder?: string;
      defaultValue?: string;
    }
  | {
      type: "select";
      multiple?: boolean;
      options?: readonly { label: string; value: string }[];
      optionsProvider?: PhiControlOptionsProviderConfig | null;
      defaultValue?: string | readonly string[];
    }
  | {
      type: "boolean";
      /*
       * `select` offers yes/no/cleared -- three answers, for a column that may be either and may be
       * left alone. `switch` offers two, for a filter that is always answered: it is on or it is off,
       * and `defaultValue` says which way it starts.
       */
      control?: "select" | "switch";
      defaultValue?: boolean;
    }
  | {
      type: "dateRange";
      startKey: string;
      endKey: string;
      startPlaceholder?: string;
      endPlaceholder?: string;
      defaultValue?: {
        start?: string;
        end?: string;
      };
    }
);

export type PhiTableActionExecution = "provider" | "signal" | "link";

export type PhiTableActionDefinition = {
  key: string;
  execution: PhiTableActionExecution;
  label: string;
  icon?: string;
  display?: "icon" | "label" | "icon-label";
  mode?: "normal" | "primary" | "danger";
  /**
   * Where a `link` action leads, as every Control that leads somewhere keeps it: a Page by identity, an
   * address elsewhere as a URL with its own new-tab choice (`REFERENCES.md`).
   */
  linkTarget?: PhiLinkTarget;
  /** A row's own address, read from the row at this path, for a link that differs per row. */
  hrefPath?: string;
  /** Whether a row's own address (`hrefPath`) opens in a new tab; a `linkTarget` says so itself. */
  newTab?: boolean;
  /**
   * The address `linkTarget` leads to, resolved by the server for this render and never stored: a Page
   * reference means nothing in a browser. `null` is a target that resolved to nothing, which draws no link.
   */
  link?: { href: string; newTab: boolean; external: boolean } | null;
  visibleWhen?: PhiRuntimeConditionExpression;
  disabledWhen?: PhiRuntimeConditionExpression;
  /**
   * A `provider` action whose answer carries a value shown once (`revealValue`): the words of the Dialog
   * that shows it, already in the reader's language. Without it such a value is not shown.
   */
  reveal?: {
    title: string;
    description?: string;
  };
  confirm?: {
    title: string;
    description?: string;
    okText?: string;
    cancelText?: string;
    alert?: {
      level: PhiFeedbackLevel;
      title: string;
      description?: string;
    };
  };
};

export type PhiTableSearchConfig = {
  enabled?: boolean;
  placeholder?: string;
  debounceMs?: number;
};

export type PhiTablePaginationConfig = {
  enabled?: boolean;
  pageSize?: number;
  /** The page sizes a reader may switch between. Absent, the table offers no choice. */
  pageSizes?: readonly number[];
};

export type PhiTableSortingConfig = {
  mode?: "none" | "single" | "multiple";
  defaultSorts?: readonly PhiTableSort[];
};

export type PhiTableRowSelectionConfig = {
  mode?: "none" | "single" | "multiple";
  preserveSelectedRowIdentities?: boolean;
  disabledWhen?: PhiRuntimeConditionExpression;
  /**
   * Row fields `selectionChange` carries alongside the identities, for a receiver that has to know
   * something about what was chosen -- whether a group is retired -- and should not ask the server for
   * what the Table already holds. Named fields only: a selection does not broadcast whole rows.
   */
  emitFields?: readonly string[];
};

export type PhiTableColumnReorderingConfig = {
  enabled?: boolean;
};

export type PhiTableRowReorderingConfig = {
  enabled?: boolean;
};

export type PhiTableEditingConfig = {
  mode?: "none" | "cell" | "row";
  disabledWhen?: PhiRuntimeConditionExpression;
};

export type PhiTableToolsConfig = {
  mode?: "self-contained" | "external";
  bindingFields?: readonly PhiTableBindingToolDefinition[];
  reset?: boolean;
  reload?: boolean;
};

export type PhiTableBindingToolDefinition = {
  key: string;
  label?: string;
  placeholder?: string;
  control?: "select" | "autocomplete" | "cascader";
  disabledWhen?: {
    fieldKey: string;
    equals: string | number | boolean;
  };
  optionLabels?: readonly {
    value: string | number;
    label: string;
  }[];
  cascader?: {
    allowRoot?: boolean;
    separator?: string;
    rootValue?: string;
    normalize?: "raw" | "path";
  };
  create?: {
    label: string;
    description?: string;
    icon?: string;
    display?: "icon" | "label" | "icon-label";
    placeholder?: string;
    submitLabel?: string;
  };
};

export type PhiTableStructureConfig =
  | { mode: "flat" }
  | {
      mode: "tree";
      parentRowIdentityPath: string;
      defaultExpandedRowIdentities?: readonly PhiTableRowIdentity[];
      expandRowByClick?: boolean;
      indentSize?: number;
      expandColumnKey: string;
    };

export type PhiTableSummaryValue = string | number | boolean | null;

export type PhiTableSummaryValueSource =
  | { source: "provider"; fieldKey: string }
  | {
      source: "core";
      fieldKey: "totalRows" | "pageRows" | "selectedRows" | "page" | "pageCount";
    };

export type PhiTableSummaryItemDefinition = {
  key: string;
  value: PhiTableSummaryValueSource;
  label?: string;
  labelPlacement?: "before" | "after";
};

export type PhiTableFooterValueBinding = {
  key: string;
  value: PhiTableSummaryValueSource;
};

/**
 * A footer line said differently while one value holds.
 *
 * The template fills placeholders and nothing else, so a sentence that changes with the state -- "3 of 5
 * left" against "Used up" -- is two templates, not one with a condition inside. The first variant whose
 * `when` holds replaces `template` and `values`; none holding leaves the footer as declared. A variant
 * may name no values: "Used up" has nothing to fill in. An empty template clears the text while
 * retaining the closing bar; only `footerOmitted` explicitly removes that bar.
 */
export type PhiTableFooterVariant = {
  when: { value: PhiTableSummaryValueSource; operator: "truthy" | "falsy" };
  template: string;
  values?: readonly PhiTableFooterValueBinding[];
};

export type PhiTableFooterConfig = {
  template: string;
  values: readonly PhiTableFooterValueBinding[];
  align?: "start" | "center" | "end";
  variants?: readonly PhiTableFooterVariant[];
};

export type PhiTableSummaryConfig = {
  placement?: "body-end" | "sticky-top" | "sticky-bottom";
  rows: readonly {
    key: string;
    cells: readonly {
      key: string;
      columnKey: string;
      throughColumnKey?: string;
      align?: "left" | "center" | "right";
      item: PhiTableSummaryItemDefinition;
    }[];
  }[];
};

export type PhiTableWidgetPresentation = PhiControlPresentationConfig & {
  title?: string;
  description?: string;
  columns: readonly PhiTableColumnDefinition[];
  layout: PhiTableLayoutConfig;
  emptyState?: {
    title?: string;
    description?: string;
  };
  /** Lines around and between the cells. */
  borders?: boolean;
  /**
   * The Table's ground, from the Surface vocabulary (TABLES.md "Surface"): absent the Table's own, `null`
   * none -- the row lines on whatever the Table stands on -- or a Surface of one ground colour.
   */
  surface?: PhiTableSurface;
  /** The header row; shown unless this says `false`. */
  header?: boolean;
  /** Whether the header row stays at the top while the rows scroll under it; on unless this says `false`. */
  stickyHeader?: boolean;
  footer?: PhiTableFooterConfig;
  /**
   * Why a Table that shows its header has no footer, said by the preset that placed it: a reason for the
   * next person reading the preset, never drawn and never translated. A Table with a header ends in its
   * footer (TABLES.md, "Footer and summary"); one without a header needs neither, so this is only for the
   * rare Table that has a header and nothing a footer could say -- the one setting of a panel, edited in its
   * cell. `checkPhiPresetTables` takes it in place of the footer and refuses it beside one.
   */
  footerOmitted?: string;
  /**
   * How many skeleton rows stand in for the rows while they load: three where this says nothing
   * (`PHI_TABLE_LOADING_ROWS`), at most `PHI_TABLE_LOADING_ROWS_MAX` and never more than a page holds. Few by
   * default so a Table grows when its rows arrive rather than shrinks; a paged listing known to fill its
   * page may say so (TABLES.md, "Loading").
   */
  loadingRows?: number;
  summary?: PhiTableSummaryConfig;
  row?: {
    striped?: boolean;
    mutedWhen?: PhiRuntimeConditionExpression;
  };
};

export type PhiTableWidgetFeatures = {
  search?: PhiTableSearchConfig;
  filters?: readonly PhiTableFilterDefinition[];
  pagination?: PhiTablePaginationConfig;
  sorting?: PhiTableSortingConfig;
  rowSelection?: PhiTableRowSelectionConfig;
  rowReordering?: PhiTableRowReorderingConfig;
  columnReordering?: PhiTableColumnReorderingConfig;
  editing?: PhiTableEditingConfig;
  tools?: PhiTableToolsConfig;
  structure?: PhiTableStructureConfig;
  actions?: {
    rowLayout?: "spaced" | "compact";
    toolbar?: readonly PhiTableActionDefinition[];
    row?: readonly PhiTableActionDefinition[];
    bulk?: readonly PhiTableActionDefinition[];
  };
};

export type PhiTableWidgetConfig = {
  presentation: PhiTableWidgetPresentation;
  features: PhiTableWidgetFeatures;
  initialQuery?: PhiTableQuery;
  /**
   * Filters the Page sets and the reader does not: what makes a listing the listing it is, such as a
   * thread Provider's `kind` pinned to Support.
   *
   * Not a filter with a start value. A `features.filters` entry is the reader's -- drawn, changeable,
   * reset to its default -- and `initialQuery.filters` is only where the query starts, so a signal that
   * sets the query replaces it. These are drawn nowhere and merged into every query last, over the
   * reader's filters, a reset and any signal alike, with their values in their own type.
   */
  fixedFilters?: Readonly<Record<string, PhiTableQueryValue>>;
  source: PhiProviderResourceSource | null;
  signalRoutes?: PhiSignalRouteSet | null;
};

export type PhiTableWidgetState = {
  total?: number;
  page?: number;
  pageSize?: number;
  loading: boolean;
  errorCode?: string | null;
  query: PhiTableQuery;
  bindingParams: Readonly<Record<string, unknown>>;
  selectedRowIdentities: readonly PhiTableRowIdentity[];
  columnOrder: readonly string[];
  expandedRowIdentities: readonly PhiTableRowIdentity[];
};

export type PhiTableSelectionSignalValue = {
  selectedRowIdentities: readonly PhiTableRowIdentity[];
  /**
   * The `rowSelection.emitFields` of each selected row the Table has loaded; a row kept selected from
   * another page is not in it. Absent where the placement names no fields.
   */
  selectedRows?: readonly PhiTableSelectedRow[];
};

export type PhiTableSelectedRow = {
  rowIdentity: PhiTableRowIdentity;
  values: Readonly<Record<string, PhiTableQueryValue>>;
};

export type PhiTableColumnOrderSignalValue = {
  columnOrder: readonly string[];
};

export type PhiTableExpansionSignalValue = {
  expandedRowIdentities: readonly PhiTableRowIdentity[];
};

export type PhiTableActionSignalValue = {
  actionKey: string;
  rowIdentity?: PhiTableRowIdentity | null;
  selectedRowIdentities: readonly PhiTableRowIdentity[];
  actionValue?: PhiTableQueryValue;
};

export type PhiTableBindingParamsSignalValue = {
  params: Readonly<Record<string, PhiTableQueryValue>>;
};

export type PhiTableProviderFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "color"
  | "icon"
  | "enum"
  | "enum[]"
  | "json";

export type PhiTableProviderFieldDefinition = {
  key: string;
  title: string;
  type: PhiTableProviderFieldType;
  required?: boolean;
  mutable?: boolean;
  mutableWhen?: PhiRuntimeConditionExpression;
  constraints?: {
    min?: number | string;
    max?: number | string;
    step?: number;
    precision?: number;
  };
  options?: readonly PhiControlOption<string | number>[];
  optionsProvider?: PhiControlOptionsProviderConfig;
  /**
   * For a `string` field whose choices differ from row to row: the key of a declared `json` field on the
   * same row holding `[{ value, label }]`. A row that carries options is edited with a Select limited to
   * them; a row that carries none keeps the ordinary editor. Table only.
   */
  rowOptionsPath?: string;
  editor?: {
    fieldProviderKey?: `${string}/${string}`;
    config?: Record<string, unknown>;
  };
};

export type PhiTableProviderSummaryFieldDefinition = {
  key: string;
  title: string;
  type: "string" | "number" | "boolean" | "date" | "datetime";
};

export type PhiTableProviderQueryCapabilities = {
  search?: boolean;
  filterFields?: readonly string[];
  sorting?: "none" | "single" | "multiple";
  pagination?: "none" | "offset" | "cursor";
  /**
   * Whether a query of this resource answers `total`, the rows the whole query has.
   *
   * Counting is a query of its own on a large table, so a paging resource answers it only where it
   * says so here. A Table that shows a count -- `totalRows` or `pageCount` in its footer or summary --
   * needs a resource that counts or does not page; one that pages without a count is paged back and
   * forward. A resource that does not page answers every row at once, and its rows are its count.
   */
  total?: boolean;
  facets?: readonly string[];
  expansion?: boolean;
};

export type PhiTableProviderActionCapability = {
  key: string;
  title: string;
  scope: "resource" | "row" | "selection";
  valueType?: "none" | "boolean" | "string" | "number" | "string[]" | "number[]" | "json";
  intent?: "read" | "write" | "destructive";
  confirmation?: "none" | "required";
  /**
   * The Provider's promise that the mutation can be taken back through the workspace history. It is
   * what lets a destructive action go without confirmation; like `confirmation`, it is declared, not
   * verified.
   */
  undoable?: boolean;
  visibleWhen?: PhiRuntimeConditionExpression;
  disabledWhen?: PhiRuntimeConditionExpression;
};

export type PhiTableProviderBindingFieldDefinition = {
  key: string;
  title: string;
  type: "string" | "enum";
  required?: boolean;
  defaultValue?: string | number;
  options?: readonly PhiControlOption<string | number>[];
  optionsProvider?: PhiControlOptionsProviderConfig;
  create?: {
    actionKey: string;
  };
};

export type PhiTableProviderRowOrdering = "none" | "flat" | "tree";

export type PhiTableProviderDragDropCapability = PhiProviderDropTargetCapability;

export type PhiTableProviderResourceDescriptor = {
  resourceKey: string;
  title: string;
  description?: string;
  rowIdentityPath: string;
  fields: readonly PhiTableProviderFieldDefinition[];
  summaryFields?: readonly PhiTableProviderSummaryFieldDefinition[];
  bindingFields?: readonly PhiTableProviderBindingFieldDefinition[];
  query: PhiTableProviderQueryCapabilities;
  recordRead?: boolean;
  /**
   * Whether a row of this resource stands for something a person opens.
   *
   * Without it a row is inert and choosing one is the selection column's business, which is what a
   * table of values is. A resource says this because only the resource knows: a conversation, a group
   * and an invoice are things; an audit entry and a membership are records of things, and a click that
   * appeared to open one would be a promise the page cannot keep.
   *
   * A boolean rather than a flag, to sit beside `recordRead` in the shape it already has.
   */
  rowActivation?: boolean;
  actions?: readonly PhiTableProviderActionCapability[];
  rowOrdering?: PhiTableProviderRowOrdering;
  dragSources?: readonly PhiTableProviderDragDropCapability[];
  dropTargets?: readonly PhiTableProviderDragDropCapability[];
  hierarchy?: {
    parentRowIdentityPath: string;
    canAcceptChildrenField?: string;
  };
};

export type PhiTableProviderQueryResult = {
  rows: readonly Record<string, unknown>[];
  total?: number;
  page?: number;
  pageSize?: number;
  nextCursor?: string | null;
  facets?: Readonly<Record<string, unknown>>;
  summary?: Readonly<Record<string, PhiTableSummaryValue>>;
  resolvedQuery?: PhiTableQuery;
};

export type PhiTableProviderQueryRequest = {
  resourceKey: string;
  query: PhiTableQuery;
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

export type PhiTableProviderRecordRequest = {
  resourceKey: string;
  rowIdentity: PhiTableRowIdentity | null;
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

export type PhiTableProviderMutationInvalidation = "none" | "view" | "resource";

export type PhiTableProviderMutationResult = {
  status: "accepted" | "rejected";
  invalidation: PhiTableProviderMutationInvalidation;
  canonicalValue?: unknown;
  rowPatch?: Record<string, unknown>;
  summaryPatch?: Readonly<Record<string, PhiTableSummaryValue>>;
  value?: Record<string, unknown> | null;
  errorCode?: string;
  message?: string;
  /**
   * A value the person sees once and nowhere again -- a new key's activation code, stored as its hash. An
   * action that states `reveal` shows it in a Dialog that copies it and closes
   * (`PhiRevealOnceDialogControl`); the Table keeps it nowhere and never sends it on a signal.
   */
  revealValue?: string;
};

type PhiTableProviderMutationRequestBase = {
  resourceKey: string;
  params?: Record<string, unknown>;
  signal: AbortSignal;
};

export type PhiTableProviderActionMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "action";
  actionKey: string;
  rowIdentity?: PhiTableRowIdentity | null;
  selectedRowIdentities?: readonly PhiTableRowIdentity[];
  actionValue?: PhiTableQueryValue | Record<string, unknown>;
  query: PhiTableQuery;
};

export type PhiTableProviderFieldMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "field";
  rowIdentity: PhiTableRowIdentity;
  fieldKey: string;
  originalValue: unknown;
  proposedValue: unknown;
  concurrencyToken?: string | number | null;
};

export type PhiTableProviderRowPatchMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "row";
  rowIdentity: PhiTableRowIdentity;
  originalValues?: Readonly<Record<string, unknown>>;
  patch: Readonly<Record<string, unknown>>;
  concurrencyToken?: string | number | null;
};

export type PhiTableProviderRowMoveMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "row-move";
  movedRowIdentity: PhiTableRowIdentity;
  targetParentRowIdentity: PhiTableRowIdentity | null;
  beforeRowIdentity: PhiTableRowIdentity | null;
  afterRowIdentity: PhiTableRowIdentity | null;
  concurrencyToken?: string | number | null;
};

export type PhiTableProviderDropMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "drop";
  payloadType: `${string}/${string}`;
  sourceObjectIdentity: string;
  source?: {
    providerKey: PhiRuntimeDataProviderKey;
    resourceKey: string;
    objectIdentities: readonly PhiTableRowIdentity[];
  };
  dropMode: PhiProviderDropMode;
  targetParentRowIdentity: PhiTableRowIdentity | null;
  beforeRowIdentity: PhiTableRowIdentity | null;
  afterRowIdentity: PhiTableRowIdentity | null;
};

export type PhiTableProviderMutationRequest =
  | PhiTableProviderActionMutationRequest
  | PhiTableProviderFieldMutationRequest
  | PhiTableProviderRowPatchMutationRequest
  | PhiTableProviderRowMoveMutationRequest
  | PhiTableProviderDropMutationRequest;

export class PhiTableProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PhiTableProviderError";
    this.code = code;
  }
}

function readPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

export function readPhiTableQuery(value: unknown): PhiTableQuery | null {
  if (!isPhiRecord(value)) return null;
  const allowedKeys = new Set([
    "page", "pageSize", "cursor", "search", "sorts", "filters", "expandedRowIdentities",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;
  if (value.filters !== undefined &&
    (!isPhiRecord(value.filters) || Object.values(value.filters).some((filterValue) => !isPhiTableQueryValue(filterValue)))) {
    return null;
  }
  const filters = value.filters as Record<string, PhiTableQueryValue> | undefined;
  if (value.sorts !== undefined && (!Array.isArray(value.sorts) || value.sorts.some((entry) =>
    !isPhiRecord(entry) || Object.keys(entry).some((key) => key !== "key" && key !== "direction") ||
    typeof entry.key !== "string" || !entry.key.trim() ||
    (entry.direction !== "ascending" && entry.direction !== "descending")))) {
    return null;
  }
  const sorts = value.sorts as PhiTableSort[] | undefined;
  const expandedRowIdentities = readRowIdentities(value.expandedRowIdentities);
  if (value.expandedRowIdentities !== undefined && expandedRowIdentities === undefined) return null;
  if (value.page !== undefined && readPositiveInteger(value.page) === undefined) return null;
  if (value.pageSize !== undefined && readPositiveInteger(value.pageSize) === undefined) return null;
  if (value.cursor !== undefined && value.cursor !== null && typeof value.cursor !== "string") return null;
  if (value.search !== undefined && typeof value.search !== "string") return null;
  return {
    page: readPositiveInteger(value.page),
    pageSize: readPositiveInteger(value.pageSize),
    cursor: typeof value.cursor === "string" || value.cursor === null ? value.cursor : undefined,
    search: typeof value.search === "string" ? value.search : undefined,
    sorts,
    filters,
    expandedRowIdentities,
  };
}

export function readPhiTableFilters(value: unknown): PhiTableQuery["filters"] | null {
  if (!isPhiRecord(value)) return null;
  return readPhiTableQuery({ filters: value })?.filters ?? null;
}

export function readPhiTableProviderQueryResult(value: unknown): PhiTableProviderQueryResult | null {
  if (!isPhiRecord(value) || !Array.isArray(value.rows) || !value.rows.every(isPhiRecord)) return null;
  if ("loading" in value || "error" in value || "meta" in value || "resourceKey" in value || "tableKey" in value) {
    return null;
  }
  const total = value.total;
  const page = value.page;
  const pageSize = value.pageSize;
  const resolvedQuery = value.resolvedQuery === undefined
    ? undefined
    : readPhiTableQuery(value.resolvedQuery);
  const summary = value.summary === undefined
    ? undefined
    : readPhiTableSummaryValues(value.summary);
  if ((total !== undefined && (typeof total !== "number" || !Number.isFinite(total) || total < 0)) ||
    (page !== undefined && readPositiveInteger(page) === undefined) ||
    (pageSize !== undefined && readPositiveInteger(pageSize) === undefined) ||
    (value.nextCursor !== undefined && value.nextCursor !== null && typeof value.nextCursor !== "string") ||
    (value.facets !== undefined && !isPhiRecord(value.facets)) ||
    summary === null ||
    (value.resolvedQuery !== undefined && resolvedQuery === null)) {
    return null;
  }
  return {
    rows: value.rows as Record<string, unknown>[],
    total: total as number | undefined,
    page: page as number | undefined,
    pageSize: pageSize as number | undefined,
    nextCursor: value.nextCursor as string | null | undefined,
    facets: value.facets as Record<string, unknown> | undefined,
    summary,
    resolvedQuery: resolvedQuery ?? undefined,
  };
}

function readPhiTableSummaryValues(value: unknown) {
  return isPhiRecord(value) && Object.values(value).every((entry) =>
    entry === null || typeof entry === "string" || typeof entry === "boolean" ||
    typeof entry === "number" && Number.isFinite(entry))
    ? value as Record<string, PhiTableSummaryValue>
    : null;
}

export function readPhiTableProviderMutationResult(value: unknown): PhiTableProviderMutationResult | null {
  const allowedKeys = new Set([
    "status", "invalidation", "canonicalValue", "rowPatch", "summaryPatch", "value", "errorCode", "message",
  ]);
  const summaryPatch = value && isPhiRecord(value) && value.summaryPatch !== undefined
    ? readPhiTableSummaryValues(value.summaryPatch)
    : undefined;
  if (!isPhiRecord(value) ||
    Object.keys(value).some((key) => !allowedKeys.has(key)) ||
    (value.status !== "accepted" && value.status !== "rejected") ||
    (value.invalidation !== "none" && value.invalidation !== "view" && value.invalidation !== "resource") ||
    (value.rowPatch !== undefined && !isPhiRecord(value.rowPatch)) ||
    summaryPatch === null ||
    (value.value !== undefined && value.value !== null && !isPhiRecord(value.value)) ||
    (value.errorCode !== undefined && typeof value.errorCode !== "string") ||
    (value.message !== undefined && typeof value.message !== "string") ||
    (value.status === "rejected" && (
      typeof value.errorCode !== "string" || !value.errorCode.trim() ||
      value.canonicalValue !== undefined || value.rowPatch !== undefined || value.summaryPatch !== undefined || value.value !== undefined
    )) ||
    (value.status === "accepted" && value.errorCode !== undefined)) {
    return null;
  }
  return {
    status: value.status,
    invalidation: value.invalidation,
    canonicalValue: value.canonicalValue,
    rowPatch: value.rowPatch as Record<string, unknown> | undefined,
    summaryPatch: summaryPatch ?? undefined,
    value: value.value as Record<string, unknown> | null | undefined,
    errorCode: value.errorCode as string | undefined,
    message: value.message as string | undefined,
  };
}

/**
 * Whether a Provider action may be asked for as stated: declared by the resource, with the row or the
 * selection its scope needs, and a value of the type it declares. The one check every Widget that runs a
 * Provider action makes before the Provider Client is called -- the Table's Binding and the record
 * Widget alike -- answered as the error the Widget shows, or null.
 */
export function checkPhiTableProviderActionRequest(
  resource: Pick<PhiTableProviderResourceDescriptor, "resourceKey" | "actions"> | null | undefined,
  request: Pick<PhiTableProviderActionMutationRequest, "actionKey" | "rowIdentity" | "selectedRowIdentities" | "actionValue">,
): PhiTableProviderError | null {
  const action = resource?.actions?.find((candidate) => candidate.key === request.actionKey);
  if (!action) {
    return new PhiTableProviderError(
      "action-not-declared",
      `Table action "${request.actionKey}" is not declared by resource "${resource?.resourceKey ?? "unknown"}".`,
    );
  }
  const hasRow = request.rowIdentity != null;
  const hasSelection = (request.selectedRowIdentities?.length ?? 0) > 0;
  if ((action.scope === "row" && !hasRow) || (action.scope === "selection" && !hasSelection)) {
    return new PhiTableProviderError(
      "action-scope-invalid",
      `Table action "${request.actionKey}" requires ${action.scope} identity context.`,
    );
  }
  const value = request.actionValue;
  const valueValid = action.valueType === undefined || action.valueType === "none"
    ? value === undefined || value === null
    : action.valueType === "string"
      ? typeof value === "string"
      : action.valueType === "number"
        ? typeof value === "number" && Number.isFinite(value)
        : action.valueType === "boolean"
          ? typeof value === "boolean"
          : action.valueType === "string[]"
            ? Array.isArray(value) && value.every((entry) => typeof entry === "string")
            : action.valueType === "number[]"
              ? Array.isArray(value) && value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
              : isPhiRecord(value);
  return valueValid
    ? null
    : new PhiTableProviderError(
        "action-value-invalid",
        `Table action "${request.actionKey}" received an incompatible value.`,
      );
}

/**
 * The choices a row offers for a field that declares `rowOptionsPath`, or null when the row offers none.
 * A generic reader: an entry without a string value and a string label is dropped, not repaired.
 */
export function readPhiTableRowOptions(
  row: Readonly<Record<string, unknown>> | null | undefined,
  field: Pick<PhiTableProviderFieldDefinition, "rowOptionsPath">,
): readonly PhiControlOption<string>[] | null {
  if (!row || !field.rowOptionsPath) return null;
  const value = readPhiDotPath(row, field.rowOptionsPath);
  if (!Array.isArray(value)) return null;
  return value.flatMap((entry): PhiControlOption<string>[] => {
    if (!isPhiRecord(entry)) return [];
    const record = entry as Record<string, unknown>;
    return typeof record.value === "string" && typeof record.label === "string"
      ? [{
          value: record.value,
          label: record.label,
          ...(typeof record.description === "string" ? { description: record.description } : {}),
          ...(record.disabled === true ? { disabled: true } : {}),
        }]
      : [];
  });
}

/**
 * Validates a proposed value. Pass the row for a field that declares `rowOptionsPath`: a row that offers
 * options accepts only one of them, which is what keeps a Select limited to its choices on write.
 */
export function validatePhiTableProviderFieldValue(
  field: PhiTableProviderFieldDefinition,
  value: unknown,
  row?: Readonly<Record<string, unknown>> | null,
): string | null {
  if (value == null) return field.required ? `Table field "${field.key}" is required.` : null;
  if (field.type === "string" || field.type === "color" || field.type === "icon") {
    if (typeof value !== "string") return `Table field "${field.key}" requires a string value.`;
    const rowOptions = readPhiTableRowOptions(row, field);
    if (rowOptions && !rowOptions.some((option) => option.value === value && option.disabled !== true)) {
      return `Table field "${field.key}" contains a value this row does not offer.`;
    }
    return null;
  }
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return `Table field "${field.key}" requires a finite number.`;
    if (typeof field.constraints?.min === "number" && value < field.constraints.min) {
      return `Table field "${field.key}" is below its minimum.`;
    }
    if (typeof field.constraints?.max === "number" && value > field.constraints.max) {
      return `Table field "${field.key}" is above its maximum.`;
    }
    if (field.constraints?.precision !== undefined) {
      const decimals = String(value).split(".")[1]?.length ?? 0;
      if (decimals > field.constraints.precision) return `Table field "${field.key}" exceeds its precision.`;
    }
    return null;
  }
  if (field.type === "boolean") {
    return typeof value === "boolean" ? null : `Table field "${field.key}" requires a boolean value.`;
  }
  if (field.type === "date") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `Table field "${field.key}" requires a YYYY-MM-DD value.`;
    }
    if (typeof field.constraints?.min === "string" && value < field.constraints.min) {
      return `Table field "${field.key}" is before its minimum date.`;
    }
    if (typeof field.constraints?.max === "string" && value > field.constraints.max) {
      return `Table field "${field.key}" is after its maximum date.`;
    }
    return null;
  }
  if (field.type === "datetime") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))) {
      return `Table field "${field.key}" requires an ISO timestamp with an explicit offset.`;
    }
    if (typeof field.constraints?.min === "string" && Date.parse(value) < Date.parse(field.constraints.min)) {
      return `Table field "${field.key}" is before its minimum timestamp.`;
    }
    if (typeof field.constraints?.max === "string" && Date.parse(value) > Date.parse(field.constraints.max)) {
      return `Table field "${field.key}" is after its maximum timestamp.`;
    }
    return null;
  }
  if (field.type === "enum" || field.type === "enum[]") {
    const values = field.type === "enum[]" ? value : [value];
    if (!Array.isArray(values) || values.some((entry) => typeof entry !== "string" && typeof entry !== "number")) {
      return `Table field "${field.key}" has an invalid option value.`;
    }
    if (field.type === "enum[]" && new Set(values.map((entry) => `${typeof entry}:${String(entry)}`)).size !== values.length) {
      return `Table field "${field.key}" contains duplicate option values.`;
    }
    if (field.options) {
      const allowed = new Set(field.options.map((option) => `${typeof option.value}:${String(option.value)}`));
      if (values.some((entry) => !allowed.has(`${typeof entry}:${String(entry)}`))) {
        return `Table field "${field.key}" contains an undeclared option value.`;
      }
    }
    return null;
  }
  try {
    return JSON.stringify(value) === undefined
      ? `Table field "${field.key}" requires a serializable JSON value.`
      : null;
  } catch {
    return `Table field "${field.key}" requires a serializable JSON value.`;
  }
}

export function readPhiTableProviderError(error: unknown) {
  return error instanceof PhiTableProviderError
    ? error
    : new PhiTableProviderError(
        "provider-failed",
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? { cause: error } : undefined,
      );
}
