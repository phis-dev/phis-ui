"use client";

import type { CSSProperties } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { PhiIcon } from "../shell/phi-icon";

export function PhiExpandIndicator({
  expanded,
  animationFromExpanded,
  onAnimationEnd,
}: {
  expanded: boolean;
  animationFromExpanded?: boolean;
  onAnimationEnd?: () => void;
}) {
  const { token } = usePhiConfig();
  const animated = animationFromExpanded !== undefined;

  return (
    /*
     * The turn and its animation sit on a wrapper rather than on the icon: the icon is fetched where it
     * is drawn, and the animation must not restart when the placeholder gives way to it.
     */
    <span
      className={animated ? "phi-expand-indicator--animated" : undefined}
      style={{
        "--phi-expand-indicator-from": animationFromExpanded ? "90deg" : "0deg",
        "--phi-expand-indicator-to": expanded ? "90deg" : "0deg",
        "--phi-expand-indicator-duration": token.motionDurationMid,
        "--phi-expand-indicator-easing": token.motionEaseInOut,
        display: "inline-flex",
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: `transform ${token.motionDurationMid} ${token.motionEaseInOut}`,
      } as CSSProperties}
      onAnimationEnd={onAnimationEnd}
    >
      <PhiIcon name="right" size="inherit" />
    </span>
  );
}
