"use client";

import NextImage from "next/image";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import type { PhiCmsAssetFocalRectWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/asset-focal-rect/config";
import type { PhiSignal, PhiSignalValue } from "../../types/signals";
import { findPhiSignalRoutesByCapabilityId } from "../../types/signals";
import { usePhiSignalListener } from "../runtime/runtime-signal-bus";
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../runtime/runtime-signal-identity";
import { PhiTagControl } from "../controls/phi-tag-control";
import {
  createDefaultFocalRect,
  focalRectToPercent,
  normalizeMediaFocalRect,
  resolveContainedImageBox,
  type MediaFocalRect,
} from "./focal-rect";
import { normalizePhiImagePreviewSelectionAsset } from "./phi-image-preview-data";
import {
  updatePhiImagePreviewAsset,
  usePhiImagePreviewStore,
} from "./phi-image-preview-store";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "./asset-controller-signals";

type FocalInteraction = {
  mode: "draw" | "move" | "resize";
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  startRect: MediaFocalRect;
  resizeEdges?: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean };
};

function clampRect(rect: MediaFocalRect) {
  const width = Math.max(0.02, Math.min(rect.width, 1));
  const height = Math.max(0.02, Math.min(rect.height, 1));
  return {
    x: Math.min(Math.max(rect.x, 0), 1 - width),
    y: Math.min(Math.max(rect.y, 0), 1 - height),
    width,
    height,
  };
}

function isPointInsideRect(point: { x: number; y: number }, rect: MediaFocalRect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height;
}

function resolveResizeEdges(point: { x: number; y: number }, rect: MediaFocalRect) {
  const outer = 0.012;
  const inner = 0.03;
  const horizontalBand = point.y >= rect.y && point.y <= rect.y + rect.height;
  const verticalBand = point.x >= rect.x && point.x <= rect.x + rect.width;
  const edges = {
    left: point.x >= rect.x - outer && point.x <= rect.x + inner && horizontalBand,
    right: point.x >= rect.x + rect.width - inner && point.x <= rect.x + rect.width + outer && horizontalBand,
    top: point.y >= rect.y - outer && point.y <= rect.y + inner && verticalBand,
    bottom: point.y >= rect.y + rect.height - inner && point.y <= rect.y + rect.height + outer && verticalBand,
  };
  return edges.left || edges.right || edges.top || edges.bottom ? edges : null;
}

function resolveResizeCursor(edges: NonNullable<FocalInteraction["resizeEdges"]>): CSSProperties["cursor"] {
  const horizontal = edges.left || edges.right;
  const vertical = edges.top || edges.bottom;
  if (horizontal && vertical) {
    return (edges.left && edges.top) || (edges.right && edges.bottom) ? "nwse-resize" : "nesw-resize";
  }
  return horizontal ? "ew-resize" : vertical ? "ns-resize" : "crosshair";
}

