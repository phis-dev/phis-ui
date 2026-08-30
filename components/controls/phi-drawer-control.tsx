"use client";

import { useSyncExternalStore } from "react";
import { Drawer } from "antd";

import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import type { PhiCmsOverlayConfig, PhiCmsOverlaySize } from "../../types/cms-overlay";
import {
  PHI_OVERLAY_DEFAULT_MASK,
  resolvePhiOverlayDismissSource,
  resolvePhiOverlayMaskPresentation,
  type PhiOverlayControlCommonProps,
} from "./phi-overlay-control-contract";

const subscribeHydration = () => () => undefined;
const PHI_DRAWER_HEADER_MIN_BLOCK_SIZE = `calc(var(--ant-control-height) + ${PHI_SPACE.xs} + ${PHI_SPACE.xs})`;

export type PhiDrawerControlProps = PhiOverlayControlCommonProps & {
  placement?: PhiCmsOverlayConfig["placement"];
  size?: PhiCmsOverlaySize;
  maxSize?: number;
  resizable?: PhiCmsOverlayConfig["resizable"];
  push?: PhiCmsOverlayConfig["push"];
  zIndex?: number;
};

export function PhiDrawerControl({
  open,
  title,
  header,
  body,
  footer,
  closable = true,
  keyboard = true,
  mask = PHI_OVERLAY_DEFAULT_MASK,
  mountPolicy = "on-open",
  placement = "right",
  size,
  maxSize,
  resizable = false,
  push = false,
  zIndex,
  containerStyle,
  onDismiss,
  afterOpenChange,
}: PhiDrawerControlProps) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const resolvedMask = resolvePhiOverlayMaskPresentation(mask);
  const closeAtInlineStart = placement === "right";
  const renderedTitle = (
    <div style={{ display: "grid", minBlockSize: PHI_DRAWER_HEADER_MIN_BLOCK_SIZE, minWidth: 0, position: "relative", width: "100%" }}>
      {header}
      {title == null ? null : (
        <div style={{ insetInlineStart: PHI_SPACE.lg, minWidth: 0, position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 1 }}>
          {title}
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      open={open}
      title={renderedTitle}
      closable={closable ? { placement: closeAtInlineStart ? "start" : "end" } : false}
      keyboard={keyboard}
      mask={resolvedMask.adapterMask}
      destroyOnHidden={mountPolicy === "on-open"}
      forceRender={hydrated && mountPolicy === "eager"}
      placement={placement}
      size={size}
      maxSize={maxSize}
      resizable={resizable}
      push={push}
      zIndex={zIndex}
      footer={footer ?? null}
      focusable={{ trap: true, focusTriggerAfterClose: true }}
      styles={{
        mask: resolvedMask.maskStyle,
        wrapper: {
          ...containerStyle,
          padding: 0,
        },
        section: {
          display: "flex",
          flexDirection: "column",
          blockSize: "100%",
          minBlockSize: 0,
          maxBlockSize: "100dvh",
          overflow: "hidden",
          background: "transparent",
          borderRadius: "inherit",
        },
        header: {
          flex: "0 0 auto",
          minBlockSize: PHI_DRAWER_HEADER_MIN_BLOCK_SIZE,
          position: "relative",
          padding: 0,
          background: "transparent",
        },
        title: { width: "100%", minWidth: 0 },
        close: {
          position: "absolute",
          top: "50%",
          left: closeAtInlineStart ? PHI_SPACE.sm : undefined,
          right: closeAtInlineStart ? undefined : PHI_SPACE.sm,
          marginInline: 0,
          transform: "translateY(-50%)",
          zIndex: 1,
        },
        body: {
          display: "flex",
          flexDirection: "column",
          flex: "1 1 auto",
          minBlockSize: 0,
          overflowY: "auto",
          padding: 0,
          background: "transparent",
        },
        footer: { flex: "0 0 auto", padding: 0, background: "transparent" },
      }}
      onClose={(event) => onDismiss?.(resolvePhiOverlayDismissSource(event))}
      afterOpenChange={afterOpenChange}
      drawerRender={(node) => (
        <div
          style={{ display: "flex", flexDirection: "column", blockSize: "100%", minBlockSize: 0 }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {node}
        </div>
      )}
    >
      {body}
    </Drawer>
  );
}
