"use client";

import type { ReactNode } from "react";

import { PhiDialogControl } from "../controls/phi-dialog-control";
import { PhiTypographyControl } from "../controls/phi-typography-control";

/**
 * The password change an administrator asked for, in front of the Page and with no way past it.
 *
 * Nothing closes it: no button, no Escape, no click beside it. The server refuses the session everything
 * else until the password is set, so a Page behind it has nothing to offer, and the only way on is the
 * Form inside -- whose success asks the runtime for the Page again, which then no longer shows this.
 */
export function PhiPasswordChangeRequiredModal({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <PhiDialogControl
      open
      title={title}
      closable={false}
      keyboard={false}
      mask={{ appearance: "normal", allowOutsideInteraction: false, closable: false }}
      centered
      controlSize="small"
    >
      <PhiTypographyControl presentation="paragraph">{text}</PhiTypographyControl>
      {children}
    </PhiDialogControl>
  );
}
