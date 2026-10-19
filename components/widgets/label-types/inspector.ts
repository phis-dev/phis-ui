export type PhiInspectorWidgetLabels = {
  region: string;
  layout: string;
  surface: string;
  widget: string;
  sections: {
    settings: string;
    geometry: string;
    anchor: string;
    viewport: string;
    padding: string;
    background: string;
    border: string;
    shadow: string;
    surface: string;
    signals: string;
    visibility: string;
  };
  /** Which Pages a Shell Region stands on, and how `header_top` comes into view. */
  regionVisibility: PhiInspectorRegionVisibilityLabels;
  /** The style switch of a Surface: no look, a named look, or values of the author's own. */
  surfaceStyle: {
    title: string;
    none: string;
    card: string;
    wash: string;
    custom: string;
  };
  /** The mode a Surface draws its content in (`tone`). */
  tone: {
    title: string;
    inherit: string;
    light: string;
    dark: string;
    inverse: string;
  };
  /**
   * A Grid's columns -- how many slots a row holds at each width, and where one slot stands -- and a
   * Masonry's, which has columns but no rows.
   */
  grid: {
    columns: string;
    masonryColumns: string;
    distribution: string;
    slot: string;
    profiles: { compact: string; medium: string; wide: string };
  };
  /**
   * What the Inspector's field controls say of their own, beside the words a plugin gives its fields:
   * an empty list, an add button, a placeholder nobody declared. A plugin's own texts are translated
   * with its catalog (`plugin-meta-labels.server.ts`); these belong to the Inspector and sit here.
   */
  fields: PhiInspectorFieldLabels;
};

export type PhiInspectorRegionVisibilityLabels = {
  pages: string;
  all: string;
  root: string;
  include: string;
  exclude: string;
  entries: string;
  entriesPlaceholder: string;
  landing: string;
  reveal: string;
  always: string;
  hover: string;
  scrollUp: string;
  pageOwned: string;
};

export type PhiInspectorLinkTargetLabels = {
  none: string;
  page: string;
  external: string;
  pagePlaceholder: string;
  landingPage: string;
  externalPlaceholder: string;
  newTab: string;
};

export type PhiInspectorFieldLabels = {
  typeOrSelect: string;
  noMatchingOptions: string;
  noItems: string;
  addItem: string;
  remove: string;
  edit: string;
  width: string;
  height: string;
  staticOptions: string;
  staticEntries: string;
  selectDataProvider: string;
  selectTreeResource: string;
  selectCollectionResource: string;
  selectTableResource: string;
  selectCalendar: string;
  selectVideoProvider: string;
  linkTarget: PhiInspectorLinkTargetLabels;
};

export const PHI_INSPECTOR_WIDGET_DEFAULT_LABELS: PhiInspectorWidgetLabels = {
  region: "Region",
  layout: "Layout",
  surface: "Surface",
  widget: "Widget",
  sections: {
    settings: "Settings",
    geometry: "Geometry",
    anchor: "Anchor",
    viewport: "Viewport",
    padding: "Paddings",
    background: "Background",
    border: "Border",
    shadow: "Shadow",
    surface: "Surface",
    signals: "Signals",
    visibility: "Visibility",
  },
  regionVisibility: {
    pages: "Stands on",
    all: "Every page",
    root: "The Area's start page",
    include: "Only these pages",
    exclude: "Every page but these",
    entries: "Pages",
    entriesPlaceholder: "Choose Pages or folders",
    landing: "(Landing page)",
    reveal: "Comes into view",
    always: "Always",
    hover: "At the top edge",
    scrollUp: "When scrolling up",
    pageOwned: "This Region belongs to its Page and stands on that Page alone.",
  },
  surfaceStyle: {
    title: "Style",
    none: "None",
    card: "Card",
    wash: "Wash",
    custom: "Custom",
  },
  tone: {
    title: "Mode",
    inherit: "Page",
    light: "Light",
    dark: "Dark",
    inverse: "Inverse",
  },
  grid: {
    columns: "Slots per row",
    masonryColumns: "Columns",
    distribution: "Distribution",
    slot: "Slot",
    profiles: { compact: "Narrow", medium: "Medium", wide: "Wide" },
  },
  fields: {
    typeOrSelect: "Type or select value",
    noMatchingOptions: "No matching options",
    noItems: "No items",
    addItem: "Add item",
    remove: "Remove",
    edit: "Edit",
    width: "Width",
    height: "Height",
    staticOptions: "Static options",
    staticEntries: "Static entries",
    selectDataProvider: "Select a data provider",
    selectTreeResource: "Select a Tree resource",
    selectCollectionResource: "Select a Collection resource",
    selectTableResource: "Select a Table resource",
    selectCalendar: "Select a calendar",
    selectVideoProvider: "Select a video provider",
    linkTarget: {
      none: "None",
      page: "Page",
      external: "Address",
      pagePlaceholder: "Select Page",
      landingPage: "(Landing page)",
      /* Not a word: the start of an address, the same in every language. */
      externalPlaceholder: "https://",
      newTab: "Open in a new tab",
    },
  },
};
