"use client";

import type { CSSProperties, ReactNode } from "react";
import { theme as antdTheme } from "antd";

import {
  type PhiBuilderInspectableNodeKind,
} from "../node-kind-theme";
import type { PhiAnchorWidgetPlacement } from "../../../../components/controls/phi-anchor-control-contract";
import { PhiLayoutAnchoredOverlay, type PhiLayoutAnchorRole, type PhiLayoutAnchoredOverlayProps } from "../../../../components/layouts/clients/phi-layout-anchored-overlay";
import {
  PhiLayoutConfigButtonWidget,
  PhiLayoutDeleteButtonWidget,
  PhiLayoutDragButtonWidget,
  PhiPlusButtonWidget,
} from "./layout-scaffold-buttons";
import type {
  PhiStructureDragData,
  PhiStructureDropTargetData,
} from "../structure-dnd";

export type PhiLayoutPlusButtonOverlayProps = {
  slotIndex: number;
  label?: ReactNode;
  onInsert: (slotIndex: number) => void;
  anchor?: PhiAnchorWidgetPlacement | null;
  slotRole?: PhiLayoutAnchorRole;
  inset?: PhiLayoutAnchoredOverlayProps["inset"];
  ariaLabel?: string;
  dropTarget?: PhiStructureDropTargetData | null;
  children?: ReactNode;
};

export function PhiLayoutPlusButtonOverlay({
  slotIndex,
  label,
  onInsert,
  anchor,
  slotRole,
  inset,
  ariaLabel,
  dropTarget,
  children,
}: PhiLayoutPlusButtonOverlayProps) {
  return (
    <PhiLayoutAnchoredOverlay anchor={anchor} slotRole={slotRole} inset={inset}>
      {children ?? (
        <PhiPlusButtonWidget
          slotIndex={slotIndex}
          label={label}
          ariaLabel={ariaLabel}
          onInsert={onInsert}
          dropTarget={dropTarget}
        />
      )}
    </PhiLayoutAnchoredOverlay>
  );
}

export type PhiLayoutDeleteButtonOverlayProps = {
  onDelete: () => void;
  onOpenInspector?: (() => void) | null;
  ariaLabel?: string;
  inspectorAriaLabel?: string;
  top?: CSSProperties["top"];
  right?: CSSProperties["right"];
  bottom?: CSSProperties["bottom"];
  left?: CSSProperties["left"];
  placement?: "bottom-left" | "bottom-right";
  transform?: CSSProperties["transform"];
  zIndex?: CSSProperties["zIndex"];
  nodeKind?: PhiBuilderInspectableNodeKind;
  leading?: ReactNode;
  children?: ReactNode;
};

export function PhiLayoutDeleteButtonOverlay({
  onDelete,
  onOpenInspector,
  ariaLabel,
  inspectorAriaLabel,
  top,
  right,
  bottom,
  left,
  placement,
  transform,
  zIndex = 10,
  nodeKind,
  leading,
  children,
}: PhiLayoutDeleteButtonOverlayProps) {
  const { token } = antdTheme.useToken();
  const resolvedTop = top ?? (placement ? "auto" : -10);
  const resolvedRight = right ?? (placement === "bottom-left" ? "auto" : 0);
  const resolvedBottom = bottom ?? (placement ? -10 : "auto");
  const resolvedLeft = left ?? (placement === "bottom-left" ? 0 : "auto");
  const resolvedTransform = transform ?? (placement ? "translateY(50%)" : "translateY(-50%)");
  const chromeTheme = (() => {
    if (nodeKind === "region") {
      return {
        background: token.colorInfoBg,
        border: token.colorInfoBorder,
        color: token.colorPrimary,
      };
    }
    if (nodeKind === "layout") {
      return {
        background: token.colorSuccessBg,
        border: token.colorSuccessBorder,
        color: token.colorSuccessText,
      };
    }
    if (nodeKind === "widget") {
      return {
        background: token.colorWarningBg,
        border: token.colorWarningBorder,
        color: token.colorWarningText,
      };
    }
    return {
      background: token.colorBgContainer,
      border: token.colorBorderSecondary,
      color: "inherit",
    };
  })();

  return (
    <div
      className="phi-layout-scaffold-delete"
      data-phi-builder-scaffold-action="true"
      data-phi-builder-node-kind={nodeKind ?? undefined}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      style={{
        "--phi-layout-scaffold-delete-top": typeof resolvedTop === "number" ? `${resolvedTop}px` : String(resolvedTop),
        "--phi-layout-scaffold-delete-right": typeof resolvedRight === "number" ? `${resolvedRight}px` : String(resolvedRight),
        "--phi-layout-scaffold-delete-bottom": typeof resolvedBottom === "number" ? `${resolvedBottom}px` : String(resolvedBottom),
        "--phi-layout-scaffold-delete-left": typeof resolvedLeft === "number" ? `${resolvedLeft}px` : String(resolvedLeft),
        "--phi-layout-scaffold-delete-z-index": String(zIndex),
        "--phi-layout-scaffold-delete-transform": resolvedTransform,
        "--phi-layout-scaffold-delete-background": chromeTheme.background,
        "--phi-layout-scaffold-delete-border": chromeTheme.border,
        "--phi-layout-scaffold-delete-color": chromeTheme.color,
        "--phi-layout-scaffold-delete-shadow": "var(--ant-box-shadow-tertiary)",
      } as CSSProperties & Record<`--${string}`, string>}
    >
      {children ?? (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {leading}
          {onOpenInspector ? (
            <PhiLayoutConfigButtonWidget onOpenInspector={onOpenInspector} ariaLabel={inspectorAriaLabel} />
          ) : null}
          <PhiLayoutDeleteButtonWidget onDelete={onDelete} ariaLabel={ariaLabel} />
        </div>
      )}
    </div>
  );
}

export function PhiLayoutDragButtonOverlay({
  dragData,
  ariaLabel,
  nodeKind,
  top = "50%",
  left = 0,
  zIndex = 41,
}: {
  dragData: Omit<PhiStructureDragData, "getPreviewElement">;
  ariaLabel?: string;
  nodeKind: PhiBuilderInspectableNodeKind;
  top?: CSSProperties["top"];
  left?: CSSProperties["left"];
  zIndex?: CSSProperties["zIndex"];
}) {
  return (
    <PhiLayoutDeleteButtonOverlay
      onDelete={() => undefined}
      top={top}
      right="auto"
      bottom="auto"
      left={left}
      transform="translate(-50%, -50%)"
      zIndex={zIndex}
      nodeKind={nodeKind}
    >
      <PhiLayoutDragButtonWidget
        ariaLabel={ariaLabel}
        dragData={dragData}
      />
    </PhiLayoutDeleteButtonOverlay>
  );
}
