"use client";

import type { ReactNode } from "react";
import { Popconfirm } from "antd";

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
  children: ReactNode;
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
      {children}
    </Popconfirm>
  );
}
