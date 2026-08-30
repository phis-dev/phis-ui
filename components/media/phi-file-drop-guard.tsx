"use client";

import { useEffect } from "react";

const PHI_MEDIA_DROPZONE_SELECTOR = '[data-phi-media-dropzone="true"]';

function isFileDragEvent(event: DragEvent) {
  const types = event.dataTransfer?.types;
  if (!types) {
    return false;
  }

  return Array.from(types).includes("Files");
}

function isWithinAllowedDropzone(event: DragEvent) {
  const target = event.target;
  if (!(target instanceof Node)) {
    return false;
  }

  if (target instanceof Element && target.closest(PHI_MEDIA_DROPZONE_SELECTOR)) {
    return true;
  }

  const path = event.composedPath();
  return path.some(
    (entry) => entry instanceof Element && entry.closest(PHI_MEDIA_DROPZONE_SELECTOR),
  );
}

export function PhiFileDropGuard() {
  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      if (!isFileDragEvent(event)) {
        return;
      }

      if (isWithinAllowedDropzone(event)) {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
    };

    const handleDrop = (event: DragEvent) => {
      if (!isFileDragEvent(event)) {
        return;
      }

      if (!isWithinAllowedDropzone(event)) {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "none";
        }
      }
    };

    window.addEventListener("dragover", handleDragOver, { capture: true });
    window.addEventListener("drop", handleDrop, { capture: true });

    return () => {
      window.removeEventListener("dragover", handleDragOver, { capture: true } as AddEventListenerOptions);
      window.removeEventListener("drop", handleDrop, { capture: true } as AddEventListenerOptions);
    };
  }, []);

  return null;
}
