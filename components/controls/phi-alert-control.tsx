"use client";

import type { ReactNode } from "react";
import { Alert } from "antd";

import type { PhiFeedbackLevel } from "../../types/control";

export type PhiAlertControlProps = {
  level: PhiFeedbackLevel;
  title: ReactNode;
  description?: ReactNode;
  variant?: "outlined" | "filled";
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
};

export function PhiAlertControl({
  level,
  title,
  description,
  variant = "outlined",
  showIcon,
  dismissible,
  onDismiss,
}: PhiAlertControlProps) {
  return (
    <Alert
      type={level}
      title={title}
      description={description}
      variant={variant}
      showIcon={showIcon}
      closable={dismissible ? { onClose: onDismiss } : false}
    />
  );
}
