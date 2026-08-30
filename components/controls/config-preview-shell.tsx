"use client";

import type { ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";

type ConfigPreviewShellProps = {
  expanded: boolean;
  children: ReactNode;
};

export function ConfigPreviewShell({
  expanded,
  children,
}: ConfigPreviewShellProps) {
  const { token } = usePhiConfig();
  return (
    <div
      aria-hidden={expanded ? undefined : "true"}
      style={{
        overflow: "hidden",
        maxHeight: expanded ? 160 : 0,
        opacity: expanded ? 1 : 0,
        transform: expanded ? "translateY(0)" : "translateY(-6px)",
        marginBottom: expanded ? token.paddingXS : 0,
        transition: [
          `max-height ${token.motionDurationMid} ease`,
          `opacity ${token.motionDurationMid} ease`,
          `transform ${token.motionDurationMid} ease`,
          `margin-bottom ${token.motionDurationMid} ease`,
        ].join(", "),
        pointerEvents: expanded ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}
