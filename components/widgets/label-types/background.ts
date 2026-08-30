export type PhiBackgroundWidgetLabels = {
  title: string;
  description: string;
  sections: {
    base: string;
    image: string;
    gradient: string;
    overlay: string;
    effect: string;
    motion: string;
  };
  base: {
    none: string;
    color: string;
    gradient: string;
    image: string;
  };
  image: {
    url: string;
    alt: string;
    position: string;
    size: string;
    repeat: string;
  };
  motion: {
    static: string;
    fixed: string;
    parallax: string;
    strength: string;
    direction: string;
    natural: string;
    reverse: string;
    travel: string;
    rate: string;
    range: string;
    usesOriginal: string;
  };
  gradient: {
    direction: string;
    stops: string;
    addStop: string;
    removeStop: string;
  };
  overlay: {
    none: string;
    pattern: string;
    noise: string;
    grain: string;
    opacity: string;
    direction: string;
    scale: string;
    patterns: {
      stripes: string;
      grid: string;
      dots: string;
      checker: string;
      crosshatch: string;
    };
    grains: {
      fine: string;
      medium: string;
      coarse: string;
    };
  };
  effect: {
    none: string;
    glass: string;
    blur: string;
    dim: string;
    tint: string;
  };
  direction: {
    up: string;
    right: string;
    down: string;
    left: string;
  };
  position: {
    center: string;
    top: string;
    bottom: string;
    left: string;
    right: string;
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  size: {
    cover: string;
    contain: string;
    auto: string;
  };
  repeat: {
    noRepeat: string;
    repeat: string;
    repeatX: string;
    repeatY: string;
  };
  common: {
    none: string;
    opacity: string;
    scale: string;
    direction: string;
  };
  placeholders: {
    colorHex: string;
    sourceUrl: string;
    sourceAlt: string;
  };
};

export const PHI_BACKGROUND_WIDGET_DEFAULT_LABELS: PhiBackgroundWidgetLabels = {
  title: "Background",
  description: "Configure background color, gradient, image, overlay, and effects.",
  sections: {
    base: "Base",
    image: "Image",
    gradient: "Gradient",
    overlay: "Overlay",
    effect: "Effect",
    motion: "Motion",
  },
  base: {
    none: "None",
    color: "Color",
    gradient: "Gradient",
    image: "Image",
  },
  image: {
    url: "Image URL",
    alt: "Image alt",
    position: "Position",
    size: "Size",
    repeat: "Repeat",
  },
  motion: {
    static: "Static",
    fixed: "Fixed",
    parallax: "Parallax",
    strength: "Strength",
    direction: "Direction",
    natural: "Natural",
    reverse: "Reverse",
    travel: "Travel",
    rate: "Constant",
    range: "Fitted",
    usesOriginal: "Motion uses the original image; the focal rect steers the crop.",
  },
  gradient: {
    direction: "Direction",
    stops: "Stops",
    addStop: "Add stop",
    removeStop: "Remove stop",
  },
  overlay: {
    none: "None",
    pattern: "Pattern",
    noise: "Noise",
    grain: "Grain",
    opacity: "Opacity",
    direction: "Direction",
    scale: "Scale",
    patterns: {
      stripes: "Stripes",
      grid: "Grid",
      dots: "Dots",
      checker: "Checker",
      crosshatch: "Crosshatch",
    },
    grains: {
      fine: "Fine",
      medium: "Medium",
      coarse: "Coarse",
    },
  },
  effect: {
    none: "None",
    glass: "Glass",
    blur: "Blur",
    dim: "Dim",
    tint: "Tint",
  },
  direction: {
    up: "Up",
    right: "Right",
    down: "Down",
    left: "Left",
  },
  position: {
    center: "Center",
    top: "Top",
    bottom: "Bottom",
    left: "Left",
    right: "Right",
    topLeft: "Top Left",
    topRight: "Top Right",
    bottomLeft: "Bottom Left",
    bottomRight: "Bottom Right",
  },
  size: {
    cover: "Cover",
    contain: "Contain",
    auto: "Auto",
  },
  repeat: {
    noRepeat: "No Repeat",
    repeat: "Repeat",
    repeatX: "Repeat X",
    repeatY: "Repeat Y",
  },
  common: {
    none: "None",
    opacity: "Opacity",
    scale: "Scale",
    direction: "Direction",
  },
  placeholders: {
    colorHex: "#f0f0f0",
    sourceUrl: "Source URL",
    sourceAlt: "Source alt",
  },
};
