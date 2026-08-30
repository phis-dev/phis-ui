export type PhiBorderWidgetLabels = {
  title: string;
  description: string;
  sections: {
    border: string;
    color: string;
    radius: string;
  };
  fields: {
    style: string;
    color: string;
    corners: string;
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  placeholders: {
    width: string;
    colorHex: string;
  };
  radiusSizes: {
    none: string;
    xxs: string;
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    round: string;
  };
  borderStyles: {
    none: string;
    solid: string;
    dashed: string;
    dotted: string;
    double: string;
  };
};

export const PHI_BORDER_WIDGET_DEFAULT_LABELS: PhiBorderWidgetLabels = {
  title: "Border",
  description: "Configure border width, style, color, and corner radius.",
  sections: {
    border: "Border",
    color: "Color",
    radius: "Corner radius",
  },
  fields: {
    style: "Style",
    color: "Color",
    corners: "Corners",
    topLeft: "Top left",
    topRight: "Top right",
    bottomLeft: "Bottom left",
    bottomRight: "Bottom right",
  },
  placeholders: {
    width: "Width",
    colorHex: "#f0f0f0",
  },
  radiusSizes: {
    none: "None",
    xxs: "XXS",
    xs: "XS",
    sm: "SM",
    base: "Base",
    md: "MD",
    lg: "LG",
    xl: "XL",
    xxl: "XXL",
    round: "Round",
  },
  borderStyles: {
    none: "None",
    solid: "Solid",
    dashed: "Dashed",
    dotted: "Dotted",
    double: "Double",
  },
};
