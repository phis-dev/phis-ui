export type PhiBuilderInsertPickerControlLabels = {
  pickLayout: string;
  pickWidget: string;
  layouts: string;
  widgets: string;
  /** The accessible name of the switch between Layouts and Widgets, which has no visible label. */
  section: string;
  searchLayouts: string;
  searchWidgets: string;
  filterPackages: string;
  /** The entry that stands for no package filter at all. */
  allPackages: string;
  filterCategories: string;
  noCompatibleItems: string;
};

export const PHI_BUILDER_INSERT_PICKER_CONTROL_DEFAULT_LABELS: PhiBuilderInsertPickerControlLabels = {
  pickLayout: "Pick layout",
  pickWidget: "Pick widget",
  layouts: "Layouts",
  widgets: "Widgets",
  section: "Insert a layout or a widget",
  searchLayouts: "Search layouts",
  searchWidgets: "Search widgets",
  filterPackages: "Filter packages",
  allPackages: "All packages",
  filterCategories: "Filter categories",
  noCompatibleItems: "No compatible items found.",
};
