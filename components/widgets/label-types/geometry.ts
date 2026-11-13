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
    offsetBottom: string;
    size: string;
    minSize: string;
    maxSize: string;
    zIndex: string;
    viewport: string;
    profile: string;
  };
  /** The rooms a size may name a value for, narrow first (design/RESPONSIVE_BLOCK_GEOMETRY.md). */
  profiles: {
    compact: string;
    medium: string;
    wide: string;
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
    offsetBottom: "Offset bottom",
    size: "Size",
    minSize: "Min size",
    maxSize: "Max size",
    zIndex: "z-index",
    viewport: "Viewport",
    profile: "Room",
  },
  profiles: {
    compact: "< 377",
    medium: "≥ 377",
    wide: "≥ 610",
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
