"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Modal } from "antd";

import { PHI_CONTROL, PHI_SPACE } from "../../theme/antd-css-var-contract";
import type { PhiCmsOverlaySize } from "../../types/cms-overlay";
import type { PhiControlSize } from "../../types/control";
import type { PhiRenderableBlockSize } from "../../types/renderable-block";
import { resolvePhiMotionDurationMs } from "../../helpers/motion";
import { usePhiConfig } from "../root/phi-config-provider";
import {
  PHI_OVERLAY_DEFAULT_MASK,
  resolvePhiOverlayDismissSource,
  resolvePhiOverlayMaskPresentation,
  type PhiOverlayControlCommonProps,
} from "./phi-overlay-control-contract";

const subscribeHydration = () => () => undefined;

export type PhiModalControlProps = PhiOverlayControlCommonProps & {
  centered?: boolean;
  controlSize?: PhiControlSize;
  size?: PhiRenderableBlockSize | null;
  width?: PhiCmsOverlaySize | Partial<Record<"xs" | "md" | "lg", PhiCmsOverlaySize>>;
  rootClassName?: string;
};

const PHI_MODAL_WIDTH_BY_CONTROL_SIZE: Record<PhiControlSize, number> = {
  small: 520,
  medium: 720,
  large: 960,
};

const PHI_MODAL_HEADER_MIN_BLOCK_SIZE =
  `calc(${PHI_CONTROL.md} + ${PHI_SPACE.xs} + ${PHI_SPACE.xs})`;

export function PhiModalControl({
  open,
  title,
  header,
  body,
  footer,
  closable = true,
  keyboard = true,
  mask = PHI_OVERLAY_DEFAULT_MASK,
  mountPolicy = "on-open",
  centered = false,
  controlSize,
  size,
  width,
  rootClassName,
  containerStyle,
  onDismiss,
  afterOpenChange,
}: PhiModalControlProps) {
  const { token } = usePhiConfig();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const bodyMeasureRef = useRef<HTMLDivElement | null>(null);
  const bodyContentRef = useRef<HTMLDivElement | null>(null);
  const resizeAnimationRef = useRef<Animation | null>(null);
  useEffect(() => {
    const bodyMeasure = bodyMeasureRef.current;
    const bodyContent = bodyContentRef.current;
    if (!open || !bodyMeasure || !bodyContent || size?.height != null || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    let targetBlockSize = bodyContent.getBoundingClientRect().height;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = resolvePhiMotionDurationMs(token.motionDurationMid);
    const animateResize = (from: number, to: number) => {
      if (reducedMotion || duration <= 0 || typeof bodyMeasure.animate !== "function") return;
      const animation = bodyMeasure.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration, easing: token.motionEaseInOut },
      );
      resizeAnimationRef.current = animation;
      animation.addEventListener("finish", () => {
        if (resizeAnimationRef.current !== animation) return;
        resizeAnimationRef.current = null;
      }, { once: true });
      animation.addEventListener("cancel", () => {
        if (resizeAnimationRef.current === animation) resizeAnimationRef.current = null;
      }, { once: true });
    };
    const observer = new ResizeObserver(() => {
      const nextBlockSize = bodyContent.getBoundingClientRect().height;
      if (Math.abs(nextBlockSize - targetBlockSize) < 1) return;
      const previousBlockSize = resizeAnimationRef.current
        ? bodyMeasure.getBoundingClientRect().height
        : targetBlockSize;
      resizeAnimationRef.current?.cancel();
      targetBlockSize = nextBlockSize;
      animateResize(previousBlockSize, nextBlockSize);
    });
    observer.observe(bodyContent);
    return () => {
      observer.disconnect();
      resizeAnimationRef.current?.cancel();
      resizeAnimationRef.current = null;
    };
  }, [open, size?.height, token.motionDurationMid, token.motionEaseInOut]);
  const resolvedMask = resolvePhiOverlayMaskPresentation(mask);
  const renderedTitle = header == null ? title : (
    <div
      style={{
        display: "grid",
        minBlockSize: PHI_MODAL_HEADER_MIN_BLOCK_SIZE,
        minWidth: 0,
        position: "relative",
        width: "100%",
      }}
    >
      {header}
      {title == null ? null : (
        <div
          style={{
            insetInlineStart: PHI_SPACE.base,
            minWidth: 0,
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
  const resolvedWidth = size?.width ?? width ?? (controlSize == null
    ? undefined
    : PHI_MODAL_WIDTH_BY_CONTROL_SIZE[controlSize]);

  return (
    <Modal
      open={open}
      title={renderedTitle}
      closable={closable}
      keyboard={keyboard}
      mask={resolvedMask.adapterMask}
      destroyOnHidden={mountPolicy === "on-open"}
      forceRender={hydrated && mountPolicy === "eager"}
      centered={centered}
      width={resolvedWidth as PhiCmsOverlaySize | Partial<Record<"xs" | "md" | "lg", PhiCmsOverlaySize>> | undefined}
      style={{
        maxWidth: `calc(100vw - ${PHI_SPACE.base} - ${PHI_SPACE.base})`,
        transition: `width ${token.motionDurationMid} ${token.motionEaseInOut}`,
      }}
      rootClassName={rootClassName}
      footer={footer ?? null}
      focusable={{ trap: true, focusTriggerAfterClose: true }}
      styles={{
        mask: resolvedMask.maskStyle,
        container: {
          display: "flex",
          flexDirection: "column",
          gap: 0,
          ...(size?.height == null ? {} : { blockSize: size.height }),
          maxBlockSize: `calc(100dvh - ${PHI_SPACE.lg} - ${PHI_SPACE.lg})`,
          overflow: "hidden",
          ...containerStyle,
          padding: 0,
        },
        header: {
          flex: "0 0 auto",
          display: header == null ? "flex" : undefined,
          alignItems: header == null ? "center" : undefined,
          minBlockSize: PHI_MODAL_HEADER_MIN_BLOCK_SIZE,
          marginBlock: 0,
          padding: 0,
          background: "transparent",
        },
        title: header == null
          ? { minWidth: 0, marginInlineStart: PHI_SPACE.base }
          : { width: "100%", minWidth: 0 },
        close: {
          top: PHI_SPACE.xs,
          insetInlineEnd: PHI_SPACE.xs,
        },
        body: {
          flex: "1 1 auto",
          minBlockSize: 0,
          overflowY: "auto",
          scrollbarGutter: "auto",
          padding: 0,
          background: "transparent",
        },
        footer: {
          flex: "0 0 auto",
          padding: 0,
          background: "transparent",
        },
      }}
      onCancel={(event) => onDismiss?.(resolvePhiOverlayDismissSource(event))}
      afterOpenChange={afterOpenChange}
      modalRender={(node) => (
        <div onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
          {node}
        </div>
      )}
    >
      <div
        ref={bodyMeasureRef}
        data-phi-modal-body-measure="true"
        style={{
          minWidth: 0,
          overflow: "hidden",
          width: "100%",
          ...(size?.height == null ? {} : { minBlockSize: "100%" }),
        }}
      >
        <div
          ref={bodyContentRef}
          data-phi-modal-body-content="true"
          style={{ minWidth: 0, width: "100%" }}
        >
          {body}
        </div>
      </div>
    </Modal>
  );
}
