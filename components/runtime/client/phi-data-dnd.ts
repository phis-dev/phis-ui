"use client";

import type { PhiRuntimeDataProviderKey } from "../../../types/runtime-data-provider";

const PHI_DATA_DRAG_DATA_TYPE = "application/x-phi-data-drag+json";
const PHI_DATA_DRAG_SCROLL_EDGE = 48;
const PHI_DATA_DRAG_SCROLL_MAX_STEP = 20;
let activePhiDataDragPayload: PhiDataDragPayload | null = null;
let phiDataDragAutoScrollActive = false;
let phiDataDragAutoScrollFrame: number | null = null;
let phiDataDragPointer: {
  clientX: number;
  clientY: number;
  path: readonly HTMLElement[];
} | null = null;

export type PhiDataDragPayload = {
  payloadType: `${string}/${string}`;
  sourceObjectIdentity: string;
  source?: {
    providerKey: PhiRuntimeDataProviderKey;
    resourceKey: string;
    objectIdentities: readonly (string | number)[];
  };
};

type PhiDataDragScrollAxis = "x" | "y";
type PhiDataDragScrollTarget = HTMLElement | Window;

function readPhiDataDragEdgeStep(pointer: number, start: number, end: number) {
  const extent = end - start;
  if (extent <= 0 || pointer < start || pointer > end) return 0;
  const threshold = Math.min(PHI_DATA_DRAG_SCROLL_EDGE, extent / 3);
  const startDistance = pointer - start;
  const endDistance = end - pointer;
  const edgeDistance = Math.min(startDistance, endDistance);
  if (edgeDistance >= threshold) return 0;
  const direction = startDistance <= endDistance ? -1 : 1;
  const intensity = 1 - edgeDistance / threshold;
  return direction * Math.max(1, Math.ceil(PHI_DATA_DRAG_SCROLL_MAX_STEP * intensity));
}

function canPhiDataDragScrollElement(element: HTMLElement, axis: PhiDataDragScrollAxis, step: number) {
  const style = window.getComputedStyle(element);
  const overflow = axis === "x" ? style.overflowX : style.overflowY;
  if (overflow !== "auto" && overflow !== "scroll" && overflow !== "overlay") return false;
  if (axis === "x") {
    return step < 0
      ? element.scrollLeft > 0
      : element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
  }
  return step < 0
    ? element.scrollTop > 0
    : element.scrollTop + element.clientHeight < element.scrollHeight - 1;
}

function canPhiDataDragScrollWindow(axis: PhiDataDragScrollAxis, step: number) {
  const scrollingElement = document.scrollingElement;
  if (!scrollingElement) return false;
  if (axis === "x") {
    return step < 0
      ? window.scrollX > 0
      : window.scrollX + window.innerWidth < scrollingElement.scrollWidth - 1;
  }
  return step < 0
    ? window.scrollY > 0
    : window.scrollY + window.innerHeight < scrollingElement.scrollHeight - 1;
}

function resolvePhiDataDragScrollTarget(
  axis: PhiDataDragScrollAxis,
  pointer: number,
  path: readonly HTMLElement[],
): { target: PhiDataDragScrollTarget; step: number } | null {
  for (const element of path) {
    if (element === document.body || element === document.documentElement) continue;
    const bounds = element.getBoundingClientRect();
    const step = readPhiDataDragEdgeStep(
      pointer,
      axis === "x" ? bounds.left : bounds.top,
      axis === "x" ? bounds.right : bounds.bottom,
    );
    if (step !== 0 && canPhiDataDragScrollElement(element, axis, step)) return { target: element, step };
  }
  const windowStep = readPhiDataDragEdgeStep(
    pointer,
    0,
    axis === "x" ? window.innerWidth : window.innerHeight,
  );
  return windowStep !== 0 && canPhiDataDragScrollWindow(axis, windowStep)
    ? { target: window, step: windowStep }
    : null;
}

function runPhiDataDragAutoScroll() {
  phiDataDragAutoScrollFrame = null;
  if (!phiDataDragAutoScrollActive || !phiDataDragPointer) return;
  const horizontal = resolvePhiDataDragScrollTarget("x", phiDataDragPointer.clientX, phiDataDragPointer.path);
  const vertical = resolvePhiDataDragScrollTarget("y", phiDataDragPointer.clientY, phiDataDragPointer.path);
  const targets = new Map<PhiDataDragScrollTarget, { left: number; top: number }>();
  if (horizontal) targets.set(horizontal.target, { left: horizontal.step, top: 0 });
  if (vertical) {
    const current = targets.get(vertical.target) ?? { left: 0, top: 0 };
    targets.set(vertical.target, { ...current, top: vertical.step });
  }
  for (const [target, delta] of targets) target.scrollBy({ ...delta, behavior: "auto" });
  if (targets.size > 0) phiDataDragAutoScrollFrame = window.requestAnimationFrame(runPhiDataDragAutoScroll);
}

function updatePhiDataDragPointer(event: DragEvent) {
  phiDataDragPointer = {
    clientX: event.clientX,
    clientY: event.clientY,
    path: event.composedPath().filter((target): target is HTMLElement => target instanceof HTMLElement),
  };
  if (phiDataDragAutoScrollFrame == null) {
    phiDataDragAutoScrollFrame = window.requestAnimationFrame(runPhiDataDragAutoScroll);
  }
}

function stopPhiDataDragAutoScroll() {
  if (typeof window === "undefined" || !phiDataDragAutoScrollActive) return;
  phiDataDragAutoScrollActive = false;
  phiDataDragPointer = null;
  if (phiDataDragAutoScrollFrame != null) window.cancelAnimationFrame(phiDataDragAutoScrollFrame);
  phiDataDragAutoScrollFrame = null;
  window.removeEventListener("dragover", updatePhiDataDragPointer);
  window.removeEventListener("dragend", clearPhiDataDragPayload);
  window.removeEventListener("drop", clearPhiDataDragPayload);
}

export function startPhiDataDragAutoScroll() {
  if (typeof window === "undefined" || phiDataDragAutoScrollActive) return;
  phiDataDragAutoScrollActive = true;
  window.addEventListener("dragover", updatePhiDataDragPointer, { passive: true });
  window.addEventListener("dragend", clearPhiDataDragPayload);
  window.addEventListener("drop", clearPhiDataDragPayload);
}

export function writePhiDataDragPayload(dataTransfer: DataTransfer, payload: PhiDataDragPayload) {
  activePhiDataDragPayload = payload;
  dataTransfer.setData(PHI_DATA_DRAG_DATA_TYPE, JSON.stringify(payload));
  startPhiDataDragAutoScroll();
}

export function clearPhiDataDragPayload() {
  activePhiDataDragPayload = null;
  stopPhiDataDragAutoScroll();
}

export function readPhiDataDragPayload(dataTransfer: DataTransfer): PhiDataDragPayload | null {
  const raw = dataTransfer.getData(PHI_DATA_DRAG_DATA_TYPE);
  if (!raw) return activePhiDataDragPayload;
  try {
    const value = JSON.parse(raw) as Partial<PhiDataDragPayload>;
    if (typeof value.payloadType !== "string" || !value.payloadType.includes("/") ||
      typeof value.sourceObjectIdentity !== "string" || !value.sourceObjectIdentity.trim()) return null;
    return {
      payloadType: value.payloadType as `${string}/${string}`,
      sourceObjectIdentity: value.sourceObjectIdentity,
      ...(value.source ? { source: value.source } : {}),
    };
  } catch {
    return null;
  }
}
