"use client";

import type { ReactNode, Ref } from "react";
import Link from "next/link";
import { Badge, Button, Tooltip } from "antd";
import type { ButtonProps } from "antd";

import type { PhiControlSize } from "../../types/control";
import type { PhiButtonType } from "./phi-button-types";

export type PhiControlBadgePresentation = {
  enabled?: boolean;
  value?: string | number | null;
  color?: string;
  overflowCount?: number;
  showZero?: boolean;
};

export type PhiButtonControlProps = {
  label?: ReactNode;
  ariaLabel?: string;
  /**
   * Renders the button as a link rather than a command.
   *
   * A Button without `onClick` is disabled on purpose -- a control that emits nothing is not a control
   * -- but a link emits nothing and still does something, so `href` lifts that rule for itself. The
   * anchor is a real one: it works before hydration and survives a page that mounts no Controller,
   * which is exactly the case a refusal page is.
   */
  href?: string;
  /**
   * Opens `href` in a new tab, and only ever together with `rel="noreferrer"`.
   *
   * A flag rather than `target` and `rel` of its own: the two are one decision, and a new tab without
   * `noreferrer` hands the opened page a handle back to this one. Making them separate props would make
   * that mistake the easy one.
   */
  newTab?: boolean;
  tooltip?: ReactNode;
  icon?: ReactNode;
  type?: PhiButtonType;
  /** A round button is what an icon on its own wants, over a picture or in a toolbar. */
  shape?: ButtonProps["shape"];
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  htmlType?: ButtonProps["htmlType"];
  block?: boolean;
  size?: PhiControlSize;
  style?: ButtonProps["style"];
  badge?: PhiControlBadgePresentation;
  /**
   * A styling hook, for a surface that places the button with its own stylesheet.
   *
   * Authoring chrome is the case: its affordances are sized and positioned by the scaffold stylesheets,
   * which find them by class. A class carries no behaviour, so it stays inside what a Control may accept.
   */
  className?: string;
  /**
   * The button element itself, for something that has to measure or register it -- a drop target, the
   * scaffold a preview is taken from. Never a way to reach the element's own handlers.
   */
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
  onClick?: () => void;
};

export function PhiButtonControl({
  label,
  ariaLabel,
  href,
  newTab,
  tooltip,
  icon,
  type = "default",
  shape,
  danger,
  disabled,
  loading,
  htmlType,
  block,
  size,
  style,
  badge,
  className,
  ref,
  onClick,
}: PhiButtonControlProps) {
  const visibleTooltip = typeof label === "string" && typeof tooltip === "string" && label === tooltip
    ? null
    : tooltip;
  const button = (
    <Button
      ref={ref}
      className={className}
      aria-label={ariaLabel}
      type={type}
      shape={shape}
      danger={danger}
      disabled={disabled || (!onClick && !href && htmlType !== "submit")}
      loading={loading}
      htmlType={htmlType}
      block={block}
      size={size}
      style={style}
      icon={icon}
      onClick={onClick}
    >
      {label}
    </Button>
  );
  /*
   * Never prefetched. A button-shaped link is a deliberate action rather than somewhere the visitor is
   * already heading, so speculating on it buys nothing -- and on a refusal page, where this is what the
   * home link is made of, it buys a request for the Area root that the visitor never asked for. An Area
   * root that forwards turns that into two.
   */
  const linked = href && !disabled ? (
    <Link
      href={href}
      prefetch={false}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
    >
      {button}
    </Link>
  ) : button;
  const badged = badge?.enabled ? (
    <Badge
      color={badge.color}
      count={badge.value ?? 0}
      overflowCount={badge.overflowCount}
      showZero={badge.showZero}
      size="small"
    >
      {linked}
    </Badge>
  ) : linked;

  return visibleTooltip ? <Tooltip title={visibleTooltip}>{badged}</Tooltip> : badged;
}
