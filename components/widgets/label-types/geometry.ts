export type PhiGeometryWidgetLabels = {
  title: string;
  description: string;
  sections: {
    position: string;
    size: string;
    constraints: string;
    stacking: string;
  };
  fields: {
    sticky: string;
    offsetTop: string;
    size: string;
    minSize: string;
    maxSize: string;
    zIndex: string;
    viewport: string;
  };
  viewport: {
    compact: string;
    medium: string;
    wide: string;
  };
  placeholders: {
    auto: string;
  };
};

export const PHI_GEOMETRY_WIDGET_DEFAULT_LABELS: PhiGeometryWidgetLabels = {
  title: "Geometry",
  description: "Configure sticky position, offsets, size, constraints, and stacking.",
  sections: {
    position: "Position",
    size: "Size",
    constraints: "Constraints",
    stacking: "Stacking",
  },
  fields: {
    sticky: "Sticky",
    offsetTop: "Offset top",
    size: "Size",
    minSize: "Min size",
    maxSize: "Max size",
    zIndex: "z-index",
    viewport: "Viewport",
  },
  viewport: {
    compact: "Compact",
    medium: "Medium",
    wide: "Wide",
  },
  placeholders: {
    auto: "Auto",
  },
};
