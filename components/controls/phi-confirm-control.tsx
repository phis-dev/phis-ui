"use client";

import type { ReactNode } from "react";
import { Popconfirm } from "antd";

import type { PhiControlSize } from "../../types/control";
import type { PhiButtonType } from "./phi-button-types";
import { PhiButtonControl } from "./phi-button-control";

export const PHI_CONFIRM_PLACEMENTS = [
  "top",
  "topLeft",
  "topRight",
  "bottom",
  "bottomLeft",
  "bottomRight",
  "left",
  "leftTop",
  "leftBottom",
  "right",
  "rightTop",
  "rightBottom",
] as const;

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
  return (
    <Popconfirm
      title={title}
      description={description}
      okText={confirmLabel}
      cancelText={cancelLabel}
      okButtonProps={danger ? { danger: true } : undefined}
      disabled={disabled}
      placement={placement}
      onConfirm={onConfirm}
      onCancel={onCancel}
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
