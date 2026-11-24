/** The words of `PhiRevealOnceDialogControl`, apart from it so a server Label Set can name them. */
export type PhiRevealOnceDialogLabels = {
  /** The primary button: copies the value and closes. */
  copyAndClose: string;
  /** Closes without copying. */
  close: string;
  /** Said where the browser refused the copy; the value stays on screen to be selected by hand. */
  copyFailed: string;
};

export const PHI_REVEAL_ONCE_DIALOG_DEFAULT_LABELS: PhiRevealOnceDialogLabels = {
  copyAndClose: "Copy and close",
  close: "Close",
  copyFailed: "The value could not be copied. Select it and copy it by hand before closing.",
};
