import type {
  PhiTableFilterDefinition,
  PhiTableQuery,
  PhiTableQueryValue,
} from "../../../../../types/table-widget";

function holdsValue(value: PhiTableQueryValue | undefined) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Whether what the reader can change narrows the rows: a search text, or one of the Table's own filters
 * (`features.filters`) holding a value in the query. Only then does the generic empty hint ("adjust the
 * filters") have anything to point at.
 *
 * A filter holds a value when the query carries one for its key -- for a date range, for either of its
 * two keys -- that is not blank: an empty text, an empty list and a cleared choice are never sent, so they
 * narrow nothing. A `defaultValue` counts like a chosen value: it narrows the query just the same and the
 * reader can clear it, so the hint is true of it. A boolean `false` counts, since the query is narrowed
 * to it; a switch that was never touched and has no default carries nothing.
 *
 * What the reader cannot change does not count: a key the Page pins through `fixedFilters`, and a filter
 * key the query carries that is none of the Table's own filters -- one a Controller or another Widget
 * sets by signal, such as the key a list below a selection is narrowed to.
 */
export function isTableQueryNarrowedByReader(
  filters: readonly PhiTableFilterDefinition[] | undefined,
  query: PhiTableQuery,
  fixedFilters?: Readonly<Record<string, PhiTableQueryValue>>,
) {
  if (holdsValue(query.search)) return true;
  const readerKey = (key: string) => !Object.prototype.hasOwnProperty.call(fixedFilters ?? {}, key) &&
    holdsValue(query.filters?.[key]);
  return (filters ?? []).some((filter) => filter.type === "dateRange"
    ? readerKey(filter.startKey) || readerKey(filter.endKey)
    : readerKey(filter.key));
}
