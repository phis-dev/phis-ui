"use client";

import { lazy, Suspense, type ReactNode } from "react";

import type { PhiFeedbackLevel } from "../../types/control";

/*
 * Ant Design's Alert, loaded where an alert is actually shown. The render diagnostic reaches every page
 * through the CMS renderer and the forms and auth widgets hold one for their error state, but an alert is
 * drawn only when something went wrong -- so a static import paid for it on every page that never shows one.
 */
const PhiLazyAlert = lazy(() => import("antd/es/alert"));

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
  /*
   * Rendered on the Server it is complete. Raised in the browser, the alert appears once its chunk is
   * there.
   */
  return (
    <Suspense fallback={null}>
      <PhiLazyAlert
        type={level}
        title={title}
        description={description}
        variant={variant}
        showIcon={showIcon}
        closable={dismissible ? { onClose: onDismiss } : false}
      />
    </Suspense>
  );
}
