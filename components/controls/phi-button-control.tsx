"use client";

import { lazy, Suspense, type ReactNode, type Ref } from "react";
import { Badge, Button } from "antd";
import type { ButtonProps } from "antd";

import type { PhiControlSize } from "../../types/control";
import { PhiLink } from "../navigation/phi-link";
import type { PhiButtonType } from "./phi-button-types";

/*
 * Ant Design's Tooltip, loaded for the buttons that carry one.
 *
 * Its module brings the Form library along: the tooltip isolates Form context through
 * `antd/es/form/context`, which imports `@rc-component/form`, a package that declares no side-effect
 * freedom -- so the whole Form library and its validator came with every page that drew a button, the
 * Landing among them, for a hover text most buttons do not have. Until it has loaded, the button stands
 * without its tooltip.
 */
const PhiButtonTooltip = lazy(() => import("antd/es/tooltip"));

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
  /**
   * Whether the destination is outside this Site, stated rather than guessed.
   *
   * Absent leaves the answer to the same string test every other link falls back to. A caller that
   * knows says so, and a caller that stores a structured target always knows: its target carries the
   * kind, and reading it off a regex would put the decision back in a place that cannot see the
   * difference between a Page and an address that merely starts the same way.
   */
  external?: boolean;
  tooltip?: ReactNode;
  icon?: ReactNode;
  type?: PhiButtonType;
  /** A round button is what an icon on its own wants, over a picture or in a toolbar. */
  shape?: ButtonProps["shape"];
  danger?: boolean;
  /**
   * Draws the button transparent with a coloured outline, for a surface the Theme's own fills fight.
   *
   * A hero over an image, a coloured band: there a filled button states a second background nobody
   * asked for. This is Ant Design's own flag rather than a `PhiButtonType` of its own, because it is
   * not a kind of button -- it is any kind of button, drawn for a background it does not own.
   */
  ghost?: boolean;
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
  external,
  tooltip,
  icon,
  type = "default",
  shape,
  danger,
  ghost,
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
  const inert = disabled || (!onClick && !href && htmlType !== "submit");
  const button = (
    <Button
      ref={ref}
      className={className}
      aria-label={ariaLabel}
      type={type}
      shape={shape}
      danger={danger}
      ghost={ghost}
      disabled={inert}
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
   * Through `PhiLink`, which is where this house decides between a client navigation and a plain
   * anchor -- and where `target="_blank"` and `rel` are one decision rather than two props that can
   * disagree. This control used to reach for `next/link` itself, so an external address went through
   * the client router and never received the `rel` that a new tab needs.
   *
   * Never prefetched. A button-shaped link is a deliberate action rather than somewhere the visitor is
   * already heading, so speculating on it buys nothing -- and on a refusal page, where this is what the
   * home link is made of, it buys a request for the Area root that the visitor never asked for. An Area
   * root that forwards turns that into two.
   *
   * The colour is the Button's. A link states one, and here the Button beneath it already has.
   */
  const linked = href && !disabled ? (
    <PhiLink
      href={href}
      {...(external === undefined ? {} : { external })}
      newTab={newTab}
      prefetch={false}
      style={{ display: "inline-flex", color: "inherit" }}
    >
      {button}
    </PhiLink>
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

  if (!visibleTooltip) return badged;
  /*
   * A disabled button emits no pointer events, so the tooltip the primitive hangs on it never opens --
   * and a disabled button is exactly when the hover text matters most, because it is the only place the
   * reason it is off can be read. The wrapper is what catches the pointer instead, and it exists only
   * for that: an enabled button keeps the plain shape it always had.
   */
  const target = inert
    ? <span style={{ display: "inline-flex", cursor: "not-allowed" }}>{badged}</span>
    : badged;
  return (
    <Suspense fallback={target}>
      <PhiButtonTooltip title={visibleTooltip}>{target}</PhiButtonTooltip>
    </Suspense>
  );
}
