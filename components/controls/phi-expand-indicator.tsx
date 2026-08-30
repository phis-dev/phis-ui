"use client";

import { RightOutlined } from "@ant-design/icons";
import type { CSSProperties } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import styles from "./phi-expand-indicator.module.css";

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
    <RightOutlined
      className={animated ? styles.animated : undefined}
      style={{
        "--phi-expand-indicator-from": animationFromExpanded ? "90deg" : "0deg",
        "--phi-expand-indicator-to": expanded ? "90deg" : "0deg",
        "--phi-expand-indicator-duration": token.motionDurationMid,
        "--phi-expand-indicator-easing": token.motionEaseInOut,
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: `transform ${token.motionDurationMid} ${token.motionEaseInOut}`,
      } as CSSProperties}
      onAnimationEnd={onAnimationEnd}
    />
  );
}
