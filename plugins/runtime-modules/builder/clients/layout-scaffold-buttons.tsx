"use client";

import { Button } from "antd";
import { DeleteOutlined, HolderOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import {
  usePhiStructureDraggable,
  usePhiStructureDroppable,
  type PhiStructureDragData,
  type PhiStructureDropTargetData,
} from "../structure-dnd";

export type PhiLayoutScaffoldInsertButtonProps = {
  slotIndex: number;
  label?: ReactNode;
  onInsert: (slotIndex: number) => void;
  ariaLabel?: string;
  dropTarget?: PhiStructureDropTargetData | null;
};

export type PhiLayoutScaffoldDeleteButtonProps = {
  onDelete: () => void;
  ariaLabel?: string;
};

export type PhiLayoutScaffoldConfigButtonProps = {
  onOpenInspector: () => void;
  ariaLabel?: string;
};

export type PhiLayoutScaffoldDragButtonProps = {
  dragData: Omit<PhiStructureDragData, "getPreviewElement">;
  ariaLabel?: string;
};

export function PhiPlusButtonWidget({
  slotIndex,
  label,
  onInsert,
  ariaLabel,
  dropTarget,
}: PhiLayoutScaffoldInsertButtonProps) {
  const labelText = typeof label === "string" ? label : undefined;
  const { accepted, isOver, setNodeRef } =
    usePhiStructureDroppable(dropTarget ?? null);

  return (
    <Button
      key={`insert-${slotIndex}`}
      ref={setNodeRef}
      className="phi-layout-affordance phi-layout-affordance--insert"
      type="dashed"
      size="small"
      icon={<PlusOutlined />}
      aria-label={ariaLabel ?? (labelText ? `Insert child after ${labelText}` : "Insert child")}
      onClick={(event) => {
        event.stopPropagation();
        onInsert(slotIndex);
      }}
      data-phi-structure-drop-state={
        accepted ? "accepted" : isOver ? "rejected" : undefined
      }
      style={
        {
          "--phi-layout-affordance-size": "var(--ant-control-height)",
        } as CSSProperties & Record<`--${string}`, string>
      }
    />
  );
}

export function PhiLayoutDragButtonWidget({
  dragData,
  ariaLabel = "Move node",
}: PhiLayoutScaffoldDragButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const resolvedData = useMemo<PhiStructureDragData>(
    () => ({
      ...dragData,
      getPreviewElement: () => {
        const selector =
          dragData.nodeKind === "widget"
            ? ".phi-builder-widget-scaffold"
            : ".phi-edit-scaffold-drawer";
        return buttonRef.current?.closest<HTMLElement>(selector) ?? null;
      },
    }),
    [dragData],
  );
  const { attributes, listeners, setNodeRef, isDragging } =
    usePhiStructureDraggable(
      `structure-drag:${dragData.area}:${dragData.pageKey}:${dragData.regionKey}:${dragData.nodeId}`,
      resolvedData,
    );

  return (
    <Button
      ref={(node) => {
        buttonRef.current = node;
        setNodeRef(node);
      }}
      className="phi-layout-affordance phi-layout-affordance--drag"
      aria-label={ariaLabel}
      icon={<HolderOutlined />}
      type="text"
      size="small"
      {...attributes}
      {...listeners}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={
        {
          cursor: "grab",
          opacity: isDragging ? 0.45 : undefined,
          "--phi-layout-affordance-size": "var(--ant-control-height-sm)",
        } as CSSProperties & Record<`--${string}`, string>
      }
    />
  );
}

export function PhiLayoutDeleteButtonWidget({ onDelete, ariaLabel = "Delete layout" }: PhiLayoutScaffoldDeleteButtonProps) {
  return (
    <Button
      className="phi-layout-affordance phi-layout-affordance--delete"
      aria-label={ariaLabel}
      icon={<DeleteOutlined />}
      danger
      type="text"
      size="small"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete();
      }}
      style={
        {
          "--phi-layout-affordance-size": "var(--ant-control-height-sm)",
        } as CSSProperties & Record<`--${string}`, string>
      }
    />
  );
}

export function PhiLayoutConfigButtonWidget({
  onOpenInspector,
  ariaLabel = "Open inspector",
}: PhiLayoutScaffoldConfigButtonProps) {
  return (
    <Button
      className="phi-layout-affordance phi-layout-affordance--config"
      aria-label={ariaLabel}
      icon={<SettingOutlined />}
      type="text"
      size="small"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenInspector();
      }}
      style={
        {
          "--phi-layout-affordance-size": "var(--ant-control-height-sm)",
        } as CSSProperties & Record<`--${string}`, string>
      }
    />
  );
}
