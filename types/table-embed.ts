import type { PhiViewerAccessPolicy } from "./access";
import type { PhiProviderResourceSource } from "./runtime-data-provider";
import type { PhiTableQueryValue, PhiTableSortingConfig, PhiTableWidgetPresentation } from "./table-widget";

/**
 * A Table a Module offers to Markdown (TABLES.md, "Tables in Markdown").
 *
 * Markdown names it in a paragraph of its own -- `![Caption](phis:table/<key>?<param>=<value>)` -- and sets
 * nothing but the caption and the parameters declared here. Everything else is the Module's: the Provider
 * resource, the columns, the order, the filters that make it the table it is. It is drawn by the Table
 * Widget's own path, read-only.
 *
 * Types only, so that what declares or names one carries none of the code that reads it
 * (`helpers/table-embed.ts`; the Markdown Widget's `table-embeds.server.ts`).
 */
export type PhiEmbeddableTableDescriptor = {
  /** `<package>[/modules/<module>]/table-embeds/<name>`, under the declaring Module's own id or package. */
  key: PhiTableEmbedKey;
  /** What the Table is, for an author; not drawn. The caption is what a reader sees above it. */
  title: string;
  /** A `table` Provider this Module declares, and one of its resources; `params` are fixed binding values. */
  source: PhiProviderResourceSource;
  /** The Table Widget's own presentation; its words are the Module's, translated as a Preset's. */
  presentation: PhiTableWidgetPresentation;
  sorting?: PhiTableSortingConfig;
  /** Filters the Module pins, as the Table Widget's `fixedFilters`. */
  fixedFilters?: Readonly<Record<string, PhiTableQueryValue>>;
  /** The parameters Markdown may set, by the name it writes them under. */
  params?: Readonly<Record<string, PhiTableEmbedParam>>;
  /** The rows drawn at most: one page of this size, no pager. Absent, the Table pages as it does. */
  maxRows?: number;
  /** Who may see it, owned like a node's `accessPolicy`; the Table Widget's own policy applies as well. */
  accessPolicy?: PhiViewerAccessPolicy;
};

export type PhiTableEmbedKey = `${string}/table-embeds/${string}`;

/**
 * What one parameter sets: a binding field the resource declares (`bindingFields`), or a filter it can be
 * asked by (`query.filterFields`), held like a `fixedFilters` entry. Nothing else is settable.
 */
export type PhiTableEmbedParam = { readonly binding: string } | { readonly filter: string };

/** An embed as Markdown wrote it: the key, and the parameters in order, as text. */
export type PhiTableEmbedReference = {
  embedKey: string;
  params: readonly (readonly [name: string, value: string])[];
};

