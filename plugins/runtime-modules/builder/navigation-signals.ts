import type { PhiSignal } from "../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import type { PhiSignalDispatch } from "../../../components/runtime/runtime-signal-bus";
import type { PhiBuilderPageCatalogArea } from "../../../helpers/cms-page-catalog";
import { createPhiBuilderControllerAddress } from "./controller/address";

export type PhiBuilderNavigationDragEventValue = {
  area?: PhiBuilderPageCatalogArea;
  navKey?: string;
  dragType: string;
  sourceKey: string;
  targetKey?: string | null;
  dropMode?: "before" | "after" | "child" | "append" | null;
  accepted?: boolean | null;
};

export type PhiBuilderNavigationDragStateValue = {
  area: PhiBuilderPageCatalogArea;
  navKey: string;
  dragging: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveSignalValue(signal: PhiSignal) {
  return signal.value;
}

export function resolvePhiBuilderNavigationDragEvent(signal: PhiSignal): PhiBuilderNavigationDragEventValue | null {
  const rawValue = resolveSignalValue(signal);
  if (!isRecord(rawValue)) {
    return null;
  }
  const value = rawValue as Record<string, unknown>;
  if (typeof value.dragType !== "string" || typeof value.sourceKey !== "string") {
    return null;
  }

  return {
    area: typeof value.area === "string" ? (value.area as PhiBuilderPageCatalogArea) : undefined,
    navKey: typeof value.navKey === "string" ? value.navKey : undefined,
    dragType: value.dragType,
    sourceKey: value.sourceKey,
    targetKey: typeof value.targetKey === "string" ? value.targetKey : null,
    dropMode:
      value.dropMode === "before" ||
      value.dropMode === "after" ||
      value.dropMode === "child" ||
      value.dropMode === "append"
        ? value.dropMode
        : null,
    accepted: typeof value.accepted === "boolean" ? value.accepted : null,
  };
}

export function resolvePhiBuilderNavigationDragging(signal: PhiSignal): boolean | null {
  if (
    signal.channel !== "drag" ||
    signal.action !== "change"
  ) {
    return null;
  }

  const value = resolveSignalValue(signal);
  if (!isRecord(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record.dragging === "boolean" ? record.dragging : null;
}

export function emitPhiBuilderNavigationDragStateSignal(input: {
  emitSignal: PhiSignalDispatch;
  area: PhiBuilderPageCatalogArea;
  navKey: string;
  dragging: boolean;
  sourceObjectKey: string;
  targetObjectKey?: string | null;
}) {
  input.emitSignal({
    scope: "area",
    channel: "drag",
    action: "change",
    value: {
      area: input.area,
      navKey: input.navKey,
      dragging: input.dragging,
    },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    sender: createPhiBuilderControllerAddress(),
    receiver: input.targetObjectKey ? createPhiBuilderControllerAddress() : "broadcast",
    meta: {
      sourceLabel: `${input.sourceObjectKey}:${input.area}:${input.navKey}`,
    },
  });
}

export function emitPhiBuilderNavigationDragEventSignal(input: {
  emitSignal: PhiSignalDispatch;
  kind: "drag" | "drop";
  area: PhiBuilderPageCatalogArea;
  navKey: string;
  sourceObjectKey: string;
  targetObjectKey?: string | null;
  value: PhiBuilderNavigationDragEventValue;
}) {
  const value = {
    area: input.area,
    navKey: input.navKey,
    dragType: input.value.dragType,
    dropType: input.kind === "drop" ? input.value.dragType : null,
    sourceKey: input.value.sourceKey,
    targetKey: input.value.targetKey ?? null,
    dropMode: input.value.dropMode ?? null,
    accepted: input.value.accepted ?? null,
  };

  input.emitSignal({
    scope: "area",
    channel: input.kind,
    action: input.kind === "drop" ? "drop" : "start",
    value,
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    sender: createPhiBuilderControllerAddress(),
    receiver: input.targetObjectKey ? createPhiBuilderControllerAddress() : "broadcast",
    meta: {
      sourceLabel: `${input.sourceObjectKey}:${input.area}:${input.navKey}`,
    },
  });
}
