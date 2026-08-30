import type { CSSProperties, ReactNode } from "react";

import type {
  PhiCmsOverlayMaskConfig,
  PhiCmsOverlayMountPolicy,
  PhiOverlayCloseSource,
} from "../../types/cms-overlay";

export type PhiOverlayControlDismissEvent = {
  target: EventTarget | null;
  key?: string;
};

export type PhiOverlayControlCommonProps = {
  open: boolean;
  title?: ReactNode;
  header?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  closable?: boolean;
  keyboard?: boolean;
  mask?: PhiCmsOverlayMaskConfig;
  mountPolicy?: PhiCmsOverlayMountPolicy;
  containerStyle?: CSSProperties;
  onDismiss?: (source: PhiOverlayCloseSource) => void;
  afterOpenChange?: (open: boolean) => void;
};

export const PHI_OVERLAY_DEFAULT_MASK = {
  appearance: "normal",
  allowOutsideInteraction: false,
  closable: true,
} as const satisfies PhiCmsOverlayMaskConfig;

export function resolvePhiOverlayMaskPresentation(mask: PhiCmsOverlayMaskConfig) {
  const capturesOutsidePointer = !mask.allowOutsideInteraction || mask.closable;
  return {
    adapterMask: {
      enabled: true,
      blur: mask.appearance === "blurred",
      closable: mask.closable,
    },
    maskStyle: {
      ...(mask.appearance === "transparent"
        ? { background: "transparent" }
        : null),
      ...(mask.appearance === "blurred"
        ? null
        : { backdropFilter: "none", WebkitBackdropFilter: "none" }),
      ...(capturesOutsidePointer ? {} : { pointerEvents: "none" as const }),
    },
  };
}

export function resolvePhiOverlayDismissSource(
  event: PhiOverlayControlDismissEvent,
): PhiOverlayCloseSource {
  if ("key" in event && event.key === "Escape") return "escape";
  const target = event.target;
  if (target instanceof Element && target.closest(".ant-modal-close, .ant-drawer-close")) {
    return "close-button";
  }
  return "mask";
}
