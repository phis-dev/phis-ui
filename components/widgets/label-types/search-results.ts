export type PhiSearchResultsWidgetLabels = {
  /** `%1` is the query. */
  heading: string;
  /** `%1` is how many Pages matched in all. */
  count: string;
  countOne: string;
  /** `%1` is the query. */
  empty: string;
  /** `%1` is how many characters a query needs. */
  short: string;
  idle: string;
  unavailable: string;
  region: string;
};

export const PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS: PhiSearchResultsWidgetLabels = {
  heading: "Results for “%1”",
  count: "%1 pages",
  countOne: "1 page",
  empty: "Nothing found for “%1”.",
  short: "Type at least %1 characters.",
  idle: "Enter what you are looking for.",
  unavailable: "The search is not available just now.",
  region: "Search results",
};
