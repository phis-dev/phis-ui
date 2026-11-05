import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

import { PHI_COLOR, PHI_FONT_SIZE, PHI_SPACE } from "../../theme/antd-css-var-contract";
import { PhiTruncatedHoverText } from "./phi-truncated-hover-text";

export type PhiRibbonControlProps = {
  children: ReactNode;
  /** The band's ground; absent, the Theme's primary. Its words are the light text on any ground. */
  color?: string;
  /**
   * Where the band stands: `corner` flush with the box's top and end edge, its top end corner the box's
   * own; `edge` a small padding down the end edge. Either way it floats: nothing in the box moves for it.
   */
  placement?: "corner" | "edge";
  style?: CSSProperties;
  /**
   * The band's whole words, shown on hover when its ellipsis cut them short (`PhiTruncatedHoverText`).
   * A band with a hover text takes the pointer, so it needs `onClick` to hand a click on to what lies
   * under it.
   */
  fullText?: string;
  /** What a click on the band does, for a band that takes the pointer: the box's own click, passed on. */
  onClick?: MouseEventHandler<HTMLSpanElement>;
};

/**
 * A band of words at the end edge of a box: "Popular", "New", "-20 %".
 *
 * Ant Design draws this as `Badge.Ribbon`, with a fold that hangs past the box's edge. Not that one: it
 * wraps the box in an element of its own, and its fold needs the box not to clip -- a card clips, so its
 * picture keeps its corners. This band stands inside the box and needs nothing from it but a position
 * to stand against. It is drawn on the server as well, without hooks.
 *
 * It floats and takes no room, so boxes side by side in a row start their content on one line whether
 * they carry a band or not. A band on a line of its own pushed its box's words down; squeezed into the
 * box's top inset it was too thin to read. In the corner it stands over the inset and a little into the
 * first line's end, which a long eyebrow in a narrow box can reach.
 *
 * It sits above what the box draws, the highlight's ring included. Without a hover text it takes no
 * clicks, so a card that is a link stays one under its band; with one it has to take the pointer to be
 * pointed at, and hands a click on through `onClick`.
 */
export function PhiRibbonControl({ children, color, placement = "edge", style, fullText, onClick }: PhiRibbonControlProps) {
  const radius = "var(--phi-control-radius-sm)";
  const position: CSSProperties = placement === "corner"
    ? {
        top: 0,
        paddingBlock: PHI_SPACE.xxs,
        // The top end corner is the box's own, which clips it; only the corner inside the box is rounded.
        borderEndStartRadius: radius,
      }
    : {
        top: PHI_SPACE.sm,
        paddingBlock: PHI_SPACE.xxs,
        borderStartStartRadius: radius,
        borderEndStartRadius: radius,
      };
  const band = (
    <span
      className="phi-ribbon-control"
      style={{
        position: "absolute",
        insetInlineEnd: 0,
        zIndex: 4,
        maxWidth: "70%",
        boxSizing: "border-box",
        paddingInline: PHI_SPACE.sm,
        background: color ?? PHI_COLOR.primary,
        color: PHI_COLOR.textLightSolid,
        fontSize: PHI_FONT_SIZE.sm,
        fontWeight: 600,
        lineHeight: 2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: fullText ? "auto" : "none",
        ...(fullText && onClick ? { cursor: "pointer" } : {}),
        ...position,
        ...style,
      }}
      {...(onClick ? { onClick } : {})}
    >
      {children}
    </span>
  );
  return fullText ? <PhiTruncatedHoverText title={fullText}>{band}</PhiTruncatedHoverText> : band;
}
