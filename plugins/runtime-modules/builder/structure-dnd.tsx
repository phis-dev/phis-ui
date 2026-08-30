"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { usePhiSignalDispatcher } from "../../../components/runtime/runtime-signal-bus";
import { createPhiBuilderControllerAddress } from "./controller/address";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";
import type { PhiSignalDropMode } from "../../../types/signals";

export type PhiStructureDragData = {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  pageScoped: boolean;
  regionKey: string;
  nodeId: PhiCmsInstanceId;
  nodeKind: "layout" | "widget";
  title: string;
  getPreviewElement: () => HTMLElement | null;
};

export type PhiStructureDropTargetData = {
  id: string;
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  regionKey: string;
  dropMode: PhiSignalDropMode;
  targetNodeId?: PhiCmsInstanceId | null;
  title: string;
  accepts: (source: PhiStructureDragData) => boolean;
  drop: (source: PhiStructureDragData) => void;
};

type PhiStructureDndState = {
  active: PhiStructureDragData | null;
  acceptedTargetId: string | null;
};

const PhiStructureDndContext = createContext<PhiStructureDndState>({
  active: null,
  acceptedTargetId: null,
});

function readStructureDragData(event: DragStartEvent | DragOverEvent | DragEndEvent) {
  return (event.active.data.current ?? null) as PhiStructureDragData | null;
}

function readStructureDropTarget(event: DragOverEvent | DragEndEvent) {
  return (event.over?.data.current ?? null) as PhiStructureDropTargetData | null;
}

function PhiStructureDragSnapshot({
  source,
}: {
  source: HTMLElement | null;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rect = useMemo(() => source?.getBoundingClientRect() ?? null, [source]);
  const scale =
    rect && rect.width > 0 && rect.height > 0
      ? Math.min(1, 280 / rect.width, 160 / rect.height)
      : 1;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !source || !rect) {
      return;
    }
    const clone = source.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll<HTMLElement>("[data-phi-builder-scaffold-action='true']")
      .forEach((element) => element.remove());
    clone.querySelectorAll<HTMLElement>("[id]").forEach((element) => {
      element.removeAttribute("id");
    });
    clone.removeAttribute("id");
    Object.assign(clone.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      minWidth: `${rect.width}px`,
      minHeight: `${rect.height}px`,
      margin: "0",
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      pointerEvents: "none",
    });
    host.replaceChildren(clone);
    return () => host.replaceChildren();
  }, [rect, scale, source]);

  if (!rect) {
    return null;
  }
  return (
    <div
      ref={hostRef}
      style={{
        width: Math.max(1, rect.width * scale),
        height: Math.max(1, rect.height * scale),
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 0.86,
        borderRadius: "var(--ant-border-radius)",
        boxShadow: "var(--ant-box-shadow-secondary)",
      }}
    />
  );
}

export function PhiStructureDndProvider({
  children,
}: {
  children: ReactNode;
}) {
  const emitSignal = usePhiSignalDispatcher();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );
  const [active, setActive] = useState<PhiStructureDragData | null>(null);
  const [acceptedTargetId, setAcceptedTargetId] = useState<string | null>(null);
  const lastOverTargetIdRef = useRef<string | null>(null);
  const previewElement = active?.getPreviewElement() ?? null;

  const emitDragSignal = (
    source: PhiStructureDragData,
    input: {
      channel: "drag" | "drop";
      action: "start" | "change" | "stop" | "drop";
      target?: PhiStructureDropTargetData | null;
      accepted?: boolean | null;
    },
  ) => {
    const controller = createPhiBuilderControllerAddress();
    emitSignal({
      scope: source.pageScoped ? "page" : "area",
      channel: input.channel,
      action: input.action,
      value: {
        area: source.area,
        pageKey: source.pageKey,
        sourceRegionKey: source.regionKey,
        sourceNodeId: source.nodeId,
        sourceNodeKind: source.nodeKind,
        targetRegionKey: input.target?.regionKey ?? null,
        targetKey: input.target?.id ?? null,
        targetNodeId: input.target?.targetNodeId ?? null,
        dropMode: input.target?.dropMode ?? null,
        accepted: input.accepted ?? null,
      },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
      sender: controller,
      receiver: controller,
      timestamp: Date.now(),
    });
  };

  const finish = (source: PhiStructureDragData | null) => {
    if (source) {
      emitDragSignal(source, {
        channel: "drag",
        action: "stop",
      });
    }
    lastOverTargetIdRef.current = null;
    setAcceptedTargetId(null);
    setActive(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const source = readStructureDragData(event);
    if (!source) {
      return;
    }
    setActive(source);
    emitDragSignal(source, {
      channel: "drag",
      action: "start",
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const source = readStructureDragData(event);
    const target = readStructureDropTarget(event);
    const accepted = !!source && !!target && target.accepts(source);
    const nextTargetId = accepted ? target!.id : null;
    setAcceptedTargetId((current) =>
      current === nextTargetId ? current : nextTargetId,
    );
    if (
      source &&
      target &&
      lastOverTargetIdRef.current !== `${target.id}:${accepted}`
    ) {
      lastOverTargetIdRef.current = `${target.id}:${accepted}`;
      emitDragSignal(source, {
        channel: "drag",
        action: "change",
        target,
        accepted,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const source = readStructureDragData(event);
    const target = readStructureDropTarget(event);
    const accepted = !!source && !!target && target.accepts(source);
    if (source && target && accepted) {
      target.drop(source);
      emitDragSignal(source, {
        channel: "drop",
        action: "drop",
        target,
        accepted: true,
      });
    }
    finish(source);
  };

  const contextValue = useMemo(
    () => ({ active, acceptedTargetId }),
    [acceptedTargetId, active],
  );

  useEffect(() => {
    document.documentElement.toggleAttribute(
      "data-phi-structure-drop-accepted",
      acceptedTargetId != null,
    );
    return () => {
      document.documentElement.removeAttribute(
        "data-phi-structure-drop-accepted",
      );
    };
  }, [acceptedTargetId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => finish(active)}
    >
      <PhiStructureDndContext.Provider value={contextValue}>
        {children}
        <DragOverlay dropAnimation={null}>
          {active ? <PhiStructureDragSnapshot source={previewElement} /> : null}
        </DragOverlay>
      </PhiStructureDndContext.Provider>
    </DndContext>
  );
}

export function usePhiStructureDraggable(
  id: string,
  data: PhiStructureDragData | null,
) {
  return useDraggable({
    id,
    data: data ?? undefined,
    disabled: data == null,
  });
}

export function usePhiStructureDroppable(
  data: PhiStructureDropTargetData | null,
) {
  const dndState = useContext(PhiStructureDndContext);
  const droppable = useDroppable({
    id: data?.id ?? "phi-structure-drop-disabled",
    data: data ?? undefined,
    disabled: data == null,
  });
  return {
    ...droppable,
    accepted:
      data != null &&
      droppable.isOver &&
      dndState.acceptedTargetId === data.id,
  };
}
