"use client";

import { PhiButtonControl } from "../../../../components/controls/phi-button-control";
import { PhiDragHandleControl } from "../../../../components/controls/phi-drag-handle-control";
import { DeleteOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { useMemo, useRef, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import {
  usePhiStructureDraggable,
  usePhiStructureDroppable,
  type PhiStructureDragData,
  type PhiStructureDropTargetData,
} from "../structure-dnd";

/*
 * The scaffold's own buttons sit on a surface that selects on a press, and a press on one of them must
 * not also select the node beneath. That is stopped here, around each button, rather than inside it:
 * the button reports that it was pressed, and the element that knows it sits on something listening
 * decides how far the press travels. `display: contents` keeps the wrapper out of the layout, so the
 * scaffold stylesheets still size and place the button itself.
 */
function stopAtScaffold(event: SyntheticEvent) {
  event.stopPropagation();
}

/** A press that must not take focus from what is being edited, nor reach the node beneath. */
function holdFocusAtScaffold(event: SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

const PHI_SCAFFOLD_BUTTON_BOUNDARY_STYLE: CSSProperties = { display: "contents" };

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

  // The drop state is a class rather than a data attribute: it is how the button looks, and a class is
  // what a Control accepts for that.
  const dropStateClassName = accepted
    ? " phi-layout-affordance--drop-accepted"
    : isOver
      ? " phi-layout-affordance--drop-rejected"
      : "";

  return (
    <span key={`insert-${slotIndex}`} style={PHI_SCAFFOLD_BUTTON_BOUNDARY_STYLE} onClick={stopAtScaffold}>
      <PhiButtonControl
        ref={setNodeRef}
        className={`phi-layout-affordance phi-layout-affordance--insert${dropStateClassName}`}
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        ariaLabel={ariaLabel ?? (labelText ? `Insert child after ${labelText}` : "Insert child")}
        onClick={() => onInsert(slotIndex)}
        style={
          {
            "--phi-layout-affordance-size": "var(--ant-control-height)",
          } as CSSProperties & Record<`--${string}`, string>
        }
      />
    </span>
  );
}

export function PhiLayoutDragButtonWidget({
  dragData,
  ariaLabel = "Move node",
}: PhiLayoutScaffoldDragButtonProps) {
  const buttonRef = useRef<HTMLElement | null>(null);
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
    <PhiDragHandleControl
      ariaLabel={ariaLabel}
      activator={{
        setActivatorRef: (node) => {
          buttonRef.current = node;
          setNodeRef(node);
        },
        listeners,
        attributes,
      }}
      dragging={isDragging}
      className="phi-layout-affordance phi-layout-affordance--drag"
      style={
        {
          "--phi-layout-affordance-size": "var(--ant-control-height-sm)",
        } as CSSProperties & Record<`--${string}`, string>
      }
    />
  );
}

export function PhiLayoutDeleteButtonWidget({ onDelete, ariaLabel = "Delete layout" }: PhiLayoutScaffoldDeleteButtonProps) {
  return (
    <span style={PHI_SCAFFOLD_BUTTON_BOUNDARY_STYLE} onMouseDown={holdFocusAtScaffold} onClick={stopAtScaffold}>
      <PhiButtonControl
        className="phi-layout-affordance phi-layout-affordance--delete"
        ariaLabel={ariaLabel}
        icon={<DeleteOutlined />}
        danger
        type="text"
        size="small"
        onClick={onDelete}
        style={
          {
            "--phi-layout-affordance-size": "var(--ant-control-height-sm)",
          } as CSSProperties & Record<`--${string}`, string>
        }
      />
    </span>
  );
}

export function PhiLayoutConfigButtonWidget({
  onOpenInspector,
  ariaLabel = "Open inspector",
}: PhiLayoutScaffoldConfigButtonProps) {
  return (
    <span style={PHI_SCAFFOLD_BUTTON_BOUNDARY_STYLE} onMouseDown={holdFocusAtScaffold} onClick={stopAtScaffold}>
      <PhiButtonControl
        className="phi-layout-affordance phi-layout-affordance--config"
        ariaLabel={ariaLabel}
        icon={<SettingOutlined />}
        type="text"
        size="small"
        onClick={onOpenInspector}
        style={
          {
            "--phi-layout-affordance-size": "var(--ant-control-height-sm)",
          } as CSSProperties & Record<`--${string}`, string>
        }
      />
    </span>
  );
}
