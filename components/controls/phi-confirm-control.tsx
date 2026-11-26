"use client";

import { useRef, useState, type ReactNode } from "react";
import { Popconfirm } from "antd";

import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import { PHI_LAYOUT } from "../../theme/phi-tokens";
import type { PhiControlSize } from "../../types/control";
import type { PhiButtonType } from "./phi-button-types";
import { PhiButtonControl } from "./phi-button-control";
import { PhiCompactGroupControl } from "./phi-compact-group-control";
import { PhiFlexControl } from "./phi-flex-control";
import { PHI_POPUP_PLACEMENTS } from "./phi-picker-control-contract";

export const PHI_CONFIRM_PLACEMENTS = PHI_POPUP_PLACEMENTS;

export type PhiConfirmPlacement = (typeof PHI_CONFIRM_PLACEMENTS)[number];

export type PhiConfirmControlProps = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  disabled?: boolean;
  placement?: PhiConfirmPlacement;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  /**
   * The button that opens the confirmation, drawn by this Control.
   *
   * A consumer used to hand in an Ant Design Button with no `onClick`, because the confirmation is what
   * reacts to the press. `PhiButtonControl` renders such a button disabled -- a button that calls
   * nothing is not a control -- so the trigger belongs here, where the thing it opens is known.
   */
  trigger?: PhiConfirmControlTrigger;
  /** Any element that opens the confirmation, for a trigger that is not a plain button. */
  children?: ReactNode;
};

export type PhiConfirmControlTrigger = {
  label: ReactNode;
  ariaLabel?: string;
  icon?: ReactNode;
  type?: PhiButtonType;
  danger?: boolean;
  size?: PhiControlSize;
};

/*
 * How wide a confirmation gets: a confirmation's measure (`contentMaxNarrow`), and never more than the
 * window less its inset on both sides.
 *
 * Ant Design gives a Popconfirm no width of its own, so its text ran on as one line until the window
 * stopped it -- a sentence of a few words drew a box across the whole page, and placed beside its trigger
 * that box reached past the window's edge. A file name, a key or an address has no space to break at, so
 * the text may also break inside a word.
 */
const PHI_CONFIRM_CONTAINER_STYLE = {
  maxWidth: `min(${PHI_LAYOUT.contentMaxNarrow}px, calc(100vw - 2 * ${PHI_SPACE.base}))`,
  overflowWrap: "anywhere",
} as const;

/*
 * Ant Design's own pair stands apart, a gap between Cancel and the answer; this house draws a decision's
 * two ends as one compact group, as a Dialog's footer does (`PhiDialogControl`). Ant Design has no slot
 * for its buttons, so they are switched off and the group stands under the description instead.
 */
const PHI_CONFIRM_HIDDEN_BUTTON_PROPS = { style: { display: "none" } } as const;
const PHI_CONFIRM_BODY_STYLE = { marginBottom: "calc(-1 * var(--phi-margin-xs))" } as const;

export function PhiConfirmControl({
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger,
  disabled,
  placement,
  onConfirm,
  onCancel,
  trigger,
  children,
}: PhiConfirmControlProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  const cancel = () => {
    setOpen(false);
    onCancel?.();
  };
  /*
   * The answer may take a while: the button shows it working and takes no second press. A confirmation
   * whose `onConfirm` throws stays open, because the question was not answered -- what to say about the
   * failure is the caller's, as it was when Ant Design ran it.
   */
  const accept = () => {
    if (confirming) return;
    setConfirming(true);
    void (async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch {
        // Left open; the caller reports the failure.
      } finally {
        setConfirming(false);
      }
    })();
  };

  return (
    <Popconfirm
      open={open}
      onOpenChange={(next) => {
        if (!disabled) setOpen(next);
      }}
      // The answer has the focus once the question is up: Enter gives it, Escape takes the question back.
      afterOpenChange={(next) => {
        if (next) confirmButtonRef.current?.focus();
      }}
      title={title}
      description={(
        <PhiFlexControl
          vertical
          gap="small"
          // Ant Design keeps the gap under its message that its own buttons stood in; the group closes it.
          style={PHI_CONFIRM_BODY_STYLE}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            cancel();
          }}
        >
          {description}
          <PhiFlexControl justify="end">
            <PhiCompactGroupControl size="small">
              <PhiButtonControl label={cancelLabel ?? "Cancel"} disabled={confirming} onClick={cancel} />
              <PhiButtonControl
                ref={confirmButtonRef}
                label={confirmLabel ?? "OK"}
                type="primary"
                danger={danger}
                loading={confirming}
                onClick={accept}
              />
            </PhiCompactGroupControl>
          </PhiFlexControl>
        </PhiFlexControl>
      )}
      showCancel={false}
      okButtonProps={PHI_CONFIRM_HIDDEN_BUTTON_PROPS}
      styles={{ container: PHI_CONFIRM_CONTAINER_STYLE }}
      disabled={disabled}
      placement={placement}
    >
      {trigger ? (
        <PhiButtonControl
          label={trigger.label}
          ariaLabel={trigger.ariaLabel}
          icon={trigger.icon}
          type={trigger.type}
          danger={trigger.danger}
          size={trigger.size}
          disabled={disabled}
          // The confirmation reacts to the press; this only keeps the button a live one.
          onClick={() => undefined}
        />
      ) : children}
    </Popconfirm>
  );
}
