import type { CSSProperties, ReactNode } from "react";

import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import type { PhiControlSize } from "../../types/control";
import type { PhiCmsMountPolicy } from "../../types/cms-mount-policy";
import type {
  PhiCmsOverlayConfig,
  PhiOverlayCloseSource,
  PhiOverlayMaskBehaviour,
} from "../../types/cms-overlay";
import type { PhiRenderableBlockSize } from "../../types/renderable-block";
import {
  resolvePhiRenderableBlockGeometry,
  type PhiResolvedBlockLength,
} from "../../types/renderable-block-geometry";

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
  mask?: PhiOverlayMaskBehaviour;
  mountPolicy?: PhiCmsMountPolicy;
  containerStyle?: CSSProperties;
  onDismiss?: (source: PhiOverlayCloseSource) => void;
  afterOpenChange?: (open: boolean) => void;
  /**
   * The element the Overlay is drawn as, handed out while it is mounted -- what a Tour points at when it
   * names the Overlay (design/TOURS.md, Visual-anchor registration). Never an Ant Design ref.
   */
  panelRef?: (element: HTMLElement | null) => void;
};

export const PHI_OVERLAY_DEFAULT_MASK = {
  appearance: "normal",
  allowOutsideInteraction: false,
  closable: true,
} as const satisfies PhiOverlayMaskBehaviour;

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
export function resolvePhiOverlayMaskPresentation(mask: PhiOverlayMaskBehaviour) {
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

/**
 * An Overlay's geometry as a Control takes it: the block's own three pairs (`PhiCmsOverlayConfig`), one
 * value per axis.
 */
export type PhiOverlayControlGeometryProps = {
  size?: PhiRenderableBlockSize | null;
  minSize?: PhiRenderableBlockSize | null;
  maxSize?: PhiRenderableBlockSize | null;
};

/** The width each `controlSize` step gives a Modal whose `size` names none. */
export const PHI_MODAL_WIDTH_BY_CONTROL_SIZE: Record<PhiControlSize, number> = {
  small: 520,
  medium: 720,
  large: 960,
};

/**
 * The room a Modal never leaves: one `base` step clear of the viewport on both inline sides, one `lg`
 * step on both block sides. Every stated length is held inside it, a minimum included, so a floor that
 * keeps a Form in two columns on a desk does not push the dialog off a phone.
 */
const PHI_MODAL_VIEWPORT_INLINE = `calc(100vw - ${PHI_SPACE.base} - ${PHI_SPACE.base})`;
const PHI_MODAL_VIEWPORT_BLOCK = `calc(100dvh - ${PHI_SPACE.lg} - ${PHI_SPACE.lg})`;

function withinViewport(length: PhiResolvedBlockLength | null, viewport: string) {
  return length == null ? undefined : `min(${length.css}, ${viewport})`;
}

/** What a Modal draws of its geometry, as CSS: the dialog's width and box, and its container's height. */
export type PhiModalGeometry = {
  /** Handed to the Modal as its width; undefined leaves it Ant Design's default. */
  width: string | undefined;
  minWidth: string | undefined;
  maxWidth: string;
  blockSize: string | undefined;
  minBlockSize: string | undefined;
  maxBlockSize: string;
};

/**
 * A Modal's geometry, read once through the block's resolver.
 *
 * The width is the one a Signal told (`toldSize`, the `size` input), else the stated `size`, else the
 * `controlSize` step; the height the told one, else the stated one, else none -- the Modal is as tall as
 * its content up to the viewport. A minimum and a maximum are the stated ones, each held inside the
 * viewport room, and with no maximum stated the viewport room is the maximum.
 */
export function resolvePhiModalGeometry({
  size,
  minSize,
  maxSize,
  toldSize,
  controlSize,
}: PhiOverlayControlGeometryProps & {
  toldSize?: PhiRenderableBlockSize | null;
  controlSize?: PhiControlSize;
}): PhiModalGeometry {
  const stated = resolvePhiRenderableBlockGeometry({ size, minSize, maxSize });
  const told = resolvePhiRenderableBlockGeometry({ size: toldSize });
  const width = told.inline.size?.css
    ?? stated.inline.size?.css
    ?? (controlSize == null ? undefined : `${PHI_MODAL_WIDTH_BY_CONTROL_SIZE[controlSize]}px`);
  return {
    width,
    minWidth: withinViewport(stated.inline.min, PHI_MODAL_VIEWPORT_INLINE),
    maxWidth: withinViewport(stated.inline.max, PHI_MODAL_VIEWPORT_INLINE) ?? PHI_MODAL_VIEWPORT_INLINE,
    blockSize: told.block.size?.css ?? stated.block.size?.css,
    minBlockSize: withinViewport(stated.block.min, PHI_MODAL_VIEWPORT_BLOCK),
    maxBlockSize: withinViewport(stated.block.max, PHI_MODAL_VIEWPORT_BLOCK) ?? PHI_MODAL_VIEWPORT_BLOCK,
  };
}

/** What a Drawer draws of its geometry: the length along the axis it opens on, and its bounds. */
export type PhiDrawerGeometry = {
  /**
   * Handed to the Drawer as its `size`, a pixel length as a number (the Drawer warns on a string that is
   * one); undefined leaves it Ant Design's default.
   */
  size: number | string | undefined;
  /** How far a resizable Drawer may be dragged, where the stated maximum is in pixels. */
  resizeMaxSize: number | undefined;
  /** The bounds on the panel (`min-width`/`max-width`, or the height pair at `top` and `bottom`). */
  style: CSSProperties;
};

/**
 * A Drawer's geometry, read once through the block's resolver.
 *
 * A Drawer opens along one axis: `width` at `left` and `right`, `height` at `top` and `bottom`. The other
 * axis is the viewport's, and what a config states for it is not drawn. The maximum reaches the panel as
 * CSS whatever its unit, and Ant Design's resize as a limit only where it is in pixels, the one unit a
 * drag counts in.
 */
export function resolvePhiDrawerGeometry({
  size,
  minSize,
  maxSize,
  placement,
}: PhiOverlayControlGeometryProps & { placement: PhiCmsOverlayConfig["placement"] }): PhiDrawerGeometry {
  const geometry = resolvePhiRenderableBlockGeometry({ size, minSize, maxSize });
  const horizontal = placement === "left" || placement === "right";
  const axis = horizontal ? geometry.inline : geometry.block;
  const min = axis.min?.css;
  const max = axis.max?.css;
  return {
    size: axis.size?.part?.unit === "px" ? axis.size.part.value : axis.size?.css,
    resizeMaxSize: axis.max?.part?.unit === "px" ? axis.max.part.value : undefined,
    style: horizontal
      ? { ...(min == null ? null : { minWidth: min }), ...(max == null ? null : { maxWidth: max }) }
      : { ...(min == null ? null : { minHeight: min }), ...(max == null ? null : { maxHeight: max }) },
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
