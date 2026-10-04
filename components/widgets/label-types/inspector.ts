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
};
