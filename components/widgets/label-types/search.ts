export type PhiSearchWidgetLabels = {
  title: string;
  placeholder: string;
  ariaLabel: string;
  clearLabel: string;
  submitLabel: string;
  /** The magnifier's way back: the phone's search row closes without searching. */
  closeLabel: string;
};

export const PHI_SEARCH_WIDGET_DEFAULT_LABELS: PhiSearchWidgetLabels = {
  title: "Search",
  placeholder: "Search",
  ariaLabel: "Search input",
  clearLabel: "Clear search",
  submitLabel: "Search",
  closeLabel: "Close search",
};
