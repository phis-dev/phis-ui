"use client";

import type { ReactNode } from "react";

import { PhiDialogControl } from "../controls/phi-dialog-control";
import { PhiTypographyControl } from "../controls/phi-typography-control";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";
import { usePhiSignalEmitter } from "./runtime-signal-identity";

/**
 * The password change an administrator asked for, in front of the Page and with no way past it.
 *
 * Nothing closes it: no button, no Escape, no click beside it. The server refuses the session everything
 * else until the password is set, so a Page behind it has nothing to offer. The way on is the Form
 * inside, or -- where no Module supplies one -- signing out and following the reset link, which is the
 * one action offered then. Signing out goes through the Core Runtime Controller, which every Site mounts
 * whatever Modules it installs.
 */
export function PhiPasswordChangeRequiredModal({
  title,
  text,
  signOutLabel,
  children,
}: {
  title: string;
  text: string;
  signOutLabel: string | null;
  children: ReactNode;
}) {
  const emitSignal = usePhiSignalEmitter(null);

  return (
    <PhiDialogControl
      open
      title={title}
      closable={false}
      keyboard={false}
      mask={{ appearance: "normal", allowOutsideInteraction: false, closable: false }}
      centered
      controlSize="small"
      actions={signOutLabel
        ? [{
            key: "sign-out",
            label: signOutLabel,
            type: "primary",
            onClick: () => emitSignal({
              scope: "site",
              channel: "session",
              action: "clear",
              value: null,
              valueType: "none",
              valueSchema: null,
              receiver: createPhiCoreRuntimeControllerAddress(),
            }),
          }]
        : []}
    >
      <PhiTypographyControl presentation="paragraph">{text}</PhiTypographyControl>
      {children}
    </PhiDialogControl>
  );
}
