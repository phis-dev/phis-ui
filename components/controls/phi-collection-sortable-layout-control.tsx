"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { PhiIcon } from "../shell/phi-icon";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiCollectionReorderContext, type PhiCollectionReorderContextValue } from "./phi-collection-reorder-context";

export type PhiCollectionSortableLayoutControlProps = {
  mode: "grid" | "stack";
  gap: string | number;
  minColumnWidth: string | number;
  /** Drawn by the renderer, one per key of `reorder.itemKeys`, in that order. */
  items: readonly ReactNode[];
  reorder: PhiCollectionReorderContextValue;
};

function buildGridColumns(minColumnWidth: string | number) {
  const width = typeof minColumnWidth === "number" ? `${minColumnWidth}px` : minColumnWidth;
  return `repeat(auto-fill, minmax(${width}, 1fr))`;
}

/*
 * One item and its handle. Only the handle starts a drag -- by pointer or, focused, by Space or Enter --
 * so the item's own links, buttons and its click stay its own: a keyboard press on the item's delete
 * button never reaches the drag sensor, which listens on the handle alone.
 */
function PhiCollectionSortableItem({
  id,
  disabled,
  handleLabel,
  children,
}: {
  id: string;
  disabled: boolean;
  handleLabel: string;
  children: ReactNode;
}) {
  const { token } = usePhiConfig();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: CSSProperties = {
    position: "relative",
    minWidth: 0,
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.72 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} data-phi-collection-sortable-item="">
      {/* An item that draws a Collection of its own does not hand that one this reordering. */}
      <PhiCollectionReorderContext.Provider value={null}>{children}</PhiCollectionReorderContext.Provider>
      <span
        {...attributes}
        {...listeners}
        ref={setActivatorNodeRef}
        aria-label={handleLabel}
        title={handleLabel}
        style={{
          position: "absolute",
          top: token.paddingXXS,
          insetInlineStart: token.paddingXXS,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: token.controlHeightSM,
          height: token.controlHeightSM,
          borderRadius: token.borderRadiusSM,
          background: token.colorBgElevated,
          color: token.colorTextSecondary,
          boxShadow: token.boxShadowTertiary,
          cursor: disabled ? "default" : isDragging ? "grabbing" : "grab",
          opacity: disabled ? 0.5 : 0.9,
          touchAction: "none",
        }}
      >
        <PhiIcon name="holder" size="inherit" />
      </span>
    </div>
  );
}

/**
 * A Collection's items in `grid` or `stack` with a drag handle on each, for `PhiCollectionViewControl`
 * while a `PhiCollectionReorderContext` offers reordering. Pointer and keyboard (`@dnd-kit`, as the Table
 * Control sorts its rows); a drop answers every key in the new order and changes nothing itself -- the
 * order shown is the one the items come in.
 */
export function PhiCollectionSortableLayoutControl({
  mode,
  gap,
  minColumnWidth,
  items,
  reorder,
}: PhiCollectionSortableLayoutControlProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // dnd-kit names items by string; the keys go back out as the Provider gave them.
  const ids = useMemo(() => reorder.itemKeys.map((key) => String(key)), [reorder.itemKeys]);
  const disabled = reorder.disabled === true;
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    reorder.onReorder(arrayMove([...reorder.itemKeys], from, to));
  };
  const style: CSSProperties = mode === "stack"
    ? { display: "flex", flexDirection: "column", gap, width: "100%" }
    : { display: "grid", gridTemplateColumns: buildGridColumns(minColumnWidth), gap, width: "100%" };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={mode === "stack" ? verticalListSortingStrategy : rectSortingStrategy}>
        <div style={style}>
          {items.map((item, index) => (
            <PhiCollectionSortableItem key={ids[index]} id={ids[index]!} disabled={disabled} handleLabel={reorder.handleLabel}>
              {item}
            </PhiCollectionSortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
