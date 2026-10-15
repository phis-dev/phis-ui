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
  };
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
