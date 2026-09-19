"use client";

import { Tooltip } from "antd";

import { PhiIcon } from "../shell/phi-icon";
import { usePhiConfig } from "../root/phi-config-provider";
import type { PhiControlOption } from "./phi-control-options";
import { PhiDescriptionHint } from "./phi-description-tooltip-icon";

/**
 * One option, drawn the same way wherever options are drawn.
 *
 * `presentation` says where the option sits, not how it should look: `dropdown` is a row in an open list,
 * `option` is an option standing on its own next to its siblings -- a checkbox, a radio -- and `selection`
 * is the chosen one shown inside a closed Control.
 *
 * **Where the description hangs follows from that, and only from that.** In a list a person scans,
 * pointing at a row is already the cursor, and a hint that fires on every row passed over is noise, so
 * the description gets a deliberate target of its own. A standing option is pointed at on purpose, so the
 * option itself carries it: the larger target, and the one a finger can hit. The chosen option carries
 * nothing, because the hover target there belongs to the Control, not to the option. Two of these were
 * written out a second time in the checkbox and radio groups, close enough to look identical and far
 * enough apart to drift -- an option's icon rendered there, its preview swatch did not.
 */
export function PhiControlOptionContent<TValue extends string | number>({
  option,
  presentation,
}: {
  option: PhiControlOption<TValue>;
  presentation: "dropdown" | "selection" | "option";
}) {
  const { token } = usePhiConfig();
  const standing = presentation === "option";
  const content = (
    <span
      style={{
        display: standing ? "inline-flex" : "flex",
        alignItems: "center",
        gap: standing ? token.paddingXXS : token.paddingXS,
        ...(presentation === "dropdown" ? { height: "100%", lineHeight: 1 } : {}),
        minWidth: 0,
        maxWidth: "100%",
        ...(standing ? {} : { overflow: "hidden", whiteSpace: "nowrap" }),
      }}
    >
      {presentation === "dropdown" && option.description ? (
        <PhiDescriptionHint description={option.description} />
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
      <span
        style={{
          minWidth: 0,
          ...(standing ? {} : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
          ...(option.preview?.kind === "font" ? { fontFamily: option.preview.fontFamily } : {}),
        }}
      >
        {option.label}
      </span>
    </span>
  );

  return standing && option.description
    ? <Tooltip title={option.description}>{content}</Tooltip>
    : content;
}
