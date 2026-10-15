"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FloatButton } from "antd";

import { PhiIcon } from "../shell/phi-icon";
import type { PhiToolbarControlItem } from "./phi-toolbar-control";

export type PhiFloatButtonControlPlacement = "bottom-end" | "bottom-start" | "top-end" | "top-start";

export type PhiFloatButtonControlGroup = {
  /** How the group opens. Left out, it is always open: every button stands in the corner. */
  trigger?: "click" | "hover";
  /** The Phi icon of the button that opens it. */
  icon?: string;
  /** Which way the buttons unfold from that button; left out, away from the edge it sits at. */
  direction?: "top" | "bottom" | "left" | "right";
};

export type PhiFloatButtonControlProps = {
  /** The Toolbar's buttons, as the Toolbar takes them. One is a Float Button, more are its group. */
  items: readonly PhiToolbarControlItem[];
  placement?: PhiFloatButtonControlPlacement;
  /** The distance from the corner, as CSS lengths. Left out, Ant Design's own corner distance. */
  offset?: { block?: string; inline?: string };
  shape?: "circle" | "square";
  group?: PhiFloatButtonControlGroup;
  /**
   * Drawn where it stands rather than fixed to the viewport -- in the Builder's canvas, where a button
   * floating over the editor could neither be seen in its slot nor selected there.
   */
  inPlace?: boolean;
  disabled?: boolean;
  onActivate?: (key: string) => void;
};

const subscribeNever = () => () => {};

/**
 * Where a fixed button is drawn: on `document.body`, outside every box of the page.
 *
 * Fixed positioning places the button against the viewport, but the order it paints in is still its
 * ancestors'. A slot child and a Region shell each open a stacking context of their own, so a button
 * left inside its slot was painted under the Footer while the page scrolled and under the Header in the
 * top corners -- its z-index counted only among its slot's siblings. On the body it stacks with the
 * page's other overlays, as an Ant Design Modal does. The server draws nothing for it: there is no body
 * to portal into, and a fixed button needs none of the page's flow.
 */
function PhiFloatButtonPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}

/* Ant Design's own corner distance (`floatButtonInsetInlineEnd`, `floatButtonInsetBlockEnd`). */
const PHI_FLOAT_BUTTON_DEFAULT_INLINE = "24px";
const PHI_FLOAT_BUTTON_DEFAULT_BLOCK = "48px";

function resolveCornerStyle(
  placement: PhiFloatButtonControlPlacement,
  offset: PhiFloatButtonControlProps["offset"],
  inPlace: boolean,
): CSSProperties {
  if (inPlace) {
    return { position: "relative", inset: "auto" };
  }
  const block = offset?.block ?? PHI_FLOAT_BUTTON_DEFAULT_BLOCK;
  const inline = offset?.inline ?? PHI_FLOAT_BUTTON_DEFAULT_INLINE;
  const top = placement.startsWith("top");
  const start = placement.endsWith("start");
  /* Ant Design states `bottom` and `insetInlineEnd`; the two it does not state are cleared with them. */
  return {
    top: top ? block : "auto",
    bottom: top ? "auto" : block,
    insetInlineStart: start ? inline : "auto",
    insetInlineEnd: start ? "auto" : inline,
  };
}

/**
 * A button that stays in a corner of the viewport while the Page scrolls under it -- one, or a group.
 *
 * It takes the Toolbar's items so that the Widgets around both share one button: its icon, its badge,
 * whether it is read-only or hidden. A label shows on a square button only; a round one is its icon,
 * and the label becomes its tooltip and accessible name. Two things a Toolbar button has do not exist
 * on a Float Button and are not imitated: `danger`, and `loading`, which disables the button instead of
 * spinning.
 */
export function PhiFloatButtonControl({
  items,
  placement = "bottom-end",
  offset,
  shape = "circle",
  group,
  inPlace = false,
  disabled,
  onActivate,
}: PhiFloatButtonControlProps) {
  const visibleItems = items.filter((item) => item.visible !== false);
  if (visibleItems.length === 0) {
    return null;
  }
  const cornerStyle = resolveCornerStyle(placement, offset, inPlace);

  const buttons = visibleItems.map((item, index) => {
    const labelShown = shape === "square" && (item.showLabel ?? !item.icon);
    const inert = disabled || item.disabled || item.loading === true;
    return (
      <FloatButton
        key={item.key}
        aria-label={item.ariaLabel ?? (typeof item.label === "string" ? item.label : undefined)}
        icon={item.icon ?? undefined}
        content={labelShown ? item.label : undefined}
        tooltip={item.tooltip ?? (labelShown ? undefined : item.label)}
        type={item.type === "primary" ? "primary" : "default"}
        shape={shape}
        disabled={inert}
        badge={item.badge?.enabled
          ? {
              count: item.badge.value ?? 0,
              color: item.badge.color,
              overflowCount: item.badge.overflowCount,
              showZero: item.badge.showZero,
            }
          : undefined}
        /* A single button carries the corner itself; inside a group, the group does. */
        style={visibleItems.length === 1 && index === 0 ? cornerStyle : undefined}
        onClick={item.readOnly || !onActivate ? undefined : () => onActivate(item.key)}
      />
    );
  });

  const placed = buttons.length === 1 ? buttons[0] : (
    <FloatButton.Group
      trigger={group?.trigger}
      icon={group?.icon ? <PhiIcon name={group.icon} size="inherit" /> : undefined}
      placement={group?.direction ?? (placement.startsWith("top") ? "bottom" : "top")}
      shape={shape}
      style={cornerStyle}
    >
      {buttons}
    </FloatButton.Group>
  );

  /* In place it stays in its slot, where the Builder's canvas can show and select it. */
  return inPlace ? placed : <PhiFloatButtonPortal>{placed}</PhiFloatButtonPortal>;
}