export function PhiAssetFocalRectWidget({
  config,
}: {
  config?: PhiCmsAssetFocalRectWidgetConfig | null;
}) {
  const state = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
  const selectedTile = state.selectedAsset ?? state.assets.find((asset) => asset.id === state.selectedAssetId) ?? null;
  const asset = useMemo(
    () => selectedTile ? normalizePhiImagePreviewSelectionAsset(selectedTile) : null,
    [selectedTile],
  );
  const currentRect = useMemo(
    () => normalizeMediaFocalRect(asset?.meta?.focalRect),
    [asset?.meta?.focalRect],
  );
  const [draft, setDraft] = useState<MediaFocalRect | null>(() => currentRect ?? createDefaultFocalRect());
  const originalRef = useRef<MediaFocalRect | null>(currentRect);
  const interactionRef = useRef<FocalInteraction | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const [frameNode, setFrameNode] = useState<HTMLDivElement | null>(null);
  const [frameBox, setFrameBox] = useState<{ width: number; height: number } | null>(null);
  const [cursor, setCursor] = useState<CSSProperties["cursor"]>("crosshair");
  const identity = usePhiSignalIdentity();
  const receiver = identity.receiver ?? (typeof identity.sender === "string" ? identity.sender : null);
  const emitSignal = usePhiSignalEmitter(identity.sender);
  const emitRoutes = useMemo(() => config?.signalRoutes?.emits ?? [], [config?.signalRoutes?.emits]);
  const listenRoutes = useMemo(() => config?.signalRoutes?.listens ?? [], [config?.signalRoutes?.listens]);

  useLayoutEffect(() => {
    if (!frameNode) return undefined;
    const update = () => {
      const bounds = frameNode.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) setFrameBox({ width: bounds.width, height: bounds.height });
    };
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(frameNode);
    return () => observer.disconnect();
  }, [frameNode]);

  const imageBox = frameBox && asset?.width && asset.height
    ? resolveContainedImageBox(frameBox.width, frameBox.height, asset.width, asset.height)
    : null;

  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue,
    correlationId: string,
  ) => {
    for (const route of findPhiSignalRoutesByCapabilityId(emitRoutes, capabilityId)) {
      if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) continue;
      emitSignal({
        scope: route.scope,
        channel: route.channel,
        action: route.action,
        value: route.valueType === "none" ? null : value,
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        receiver: route.receiver,
        correlationId,
      });
    }
  }, [emitRoutes, emitSignal]);

  const handleCommand = useCallback((signal: PhiSignal) => {
    if (signal.receiver !== receiver && signal.receiver !== "broadcast") return;
    const route = listenRoutes.find((candidate) =>
      candidate.capabilityId === "command" &&
      candidate.channel === signal.channel &&
      candidate.action === signal.action &&
      candidate.valueType === signal.valueType
    );
    if (!route || typeof signal.value !== "string") return;
    if (signal.value === "reset") {
      setDraft(originalRef.current ?? createDefaultFocalRect());
      return;
    }
    if (signal.value === "clear") {
      setDraft(null);
      return;
    }
    if (signal.value === "cancel") {
      setDraft(originalRef.current ?? createDefaultFocalRect());
      emitCapability("close", null, signal.correlationId);
      return;
    }
    if (signal.value !== "apply" || !asset) return;
    const next = normalizeMediaFocalRect(draft);
    updatePhiImagePreviewAsset(PHI_ASSET_CONTROLLER_STORE_KEY, asset.id, (current) => ({
      ...current,
      meta: { ...(current.meta ?? {}), focalRect: next },
    }));
    emitCapability("focalRectChange", { fieldKey: "focalRect", value: next }, signal.correlationId);
    emitCapability("close", null, signal.correlationId);
  }, [asset, draft, emitCapability, listenRoutes, receiver]);

  const signalFilter = useMemo(() => {
    if (listenRoutes.length === 0) return null;
    const schemas = Array.from(new Set(listenRoutes.flatMap((route) => route.valueSchema ? [route.valueSchema] : [])));
    return {
      scopes: Array.from(new Set(listenRoutes.map((route) => route.scope))),
      channels: Array.from(new Set(listenRoutes.map((route) => route.channel))),
      ...(schemas.length > 0 ? { valueSchemas: schemas } : null),
    };
  }, [listenRoutes]);
  usePhiSignalListener(handleCommand, signalFilter, receiver);

  function resolvePoint(event: PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return null;
    const imageBounds = image.getBoundingClientRect();
    if (imageBounds.width <= 0 || imageBounds.height <= 0) return null;
    if (event.clientX < imageBounds.left || event.clientY < imageBounds.top ||
      event.clientX > imageBounds.right || event.clientY > imageBounds.bottom) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - imageBounds.left) / imageBounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - imageBounds.top) / imageBounds.height)),
    };
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    const point = resolvePoint(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (draft) {
      const edges = resolveResizeEdges(point, draft);
      if (edges) {
        interactionRef.current = { mode: "resize", offsetX: 0, offsetY: 0, startX: draft.x, startY: draft.y, startRect: draft, resizeEdges: edges };
        return;
      }
      if (isPointInsideRect(point, draft)) {
        interactionRef.current = { mode: "move", offsetX: point.x - draft.x, offsetY: point.y - draft.y, startX: draft.x, startY: draft.y, startRect: draft };
        return;
      }
    }
    const initial = draft ?? createDefaultFocalRect();
    interactionRef.current = { mode: "draw", offsetX: 0, offsetY: 0, startX: point.x, startY: point.y, startRect: initial };
    setDraft({ x: point.x, y: point.y, width: 0.02, height: 0.02 });
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    const point = resolvePoint(event);
    if (!point) {
      if (!interaction) setCursor("not-allowed");
      return;
    }
    if (!interaction) {
      const edges = draft ? resolveResizeEdges(point, draft) : null;
      setCursor(edges ? resolveResizeCursor(edges) : draft && isPointInsideRect(point, draft) ? "move" : "crosshair");
      return;
    }
    event.preventDefault();
    if (interaction.mode === "move") {
      setCursor("move");
      setDraft(clampRect({
        x: point.x - interaction.offsetX,
        y: point.y - interaction.offsetY,
        width: interaction.startRect.width,
        height: interaction.startRect.height,
      }));
      return;
    }
    if (interaction.mode === "resize") {
      const edges = interaction.resizeEdges ?? {};
      const next = { ...interaction.startRect };
      if (edges.left) {
        const left = Math.min(point.x, interaction.startRect.x + interaction.startRect.width - 0.02);
        next.x = left;
        next.width = interaction.startRect.x + interaction.startRect.width - left;
      }
      if (edges.right) next.width = Math.max(0.02, point.x - interaction.startRect.x);
      if (edges.top) {
        const top = Math.min(point.y, interaction.startRect.y + interaction.startRect.height - 0.02);
        next.y = top;
        next.height = interaction.startRect.y + interaction.startRect.height - top;
      }
      if (edges.bottom) next.height = Math.max(0.02, point.y - interaction.startRect.y);
      setCursor(resolveResizeCursor(edges));
      setDraft(clampRect(next));
      return;
    }
    setDraft(clampRect({
      x: Math.min(interaction.startX, point.x),
      y: Math.min(interaction.startY, point.y),
      width: Math.abs(point.x - interaction.startX),
      height: Math.abs(point.y - interaction.startY),
    }));
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (interactionRef.current) event.preventDefault();
    interactionRef.current = null;
    setCursor("crosshair");
  }

  if (!asset || asset.width == null || asset.height == null) return null;

  return (
    <div
      ref={setFrameNode}
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100dvh - 240px)",
        maxHeight: "calc(100dvh - 240px)",
        minHeight: 240,
        overflow: "hidden",
        borderRadius: "var(--ant-border-radius-lg)",
        background: "var(--ant-color-fill-tertiary)",
      }}
    >
      <div
        ref={canvasRef}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        style={{ position: "absolute", inset: 0, cursor, touchAction: "none", userSelect: "none" }}
      >
        <div
          ref={imageRef}
          style={{
            position: "absolute",
            left: imageBox?.left ?? 0,
            top: imageBox?.top ?? 0,
            width: imageBox?.width ?? 0,
            height: imageBox?.height ?? 0,
            overflow: "hidden",
            visibility: imageBox ? "visible" : "hidden",
          }}
        >
          <NextImage
            alt={asset.altText ?? asset.title ?? asset.originalName}
            src={asset.deliveryUrl}
            fill
            unoptimized
            sizes="100vw"
            placeholder={asset.blurDataUrl ? "blur" : "empty"}
            blurDataURL={asset.blurDataUrl ?? undefined}
            style={{ objectFit: "fill" }}
            draggable={false}
          />
          {draft ? (
            <div
              style={{
                position: "absolute",
                left: `${draft.x * 100}%`,
                top: `${draft.y * 100}%`,
                width: `${draft.width * 100}%`,
                height: `${draft.height * 100}%`,
                border: "2px solid var(--ant-color-primary)",
                boxShadow: "0 0 0 1px var(--ant-color-bg-container) inset",
                background: "color-mix(in srgb, var(--ant-color-primary) 12%, transparent)",
                cursor,
              }}
            >
              <div style={{ position: "absolute", insetInlineStart: 8, top: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PhiTagControl color="blue">{`x ${focalRectToPercent(draft.x)}`}</PhiTagControl>
                <PhiTagControl color="blue">{`y ${focalRectToPercent(draft.y)}`}</PhiTagControl>
              </div>
              <div style={{ position: "absolute", insetInlineEnd: 8, bottom: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PhiTagControl color="blue">{`w ${focalRectToPercent(draft.width)}`}</PhiTagControl>
                <PhiTagControl color="blue">{`h ${focalRectToPercent(draft.height)}`}</PhiTagControl>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
