"use client";

import { useRef, useState } from "react";

import { PhiFileDropControl } from "../controls/phi-file-drop-control";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiTypographyControl } from "../controls/phi-typography-control";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiIcon } from "../shell/phi-icon";
import { PhiFileDropGuard } from "./phi-file-drop-guard";

export type PhiUploadDropAreaProps = {
  /** What the file dialog offers. The upload's own acceptance check is what refuses. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** The bold line of the area (`PhiAreaUploadWidgetLabels.dropTitle`). */
  title: string;
  /** The quiet line under it (`PhiAreaUploadWidgetLabels.dropHint`). */
  hint: string;
  /** Once per file chosen or dropped. */
  onFile: (file: File) => void;
};

/**
 * The area files are dropped on or clicked, as every Media upload surface draws it: the Media folder's
 * upload Widget and an Add-on's slot upload.
 *
 * Shared rather than copied because what it holds is easy to get half right: the highlight while a file
 * is dragged over it, the `data-phi-media-dropzone` mark that `PhiFileDropGuard` lets a drop through
 * for, and that guard itself, which stops a drop beside the area from opening the file in the tab. It
 * transports nothing; the caller hands every file to `usePhiMediaUpload`.
 */
export function PhiUploadDropArea({ accept, multiple, disabled, title, hint, onFile }: PhiUploadDropAreaProps) {
  const { token } = usePhiConfig();
  const dragDepth = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

  return (
    <>
      <PhiFileDropGuard />
      <div
        data-phi-media-dropzone="true"
        onDragEnter={() => {
          dragDepth.current += 1;
          setIsDragActive(true);
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) {
            setIsDragActive(false);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragActive(true);
        }}
        onDrop={() => {
          dragDepth.current = 0;
          setIsDragActive(false);
        }}
        style={{ width: "100%" }}
      >
        <PhiFileDropControl
          dropZone
          {...(multiple === undefined ? {} : { multiple })}
          {...(accept === undefined ? {} : { accept })}
          {...(disabled === undefined ? {} : { disabled })}
          onFile={onFile}
          style={{
            padding: 0,
            width: "100%",
            borderColor: isDragActive ? token.colorPrimary : undefined,
            background: isDragActive ? token.colorFillQuaternary : undefined,
          }}
        >
          <PhiFlexControl
            vertical
            align="center"
            gap={4}
            style={{
              width: "100%",
              minHeight: token.controlHeight * 4,
              justifyContent: "center",
              cursor: isDragActive ? "copy" : "default",
            }}
          >
            <PhiIcon name="upload" size="inherit" style={{ fontSize: token.fontSizeHeading3, color: token.colorTextSecondary }} />
            <PhiTypographyControl strong>{title}</PhiTypographyControl>
            <PhiTypographyControl type="secondary">{hint}</PhiTypographyControl>
          </PhiFlexControl>
        </PhiFileDropControl>
      </div>
    </>
  );
}
