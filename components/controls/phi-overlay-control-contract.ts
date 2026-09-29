import type { CSSProperties, ReactNode } from "react";

import {
  PHI_CONTAINER_BREAKPOINT_COL3,
  PHI_CONTAINER_BREAKPOINT_CONTENT,
} from "../../theme/phi-container-breakpoints";
import type { PhiCmsMountPolicy } from "../../types/cms-mount-policy";
import type {
  PhiCmsOverlayMaskConfig,
  PhiCmsOverlaySize,
  PhiOverlayCloseSource,
} from "../../types/cms-overlay";
import {
  resolvePhiResponsiveValue,
  type PhiResolvedResponsiveValue,
  type PhiResponsiveValue,
} from "../../types/responsive";

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
  mountPolicy?: PhiCmsMountPolicy;
  containerStyle?: CSSProperties;
  onDismiss?: (source: PhiOverlayCloseSource) => void;
  afterOpenChange?: (open: boolean) => void;
};

export const PHI_OVERLAY_DEFAULT_MASK = {
  appearance: "normal",
  allowOutsideInteraction: false,
  closable: true,
} as const satisfies PhiCmsOverlayMaskConfig;

/**
 * How the mask is drawn and whether it stands between the pointer and the page behind the Overlay.
 *
 * The capture rule is the one OVERLAYS.md states: `!allowOutsideInteraction || closable`. A closable
 * outside action is intercepted even where outside interaction is allowed, so the click that closes the
 * Overlay does not also press whatever lies under it; nothing else couples the two settings.
 *
 * `capturesOutsidePointer` is handed out as well because the mask is not the only layer in the way. A
 * Modal stands in a wrapper that covers the viewport and takes the outside click itself, so a Modal that
 * lets the pointer through has to open that wrapper too -- the mask style alone left it a wall.
 */
export function resolvePhiOverlayMaskPresentation(mask: PhiCmsOverlayMaskConfig) {
  const capturesOutsidePointer = !mask.allowOutsideInteraction || mask.closable;
  return {
    capturesOutsidePointer,
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

export type PhiModalWidth = PhiCmsOverlaySize | PhiResponsiveValue<PhiCmsOverlaySize>;

export type PhiModalResponsiveMode = keyof PhiResolvedResponsiveValue<unknown>;

/**
 * Where a Modal's width switches from `compact` to `medium` and from `medium` to `wide`.
 *
 * The container scale, the same pair the Form switches at, and not Ant Design's device breakpoints
 * (768/992): a Modal's box is the viewport it floats in, and a width stated per mode means "this much
 * room is there", which is the question the container scale answers.
 */
export const PHI_MODAL_RESPONSIVE_MIN_WIDTH = {
  medium: PHI_CONTAINER_BREAKPOINT_COL3,
  wide: PHI_CONTAINER_BREAKPOINT_CONTENT,
} as const;

export function resolvePhiModalResponsiveMode(availableWidth: number): PhiModalResponsiveMode {
  if (availableWidth >= PHI_MODAL_RESPONSIVE_MIN_WIDTH.wide) return "wide";
  if (availableWidth >= PHI_MODAL_RESPONSIVE_MIN_WIDTH.medium) return "medium";
  return "compact";
}

/**
 * The one width a Modal takes at one mode.
 *
 * A responsive width cascades like every responsive value (`resolvePhiResponsiveValue`): an unset mode
 * takes the nearest smaller one that is set, and a mode below every stated one takes `fallback` -- the
 * width `controlSize` gives, or none, which leaves the Modal its own default.
 */
export function resolvePhiModalWidth(
  width: PhiModalWidth | undefined,
  fallback: PhiCmsOverlaySize | undefined,
  mode: PhiModalResponsiveMode,
): PhiCmsOverlaySize | undefined {
  if (width == null) return fallback;
  if (typeof width !== "object") return width;
  return resolvePhiResponsiveValue<PhiCmsOverlaySize | undefined>(width, {
    compact: fallback,
    medium: fallback,
    wide: fallback,
  })[mode];
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
