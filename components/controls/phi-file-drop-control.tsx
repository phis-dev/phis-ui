"use client";

import type { CSSProperties, ReactNode } from "react";
import { Upload } from "antd";

/**
 * Choosing files, and nothing else.
 *
 * Named for what it does rather than for the primitive behind it, because it does not upload. Ant
 * Design's `Upload` can transport a file, and in this package it never has: every site either returned
 * from `beforeUpload` before the transport began or overrode `customRequest` entirely, because the
 * transport is a Provider-issued upload plan (`runPhiMediaUploadSession`, `usePhiMediaUpload`) that
 * knows about Spaces, quotas and storage profiles. What was left of the primitive is a file dialog and
 * a drop target, and that is exactly what this offers.
 *
 * So this is the one Control with a deliberately **smaller** surface than its primitive. `fileList`,
 * `showUploadList`, `beforeUpload`, `customRequest`, `action`, `onChange` and `LIST_IGNORE` are not
 * passed through and not reachable: each of them is a way to ask Ant Design to hold state about a
 * transfer it is not performing.
 *
 * **`LIST_IGNORE`, not `false`.** The two are not the same, and the three sites this replaced did not
 * agree: `false` stops the upload but leaves the file in an internal list, where `LIST_IGNORE` also
 * keeps it out. Since the list is never rendered, a growing one is invisible state that nobody clears
 * -- so the Control settles it once, the strict way.
 */
export type PhiFileDropControlProps = {
  /** What the file dialog offers, as a MIME or extension list. The server is what actually refuses. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /**
   * A framed area that also takes a drop, rather than a trigger somebody clicks.
   *
   * One prop instead of two components, because which of the two a surface wants is a presentation
   * decision and not a different contract: both answer with files.
   */
  dropZone?: boolean;
  /** Once per file chosen or dropped. Several files arrive as several calls. */
  onFile: (file: File) => void;
  /** The trigger, or the inside of the drop area. */
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export function PhiFileDropControl({
  accept,
  multiple,
  disabled,
  dropZone,
  onFile,
  children,
  style,
  className,
}: PhiFileDropControlProps) {
  const Surface = dropZone ? Upload.Dragger : Upload;
  return (
    <Surface
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      showUploadList={false}
      beforeUpload={(file) => {
        onFile(file as unknown as File);
        return Upload.LIST_IGNORE;
      }}
      style={style}
      className={className}
    >
      {children}
    </Surface>
  );
}
