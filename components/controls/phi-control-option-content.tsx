"use client";

import { Tooltip } from "antd";

import { PhiIcon } from "../shell/phi-icon";
import { usePhiConfig } from "../root/phi-config-provider";
import type { PhiControlOption } from "./phi-control-options";
import { PHI_DESCRIPTION_TOOLTIP_ICON } from "./phi-description-tooltip-icon";

export function PhiControlOptionContent<TValue extends string | number>({
  option,
  presentation,
}: {
  option: PhiControlOption<TValue>;
  presentation: "dropdown" | "selection";
}) {
  const { token } = usePhiConfig();
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: token.paddingXS,
        ...(presentation === "dropdown" ? { height: "100%", lineHeight: 1 } : {}),
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      {presentation === "dropdown" && option.description ? (
        <Tooltip title={option.description}>
          <span
            role="img"
            aria-label="Option description"
            style={{ display: "inline-flex", alignItems: "center", flex: "none", color: token.colorTextTertiary }}
          >
            {PHI_DESCRIPTION_TOOLTIP_ICON}
          </span>
        </Tooltip>
      ) : null}
      {option.preview?.kind === "background" ? (
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 20,
            flex: "0 0 24px",
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadiusSM,
            opacity: option.disabled ? 0.45 : 1,
            backgroundColor: option.preview.backgroundColor,
            backgroundImage: option.preview.backgroundImage,
            backgroundSize: option.preview.backgroundSize,
            backgroundPosition: option.preview.backgroundPosition,
            backgroundRepeat: option.preview.backgroundRepeat,
          }}
        />
      ) : option.icon ? (
        <PhiIcon name={option.icon} size={14} />
      ) : null}
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {option.label}
      </span>
    </span>
  );
}
