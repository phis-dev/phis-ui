"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode, TouchEvent } from "react";
import { Button } from "antd";
import { HolderOutlined } from "@ant-design/icons";

import type { PhiControlSize } from "../../types/control";

/**
 * The grip a node is dragged by.
 *
 * Not a button, though it is drawn like one. A button reports a press; a handle hands the pointer and
 * the keyboard to a drag library, which decides from them when a drag begins, and a plain click on it
 * does nothing at all. That is why the button Control cannot be it: taking a library's listeners is the
 * whole job here, and the one thing `PhiButtonControl` refuses on purpose.
 *
 * What it takes from the library is named, not passed through. The listeners are the four a sensor can
 * start a drag from, and anything else a library hands out is dropped rather than spread onto the
 * element; the attributes are the ones that describe a draggable to assistive technology.
 */

type PhiDragHandleListener<TEvent> = (event: TEvent) => void;

export type PhiDragHandleListeners = {
  onPointerDown?: PhiDragHandleListener<PointerEvent<HTMLElement>>;
  onMouseDown?: PhiDragHandleListener<MouseEvent<HTMLElement>>;
  onTouchStart?: PhiDragHandleListener<TouchEvent<HTMLElement>>;
  onKeyDown?: PhiDragHandleListener<KeyboardEvent<HTMLElement>>;
};

export type PhiDragHandleAttributes = {
  role?: string;
  tabIndex?: number;
  "aria-disabled"?: boolean;
  "aria-pressed"?: boolean;
  "aria-roledescription"?: string;
  "aria-describedby"?: string;
};

export type PhiDragHandleControlProps = {
  ariaLabel: string;
  /** Registers the handle's element with the drag library; compose it with a ref of your own first. */
  setActivatorRef: (element: HTMLElement | null) => void;
  /** The listeners a drag library hands out for its activator; only the four named ones are used. */
  listeners?: Partial<Record<string, unknown>> | PhiDragHandleListeners;
  /** The attributes a drag library hands out for its activator; only the named ones are used. */
  attributes?: Partial<Record<string, unknown>> | PhiDragHandleAttributes;
  /** Whether the node is on its way; the handle fades so the drop target reads as the focus. */
  dragging?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  size?: PhiControlSize;
  /** A styling hook for chrome that places its affordances by class. */
  className?: string;
  style?: CSSProperties;
};

const PHI_DRAG_HANDLE_LISTENER_KEYS = ["onPointerDown", "onMouseDown", "onTouchStart", "onKeyDown"] as const;
const PHI_DRAG_HANDLE_ATTRIBUTE_KEYS = [
  "role",
  "tabIndex",
  "aria-disabled",
  "aria-pressed",
  "aria-roledescription",
  "aria-describedby",
] as const;

function pick<TKey extends string>(source: Partial<Record<string, unknown>> | undefined, keys: readonly TKey[]) {
  const picked: Partial<Record<TKey, unknown>> = {};
  if (!source) return picked;
  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  return picked;
}

export function PhiDragHandleControl({
  ariaLabel,
  setActivatorRef,
  listeners: libraryListeners,
  attributes: libraryAttributes,
  dragging = false,
  disabled = false,
  icon,
  size = "small",
  className,
  style,
}: PhiDragHandleControlProps) {
  // Picked by name, then typed by name: the keys are the contract, whatever else the library returned.
  const listeners = (disabled
    ? {}
    : pick(libraryListeners as Partial<Record<string, unknown>> | undefined, PHI_DRAG_HANDLE_LISTENER_KEYS)
  ) as PhiDragHandleListeners;
  const attributes = pick(
    libraryAttributes as Partial<Record<string, unknown>> | undefined,
    PHI_DRAG_HANDLE_ATTRIBUTE_KEYS,
  ) as PhiDragHandleAttributes;

  return (
    <Button
      ref={setActivatorRef}
      className={className}
      aria-label={ariaLabel}
      icon={icon ?? <HolderOutlined />}
      type="text"
      size={size}
      disabled={disabled}
      {...attributes}
      {...listeners}
      /*
       * A click is the end of a drag that never started, and the handle sits on a node that selects on a
       * press; neither the click nor its default belongs to anything else.
       */
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{
        cursor: disabled ? undefined : dragging ? "grabbing" : "grab",
        opacity: dragging ? 0.45 : undefined,
        ...style,
      }}
    />
  );
}
