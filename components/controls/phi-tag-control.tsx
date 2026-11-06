"use client";

import type { CSSProperties, ReactNode } from "react";
import { Tag } from "antd";
import { PHI_THEME_GRADIENT_CSS_VARS, type PhiThemeGradientKey } from "../../theme/phi-theme-gradients";

export type PhiTagControlProps = {
  children: ReactNode;
  color?: string;
  /** A Theme gradient slot to fill the tag with; it then draws solid, in the slot's text colour. */
  gradient?: PhiThemeGradientKey;
  variant?: "filled" | "outlined" | "solid";
  /**
   * Offers the remove affordance Ant Design draws inside the capsule.
   *
   * `closable` rather than Ant Design's `closeIcon`, because what a caller decides here is whether the
   * tag can be removed at all and not which glyph says so. A caller that wants its own glyph has not
   * appeared; when one does, this is the prop that grows an overload rather than the callers that reach
   * past the Control.
   */
  closable?: boolean;
  /**
   * What removal means, which is never "hide the tag".
   *
   * Ant Design hides a closed tag by itself unless the event is prevented, which is the wrong answer
   * wherever the list of tags is drawn from a value: the value would still hold the entry and the next
   * render would bring the tag back. So the default is prevented here and the tag disappears because
   * the caller removed the thing, not because the tag was clicked.
   */
  onClose?: () => void;
  style?: CSSProperties;
};

export function PhiTagControl({
  children,
  color,
  gradient,
  variant = "outlined",
  closable,
  onClose,
  style,
}: PhiTagControlProps) {
  const gradientVars = gradient ? PHI_THEME_GRADIENT_CSS_VARS[gradient] : null;
  return (
    <Tag
      color={gradientVars ? undefined : color}
      variant={gradientVars ? "solid" : variant}
      closeIcon={closable || undefined}
      onClose={onClose ? (event) => {
        event.preventDefault();
        onClose();
      } : undefined}
      style={{
        marginInlineEnd: 0,
        ...(gradientVars
          ? { background: `var(${gradientVars.paint})`, color: `var(${gradientVars.text})`, borderColor: "transparent" }
          : {}),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
