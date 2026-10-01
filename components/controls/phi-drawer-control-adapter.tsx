"use client";

/*
 * The Drawer itself, behind `PhiDrawerControl`, which loads this file the first time an Overlay opens --
 * the same split as the Modal, for the same reason.
 */

import { useSyncExternalStore } from "react";
import { Drawer } from "antd";

import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import {
  PHI_OVERLAY_DEFAULT_MASK,
  resolvePhiOverlayDismissSource,
  resolvePhiOverlayMaskPresentation,
} from "./phi-overlay-control-contract";
import type { PhiDrawerControlProps } from "./phi-drawer-control";

const subscribeHydration = () => () => undefined;
const PHI_DRAWER_HEADER_MIN_BLOCK_SIZE = `calc(var(--ant-control-height) + ${PHI_SPACE.xs} + ${PHI_SPACE.xs})`;
/** Where a title starts when the close button stands before it: past the button, not beneath it. */
const PHI_DRAWER_TITLE_AFTER_CLOSE = `calc(${PHI_SPACE.sm} + var(--ant-control-height) + ${PHI_SPACE.xs})`;

export function PhiDrawerControlAdapter({
  open,
  title,
  header,
  body,
  footer,
  closable = true,
  keyboard = true,
  mask = PHI_OVERLAY_DEFAULT_MASK,
  mountPolicy = "remount",
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
  // A drawer with nothing to say in its header draws none: no title, no header content, no close button.
  const hasHeaderContent = header != null || title != null;
  const hasHeader = hasHeaderContent || closable;
  const titleInset = closable && closeAtInlineStart ? PHI_DRAWER_TITLE_AFTER_CLOSE : PHI_SPACE.lg;
  const renderedTitle = hasHeaderContent ? (
    <div style={{ display: "grid", minBlockSize: PHI_DRAWER_HEADER_MIN_BLOCK_SIZE, minWidth: 0, position: "relative", width: "100%" }}>
      {header}
      {title == null ? null : (
        <div style={{ insetInlineStart: titleInset, minWidth: 0, position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 1 }}>
          {title}
        </div>
      )}
    </div>
  ) : null;

  return (
    <Drawer
      open={open}
      title={renderedTitle}
      closable={closable ? { placement: closeAtInlineStart ? "start" : "end" } : false}
      keyboard={keyboard}
      mask={resolvedMask.adapterMask}
      destroyOnHidden={mountPolicy === "remount"}
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
          /*
           * The surface a drawer stands on, unless its chrome names one. The section below is made
           * transparent so the chrome shows through it, and without this nothing painted at all: a
           * drawer without a configured background was see-through, and the presets only looked right
           * because their glass effect brings a background of its own.
           */
          background: "var(--ant-color-bg-elevated)",
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
          minBlockSize: hasHeader ? PHI_DRAWER_HEADER_MIN_BLOCK_SIZE : 0,
          position: "relative",
          padding: 0,
          background: "transparent",
        },
        title: { width: "100%", minWidth: 0 },
        close: {
          position: "absolute",
          top: "50%",
          insetInlineStart: closeAtInlineStart ? PHI_SPACE.sm : undefined,
          insetInlineEnd: closeAtInlineStart ? undefined : PHI_SPACE.sm,
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
