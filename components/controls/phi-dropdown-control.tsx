"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { DownOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";

import styles from "./phi-dropdown-control.module.css";
import { toPhiAntdMenuItems, type PhiMenuControlItem } from "./phi-menu-control";

/**
 * Ant Design reopens a hover-and-click dropdown when the click that should close it lands on the
 * trigger: the click reopens what the outside-click already closed. Suppressing the close for this
 * window is the workaround, and it lives here so it exists exactly once.
 */
const PHI_TRIGGER_REOPEN_GUARD_MS = 250;


export type PhiDropdownControlProps = {
  items: readonly PhiMenuControlItem[];
  /**
   * The entry the surface is currently on. It stays in the list and renders selected; callers
   * disable it rather than filtering it out, so the trigger never names an absent entry.
   */
  selectedKeys?: readonly string[];
  /** Controlled open state; omit to let the Control own it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The trigger element. The Control attaches its press tracking to it. */
  children: ReactElement<{ onMouseDown?: (event: unknown) => void }>;
};

/**
 * The canonical dropdown menu presentation: this Control owns the Ant Design `Dropdown` primitive
 * and the trigger mechanics every Phi dropdown shares. Callers describe entries as
 * `PhiMenuControlItem`s — the same description the navigation menus use — and pass their own trigger
 * element. A menu that opens from a pill takes `PhiPillDropdownControl` below instead.
 *
 * With no entries the trigger renders alone: a dropdown that cannot open must not present itself as
 * one.
 */
export function PhiDropdownControl({
  items,
  selectedKeys,
  open,
  onOpenChange,
  children,
}: PhiDropdownControlProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerPressAtRef = useRef(0);
  const resolvedOpen = open ?? internalOpen;

  const handleTriggerPress = useCallback((event: unknown) => {
    triggerPressAtRef.current = Date.now();
    return event;
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (
      !nextOpen &&
      resolvedOpen &&
      Date.now() - triggerPressAtRef.current < PHI_TRIGGER_REOPEN_GUARD_MS
    ) {
      return;
    }

    if (open === undefined) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }, [open, onOpenChange, resolvedOpen]);

  if (items.length === 0) {
    return children;
  }

  // The press stamp is only ever written from the trigger's mousedown and only ever read from
  // onOpenChange, both event handlers. The rule cannot see that through cloneElement, which is the
  // one way to reach the caller's own trigger element without wrapping it in an extra DOM node --
  // and an extra node would break the popup positioning that measures the trigger.
  const trigger = isValidElement(children)
    // eslint-disable-next-line react-hooks/refs
    ? cloneElement(children, {
      onMouseDown: (event: unknown) => {
        handleTriggerPress(event);
        children.props.onMouseDown?.(event);
      },
    })
    : children;

  return (
    <Dropdown
      menu={{
        items: toPhiAntdMenuItems(items),
        ...(selectedKeys
          ? { selectable: true, selectedKeys: [...selectedKeys] }
          : {}),
      }}
      trigger={["hover", "click"]}
      open={resolvedOpen}
      onOpenChange={handleOpenChange}
    >
      {trigger}
    </Dropdown>
  );
}

export type PhiPillDropdownControlProps = Pick<
  PhiDropdownControlProps,
  "items" | "selectedKeys" | "open" | "onOpenChange"
> & {
  /** What the trigger names: the entry the surface is on, or the viewer. */
  label?: ReactNode;
  /** Stands before the label inside the same trigger, and lights the pill on hover: the account avatar. */
  leading?: ReactNode;
  /** `false` sets the label as plain text instead of a pill. */
  pill?: boolean;
  /** Shown only while the menu can open. */
  showChevron?: boolean;
  /** Hover, focus or press on the trigger -- the moment to fetch what the entries link to. */
  onIntent?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
  className?: string;
  style?: CSSProperties;
};

/**
 * The one trigger every pill dropdown uses -- the account, Area and locale menus: a bare button
 * holding the pill, so hover, border and chevron look the same wherever a menu opens from a pill.
 */
export function PhiPillDropdownControl({
  items,
  selectedKeys,
  open,
  onOpenChange,
  label,
  leading,
  pill = true,
  showChevron = true,
  onIntent,
  triggerRef,
  className,
  style,
}: PhiPillDropdownControlProps) {
  const canOpen = items.length > 0;
  const chevron = showChevron && canOpen ? <DownOutlined style={{ fontSize: 12 }} /> : null;
  const hasLabel = label != null && label !== false && label !== "";

  return (
    <PhiDropdownControl
      items={items}
      selectedKeys={selectedKeys}
      open={open}
      onOpenChange={onOpenChange}
    >
      <button
        ref={triggerRef}
        type="button"
        className={[styles.trigger, className].filter(Boolean).join(" ")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: "inherit",
          color: "inherit",
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: canOpen ? "pointer" : "default",
          ...style,
        }}
        aria-haspopup={canOpen ? "menu" : undefined}
        onMouseEnter={onIntent}
        onFocus={onIntent}
        onClick={onIntent}
      >
        {leading}
        {hasLabel && pill ? (
          <span className={styles.pillTrigger}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span>{label}</span>
              {chevron}
            </span>
          </span>
        ) : (
          <>
            {hasLabel ? <span>{label}</span> : null}
            {chevron}
          </>
        )}
      </button>
    </PhiDropdownControl>
  );
}
