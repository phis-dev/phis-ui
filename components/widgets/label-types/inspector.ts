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
    layoutFields: string;
    signals: string;
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
    padding: "Padding",
    background: "Background",
    border: "Border",
    shadow: "Shadow",
    layoutFields: "Layout settings",
    signals: "Signals",
  },
};
