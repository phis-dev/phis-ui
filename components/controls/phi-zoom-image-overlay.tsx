"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { usePhiConfig } from "../root/phi-config-provider";

export type PhiZoomImageOverlayProps = {
  open: boolean;
  src: string;
  alt: string;
  title?: string;
  onClose: () => void;
};

const subscribeNever = () => () => {};

/** Ant Design's `zIndexPopupBase`, the layer its Modal stands on; the Phi token set does not carry it. */
const PHI_ZOOM_OVERLAY_Z_INDEX = 1000;

/**
 * A picture scaled to the viewport over the page, and nothing else: no toolbar, no zoom steps, no
 * rotation -- that is the lightbox's (`PhiLightboxImageControl`). A click anywhere closes it, as does
 * Escape, and the focus goes back to where it was.
 *
 * On `document.body`, at the layer a Modal stands on, for the reason `PhiFloatButtonPortal` gives: a
 * picture's slot and Region open stacking contexts of their own, and an overlay left inside them would be
 * painted under the Header. The server draws nothing; it opens only on a click.
 */
export function PhiZoomImageOverlay({ open, src, alt, title, onClose }: PhiZoomImageOverlayProps) {
  const { token } = usePhiConfig();
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlayRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt || title}
      tabIndex={-1}
      /*
       * The portal leaves the DOM, not the React tree: a click here would bubble on to the picture's box,
       * which opens it again. It stops at the overlay.
       */
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: PHI_ZOOM_OVERLAY_Z_INDEX,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: token.colorBgMask,
        cursor: "zoom-out",
        outline: "none",
      }}
    >
      <img
        alt={alt}
        src={src}
        title={title}
        style={{ display: "block", width: "100vw", height: "100dvh", objectFit: "contain" }}
      />
    </div>,
    document.body,
  );
}
