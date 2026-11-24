"use client";

import { useState } from "react";

import { PhiDialogControl } from "./phi-dialog-control";
import { PhiTypographyControl } from "./phi-typography-control";
import { PhiIcon } from "../shell/phi-icon";
import { PHI_REVEAL_ONCE_DIALOG_DEFAULT_LABELS, type PhiRevealOnceDialogLabels } from "./phi-reveal-once-dialog-labels";

/** Writes the value to the clipboard: true where it was written, false where the browser refused. */
export async function copyPhiRevealedValue(
  value: string,
  clipboard: Pick<Clipboard, "writeText"> | undefined = typeof navigator === "undefined" ? undefined : navigator.clipboard,
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export type PhiRevealOnceDialogControlProps = {
  /** The value shown once -- a new key's activation code. Null closes the Dialog. */
  value: string | null;
  title: string;
  /** What the reader is told about it: that it is shown only now. */
  description?: string;
  labels?: Partial<PhiRevealOnceDialogLabels>;
  /** Called when the Dialog closes, copied or not; the caller forgets the value then. */
  onClose: () => void;
};

/**
 * A value shown once, in a Dialog that copies it and closes: the answer of an act whose result is not kept
 * anywhere it could be read again -- an activation code stored as its hash. The value stands in a code
 * box the reader can select; "Copy and close" writes it to the clipboard and closes, and where the browser
 * refuses, the Dialog stays open and says so. Nothing here keeps the value: the caller holds it until
 * `onClose` and drops it then.
 */
export function PhiRevealOnceDialogControl({
  value,
  title,
  description,
  labels,
  onClose,
}: PhiRevealOnceDialogControlProps) {
  const words = { ...PHI_REVEAL_ONCE_DIALOG_DEFAULT_LABELS, ...labels };
  const [failed, setFailed] = useState(false);
  const close = () => {
    setFailed(false);
    onClose();
  };
  const copyAndClose = async () => {
    if (value == null) return;
    if (await copyPhiRevealedValue(value)) close();
    else setFailed(true);
  };

  return (
    <PhiDialogControl
      open={value != null}
      title={title}
      alert={failed ? { level: "warning", showIcon: true, title: words.copyFailed } : null}
      actions={[
        { key: "close", label: words.close, onClick: close },
        {
          key: "copy",
          label: words.copyAndClose,
          type: "primary",
          icon: <PhiIcon name="copy" size="inherit" />,
          onClick: () => void copyAndClose(),
        },
      ]}
      onDismiss={close}
    >
      {description ? <PhiTypographyControl type="secondary">{description}</PhiTypographyControl> : null}
      <PhiTypographyControl code style={{ fontSize: "1.25em", userSelect: "all", wordBreak: "break-all" }}>
        {value ?? ""}
      </PhiTypographyControl>
    </PhiDialogControl>
  );
}
