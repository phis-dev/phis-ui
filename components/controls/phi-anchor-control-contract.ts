import type { PhiRenderableBlockAnchor } from "../../types/renderable-block";

export type PhiAnchorWidgetPlacement =
  | "topLeft"
  | "top"
  | "topRight"
  | "left"
  | "center"
  | "right"
  | "bottomLeft"
  | "bottom"
  | "bottomRight";

export const PHI_ANCHOR_WIDGET_PLACEMENTS: PhiAnchorWidgetPlacement[] = [
  "topLeft",
  "top",
  "topRight",
  "left",
  "center",
  "right",
  "bottomLeft",
  "bottom",
  "bottomRight",
];

export function isPhiAnchorWidgetPlacement(value: unknown): value is PhiAnchorWidgetPlacement {
  return (PHI_ANCHOR_WIDGET_PLACEMENTS as readonly string[]).includes(value as string);
}

export function resolvePhiAnchorWidgetPlacement(
  anchor?: PhiRenderableBlockAnchor | null,
): PhiAnchorWidgetPlacement | null {
  const horizontal = anchor?.horizontal ?? "center";
  const vertical = anchor?.vertical ?? "middle";

  if (horizontal === "left") {
    return vertical === "top" ? "topLeft" : vertical === "bottom" ? "bottomLeft" : "left";
  }

  if (horizontal === "right") {
    return vertical === "top" ? "topRight" : vertical === "bottom" ? "bottomRight" : "right";
  }

  if (vertical === "top") {
    return "top";
  }

  if (vertical === "bottom") {
    return "bottom";
  }

  return "center";
}

export function resolvePhiRenderableBlockAnchor(
  anchor?: PhiAnchorWidgetPlacement | null,
): PhiRenderableBlockAnchor | undefined {
  if (anchor == null) {
    return undefined;
  }

  if (anchor === "topLeft") {
    return { horizontal: "left", vertical: "top" };
  }

  if (anchor === "top") {
    return { horizontal: "center", vertical: "top" };
  }

  if (anchor === "topRight") {
    return { horizontal: "right", vertical: "top" };
  }

  if (anchor === "left") {
    return { horizontal: "left", vertical: "middle" };
  }

  if (anchor === "center") {
    return { horizontal: "center", vertical: "middle" };
  }

  if (anchor === "right") {
    return { horizontal: "right", vertical: "middle" };
  }

  if (anchor === "bottomLeft") {
    return { horizontal: "left", vertical: "bottom" };
  }

  if (anchor === "bottom") {
    return { horizontal: "center", vertical: "bottom" };
  }

  return { horizontal: "right", vertical: "bottom" };
}

export type PhiAnchorWidgetLabels = {
  title: string;
  description: string;
  sections: {
    anchor: string;
  };
  positions: Record<PhiAnchorWidgetPlacement, string>;
};

export const PHI_ANCHOR_WIDGET_DEFAULT_LABELS: PhiAnchorWidgetLabels = {
  title: "Anchor",
  description: "Choose the anchor position in the 3x3 matrix.",
  sections: {
    anchor: "Anchor",
  },
  positions: {
    topLeft: "Top left",
    top: "Top",
    topRight: "Top right",
    left: "Left",
    center: "Center",
    right: "Right",
    bottomLeft: "Bottom left",
    bottom: "Bottom",
    bottomRight: "Bottom right",
  },
};
