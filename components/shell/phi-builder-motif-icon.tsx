"use client";

import { PhiBuilderIcon } from "./phi-builder-icon";
import { PhiWidgetIcon } from "./phi-widget-icon";

export function PhiBuilderMotifIcon({
  namespace,
  motif,
  size,
}: {
  namespace: string;
  motif: string;
  size?: number | string;
}) {
  if (namespace.endsWith("/widgets")) {
    return <PhiWidgetIcon family={motif} size={size} />;
  }

  if (!namespace.endsWith("/layouts")) {
    return null;
  }

  switch (motif) {
    case "content":
    case "vertical":
    case "flex":
    case "stack":
    case "grid":
    case "masonry":
    case "split-card":
    case "three-column":
    case "threecol":
    case "structure-region":
      return <PhiBuilderIcon motif={motif} size={size} />;
    default:
      return null;
  }
}
