"use client";

import { isPhiRecord } from "../../helpers/is-record";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  type PhiSignal,
  type PhiSignalAction,
  type PhiSignalAddress,
  type PhiSignalRuntimeContext,
  type PhiSignalScope,
  type PhiSignalValue,
  type PhiSignalValueSchema,
  type PhiSignalValueType,
} from "../../types/signals";
import type {
  PhiRenderableBlock,
  PhiRenderableBlockCapabilities,
  PhiRenderableBlockRuntime,
  PhiRenderableBlockSize,
  PhiRenderableBlockVisibility,
} from "../../types/renderable-block";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import { readPhiSurface, type PhiSurface } from "../../types/surface";
import { normalizeRenderableBlockAnchor } from "../../helpers/renderable-block-anchor";
import {
  normalizePhiRenderableBlockCapabilities,
  normalizePhiRenderableBlockResponsiveSize,
  normalizePhiRenderableBlockRuntime,
  stripPhiRenderableBlockSize,
} from "../../helpers/renderable-block-normalizers";
import {
  inferPhiSignalValueType,
  usePhiSignalDispatcher,
  usePhiSignalListener,
  type PhiSignalFilter,
} from "./runtime-signal-bus";
import { registerPhiSignalInstance } from "./runtime-signal-registry";
import { usePhiSignalRuntimePartition } from "./runtime-signal-partition";

function resolvePhiRenderableBlockValueSchema(
  channel: PhiRenderableBlockSignalChannel,
  valueType: PhiSignalValueType,
): PhiSignalValueSchema | null {
  if (valueType !== "json") {
    return null;
  }

  if (channel === "background") {
    return PHI_SIGNAL_VALUE_SCHEMAS.backgroundConfig;
  }
  if (channel === "border") {
    return PHI_SIGNAL_VALUE_SCHEMAS.borderConfig;
  }

  return null;
}

type PhiRenderableBlockSignalChannel =
  | "visibility"
  | "enabled"
  | "background"
  | "border"
  | "selected"
  | "hovered"
  | "dragging"
  | "focused"
  | "active"
  | "layout"
  | "size"
  | "minSize"
  | "maxSize"
  | "shadow"
  | "zIndex"
  | "opacity"
  | "effects"
  | "text"
  | "content"
  | "html"
  | "markdown"
  | "markdownToc"
  | "descriptionConfig"
  | "icon"
  | "imageConfig"
  | "color"
  | "textColor"
  | "style"
  | "fontFamily"
  | "fontSize"
  | "textStyle"
  | "drag"
  | "drop"
  | "flush";

function isPhiRenderableBlockSignalChannel(channel: string): channel is PhiRenderableBlockSignalChannel {
  return (
    channel === "visibility" ||
    channel === "enabled" ||
    channel === "background" ||
    channel === "border" ||
    channel === "selected" ||
    channel === "hovered" ||
    channel === "dragging" ||
    channel === "focused" ||
    channel === "active" ||
    channel === "layout" ||
    channel === "size" ||
    channel === "minSize" ||
    channel === "maxSize" ||
    channel === "shadow" ||
    channel === "zIndex" ||
    channel === "opacity" ||
    channel === "effects" ||
    channel === "text" ||
    channel === "content" ||
    channel === "html" ||
    channel === "markdown" ||
    channel === "markdownToc" ||
    channel === "descriptionConfig" ||
    channel === "icon" ||
    channel === "imageConfig" ||
    channel === "color" ||
    channel === "textColor" ||
    channel === "style" ||
    channel === "fontFamily" ||
    channel === "fontSize" ||
    channel === "textStyle" ||
    channel === "drag" ||
    channel === "drop" ||
    channel === "flush"
  );
}

type PhiRenderableBlockSignal = PhiSignal;

export type PhiRenderableBlockReceiver = Extract<
  PhiSignalAddress,
  `cms:${string}` | `region:${string}`
>;

export type PhiRenderableBlockReceiverKind = "widget" | "layout" | "region";

export function createPhiRenderableBlockReceiver(
  kind: "region",
  id: string | null | undefined,
): PhiRenderableBlockReceiver | null;
export function createPhiRenderableBlockReceiver(
  kind: Exclude<PhiRenderableBlockReceiverKind, "region">,
  id: PhiCmsInstanceId | null | undefined,
): PhiRenderableBlockReceiver | null;
export function createPhiRenderableBlockReceiver(
  kind: PhiRenderableBlockReceiverKind,
  id: PhiCmsInstanceId | string | null | undefined,
): PhiRenderableBlockReceiver | null {
  if (id == null) {
    return null;
  }
  return createPhiSignalAddress(kind === "region" ? "region" : "cms", id) as PhiRenderableBlockReceiver;
}

function resolvePhiRenderableBlockReceiverScope(
  receiver: PhiRenderableBlockReceiver | null | undefined,
  explicitScope?: PhiSignalScope | null,
): PhiSignalScope {
  if (explicitScope) {
    return explicitScope;
  }
  if (receiver?.startsWith("region:")) {
    return "region";
  }
  return "widget";
}

function resolvePhiRenderableBlockSignalScope(
  receiver: PhiRenderableBlockReceiver | null | undefined,
  explicitScope?: PhiSignalScope | null,
): PhiSignalScope {
  return receiver == null
    ? explicitScope ?? "widget"
    : resolvePhiRenderableBlockReceiverScope(receiver, explicitScope);
}

function resolvePhiRenderableBlockRuntimeValue(
  blockId: PhiCmsInstanceId | null | undefined,
  value: PhiRenderableBlockRuntime | null | undefined,
) {
  const normalized = normalizePhiRenderableBlockRuntime(value);

  if (normalized) {
    return {
      ...normalized,
      ...(blockId == null ? {} : { blockId }),
    } as PhiRenderableBlockRuntime;
  }

  return blockId == null ? undefined : ({ blockId } as PhiRenderableBlockRuntime);
}

function applyPhiRenderableBlockRuntimePatch(
  current: PhiRenderableBlockRuntime | undefined,
  patch: Partial<PhiRenderableBlockRuntime>,
) {
  const next = {
    ...(current ?? {}),
    ...patch,
  } satisfies PhiRenderableBlockRuntime;

  return normalizePhiRenderableBlockRuntime(next) ?? next;
}

function patchPhiRenderableBlockSurface(
  current: PhiSurface | undefined,
  patch: Record<string, unknown>,
): PhiSurface | undefined {
  return readPhiSurface({ ...(current ?? {}), ...patch }) ?? undefined;
}

function canUseRenderableBlockCapability(
  state: PhiRenderableBlockRuntimeState,
  capability: keyof NonNullable<PhiRenderableBlockRuntimeState["capabilities"]>,
) {
  return state.capabilities?.[capability] !== false;
}

export function applyPhiRenderableBlockSignal(
  current: PhiRenderableBlockRuntimeState,
  channel: PhiRenderableBlockSignalChannel,
  action: PhiSignalAction,
  value: PhiSignalValue,
): PhiRenderableBlockRuntimeState {
  if (channel === "visibility") {
    if (action === "toggle") {
      return {
        ...current,
        visibility: current.visibility === "visible" ? "hidden" : "visible",
      };
    }

    const nextVisibility =
      value === "visible" || value === "collapsed" || value === "hidden"
        ? value
        : undefined;
    return nextVisibility ? { ...current, visibility: nextVisibility } : current;
  }

  if (channel === "enabled") {
    if (action === "toggle") {
      return { ...current, enabled: !(current.enabled ?? true) };
    }

    return { ...current, enabled: typeof value === "boolean" ? value : true };
  }

  /*
   * A Signal for one part of the Surface replaces that part and leaves the others as they stand; `null`
   * takes the part away. The Surface is read again afterwards, so a value no part reads changes nothing.
   */
  if (channel === "background" || channel === "border") {
    if (value != null && (!isPhiRecord(value))) {
      return current;
    }
    // A line sent by Signal is drawn as sent, whatever source the stored Surface names for its edge.
    const patch = channel === "border" && value != null
      ? { border: value, borderSource: "custom" }
      : { [channel]: value };
    return { ...current, surface: patchPhiRenderableBlockSurface(current.surface, patch) };
  }

  if (
    channel === "selected" ||
    channel === "hovered" ||
    channel === "dragging" ||
    channel === "focused" ||
    channel === "active"
  ) {
    const runtimeKey = channel;
    if (!runtimeKey) {
      return current;
    }
    return {
      ...current,
      runtime: applyPhiRenderableBlockRuntimePatch(current.runtime, {
        [runtimeKey]: typeof value === "boolean" ? value : true,
      }),
    };
  }

  if (channel === "shadow") {
    return { ...current, surface: patchPhiRenderableBlockSurface(current.surface, { shadow: value }) };
  }

  if (channel === "zIndex") {
    return { ...current, zIndex: typeof value === "number" ? value : current.zIndex };
  }

  if (channel === "opacity") {
    const nextOpacity =
      typeof value === "number" && Number.isFinite(value)
        ? Math.min(1, Math.max(0, value))
        : current.opacity;
    return { ...current, opacity: nextOpacity };
  }

  if (channel === "effects") {
    if (action === "start") {
      return { ...current, effectsState: "running" };
    }
    if (action === "stop") {
      return { ...current, effectsState: "idle" };
    }
    if (action === "clear") {
      return { ...current, effects: undefined, effectsState: undefined };
    }
    return current;
  }

  if (channel === "size" || channel === "minSize" || channel === "maxSize") {
    const sizeKey =
      channel === "size" ? "size" :
      channel === "minSize" ? "minSize" :
      "maxSize";
    const nextSize = normalizePhiRenderableBlockResponsiveSize(value);
    return nextSize ? { ...current, [sizeKey]: nextSize } : current;
  }

  return current;
}

export function emitPhiRenderableBlockSignal(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  channel: PhiRenderableBlockSignalChannel,
  receiver: PhiRenderableBlockReceiver | null | undefined,
  action: PhiSignalAction,
  value: PhiSignalValue = null,
  valueType?: PhiSignalValueType,
  signalScope?: PhiSignalScope | null,
) {
  const resolvedValueType = valueType ?? inferPhiSignalValueType(value);

  dispatchSignal({
    scope: resolvePhiRenderableBlockSignalScope(receiver, signalScope),
    channel,
    action,
    value,
    valueType: resolvedValueType,
    valueSchema: resolvePhiRenderableBlockValueSchema(channel, resolvedValueType),
    sender: receiver ?? null,
    receiver: receiver ?? null,
    timestamp: Date.now(),
  });
}

export function usePhiRenderableBlockSignalListener(
  receiver: PhiRenderableBlockReceiver | null | undefined,
  handler: (signal: PhiRenderableBlockSignal) => void,
  context?: PhiSignalRuntimeContext,
  signalScope?: PhiSignalScope | null,
) {
  const signalPartition = usePhiSignalRuntimePartition();
  const signalFilter = useMemo<PhiSignalFilter | undefined>(
    () =>
      receiver == null
        ? undefined
        : {
            scopes: [resolvePhiRenderableBlockReceiverScope(receiver, signalScope)],
            context,
          },
    [context, receiver, signalScope],
  );
  const listener = useCallback(
    (signal: PhiSignal) => {
      if (!isPhiRenderableBlockSignalChannel(signal.channel)) {
        return;
      }

      if (receiver == null || (signal.receiver != null && signal.receiver !== receiver)) {
        return;
      }

      handler(signal as PhiRenderableBlockSignal);
    },
    [handler, receiver],
  );

  useEffect(() => {
    if (!receiver) {
      return undefined;
    }

    return registerPhiSignalInstance(signalPartition, {
      address: receiver,
      scope: resolvePhiRenderableBlockReceiverScope(receiver, signalScope),
      context,
    });
  }, [context, receiver, signalPartition, signalScope]);

  usePhiSignalListener(listener, signalFilter);
}

export type PhiRenderableBlockRuntimeState = PhiRenderableBlock & {
  capabilities?: PhiRenderableBlockCapabilities;
  runtime?: PhiRenderableBlockRuntime;
  blockId: PhiCmsInstanceId | null;
  receiver: PhiRenderableBlockReceiver | null;
  signalScope: PhiSignalScope | null;
  effectsState?: "idle" | "running";
};

export type PhiRenderableBlockRuntimeController = {
  state: PhiRenderableBlockRuntimeState;
  setVisibility: (nextVisibility: PhiRenderableBlockVisibility) => void;
  setEnabled: (nextEnabled: boolean) => void;
  setSize: (nextSize: PhiRenderableBlockSize | null | undefined) => void;
  setMinSize: (nextSize: PhiRenderableBlockSize | null | undefined) => void;
  setMaxSize: (nextSize: PhiRenderableBlockSize | null | undefined) => void;
  setZIndex: (nextZIndex: number) => void;
  setOpacity: (nextOpacity: number) => void;
  setSelected: (nextSelected: boolean) => void;
  setHovered: (nextHovered: boolean) => void;
  setDragging: (nextDragging: boolean) => void;
  setFocused: (nextFocused: boolean) => void;
  setActive: (nextActive: boolean) => void;
  expand: () => void;
  collapse: () => void;
  show: () => void;
  hide: () => void;
  toggle: () => void;
};

function resolvePhiRenderableBlockRuntimeState(
  input: Partial<PhiRenderableBlockRuntimeState>,
): PhiRenderableBlockRuntimeState {
  return {
    blockId: input.blockId ?? null,
    receiver: input.receiver ?? null,
    signalScope: input.signalScope ?? null,
    renderMode: input.renderMode ?? "live",
    visibility: input.visibility ?? "visible",
    enabled: input.enabled ?? true,
    debugMode: input.debugMode ?? false,
    anchor: normalizeRenderableBlockAnchor(input.anchor) ?? undefined,
    zIndex: input.zIndex ?? 0,
    opacity: input.opacity ?? 1,
    className: input.className,
    size: stripPhiRenderableBlockSize(input.size),
    minSize: stripPhiRenderableBlockSize(input.minSize),
    maxSize: stripPhiRenderableBlockSize(input.maxSize),
    collapsedSizeHint: stripPhiRenderableBlockSize(input.collapsedSizeHint),
    capabilities: normalizePhiRenderableBlockCapabilities(input.capabilities),
    surface: input.surface ?? undefined,
    effects: input.effects ?? undefined,
    effectsState: input.effectsState,
    runtime: resolvePhiRenderableBlockRuntimeValue(input.blockId, input.runtime),
  };
}

type PhiRenderableBlockRuntimeOverrides = Partial<
  Omit<PhiRenderableBlockRuntimeState, "blockId" | "receiver" | "signalScope">
>;

function mergePhiRenderableBlockRuntimeState(
  baseState: PhiRenderableBlockRuntimeState,
  overrides: PhiRenderableBlockRuntimeOverrides | null | undefined,
): PhiRenderableBlockRuntimeState {
  if (!overrides) {
    return baseState;
  }

  return {
    ...baseState,
    ...overrides,
    blockId: baseState.blockId,
    receiver: baseState.receiver,
    signalScope: baseState.signalScope,
    runtime: overrides.runtime
      ? {
          ...(baseState.runtime ?? {}),
          ...overrides.runtime,
        }
      : baseState.runtime,
  };
}

function resolvePhiRenderableBlockSignalOverrides(
  current: PhiRenderableBlockRuntimeState,
  channel: PhiRenderableBlockSignalChannel,
  action: PhiSignalAction,
  value: PhiSignalValue,
): PhiRenderableBlockRuntimeOverrides | null {
  const next = applyPhiRenderableBlockSignal(current, channel, action, value);
  if (next === current) {
    return null;
  }

  if (channel === "visibility") {
    return { visibility: next.visibility };
  }

  if (channel === "enabled") {
    return { enabled: next.enabled };
  }

  if (
    channel === "selected" ||
    channel === "hovered" ||
    channel === "dragging" ||
    channel === "focused" ||
    channel === "active"
  ) {
    return { runtime: next.runtime };
  }

  if (channel === "background" || channel === "border" || channel === "shadow") {
    return { surface: next.surface };
  }

  if (channel === "zIndex") {
    return { zIndex: next.zIndex };
  }

  if (channel === "opacity") {
    return { opacity: next.opacity };
  }

  if (channel === "effects") {
    return {
      effects: next.effects,
      effectsState: next.effectsState,
    };
  }

  if (channel === "size") {
    return { size: next.size };
  }

  if (channel === "minSize") {
    return { minSize: next.minSize };
  }

  if (channel === "maxSize") {
    return { maxSize: next.maxSize };
  }

  return null;
}

export function usePhiRenderableBlockRuntime(
  input: Partial<PhiRenderableBlockRuntimeState> = {},
): PhiRenderableBlockRuntimeController {
  const dispatchSignal = usePhiSignalDispatcher();
  const blockId = input.blockId ?? null;
  const receiver = input.receiver ?? null;
  const signalScope = input.signalScope ?? null;
  const [runtimeOverrideState, setRuntimeOverrideState] = useState<{
    blockId: PhiCmsInstanceId | null;
    overrides: PhiRenderableBlockRuntimeOverrides;
  }>({ blockId, overrides: {} });
  const baseState = resolvePhiRenderableBlockRuntimeState(input);
  const state = mergePhiRenderableBlockRuntimeState(
    baseState,
    runtimeOverrideState.blockId === blockId ? runtimeOverrideState.overrides : null,
  );
  const signalRuntimeContext = useMemo<PhiSignalRuntimeContext>(
    () => ({
      siteKey: input.runtime?.siteKey ?? null,
      area: input.runtime?.area ?? null,
      pageKey: input.runtime?.pageKey ?? null,
      regionKey: input.runtime?.regionKey ?? null,
    }),
    [
      input.runtime?.siteKey,
      input.runtime?.area,
      input.runtime?.pageKey,
      input.runtime?.regionKey,
    ],
  );
  const applyRuntimeSignalOverride = useCallback(
    (
      channel: PhiRenderableBlockSignalChannel,
      action: PhiSignalAction,
      value: PhiSignalValue,
    ) => {
      setRuntimeOverrideState((currentOverrideState) => {
        const currentOverrides =
          currentOverrideState.blockId === blockId ? currentOverrideState.overrides : {};
        const currentState = mergePhiRenderableBlockRuntimeState(baseState, currentOverrides);
        const nextOverrides = resolvePhiRenderableBlockSignalOverrides(
          currentState,
          channel,
          action,
          value,
        );

        if (!nextOverrides) {
          return currentOverrideState.blockId === blockId
            ? currentOverrideState
            : { blockId, overrides: currentOverrides };
        }

        return {
          blockId,
          overrides: {
            ...currentOverrides,
            ...nextOverrides,
          },
        };
      });
    },
    [baseState, blockId],
  );

  const handleRenderableBlockSignal = useCallback(
    (signal: PhiRenderableBlockSignal) => {
      applyRuntimeSignalOverride(
        signal.channel as PhiRenderableBlockSignalChannel,
        signal.action,
        signal.value,
      );
    },
    [applyRuntimeSignalOverride],
  );

  usePhiRenderableBlockSignalListener(
    receiver,
    handleRenderableBlockSignal,
    signalRuntimeContext,
    signalScope,
  );

  const emit = useCallback(
    (
      channel: PhiRenderableBlockSignalChannel,
      action: PhiSignalAction,
      value: PhiSignalValue = null,
      valueType?: PhiSignalValueType,
    ) => {
      if (receiver == null) {
        applyRuntimeSignalOverride(channel, action, value);
        return;
      }

      emitPhiRenderableBlockSignal(dispatchSignal, channel, receiver, action, value, valueType, signalScope);
    },
    [applyRuntimeSignalOverride, dispatchSignal, receiver, signalScope],
  );

  const emitCommand = useCallback(
    (
      action: PhiSignalAction,
      value: PhiSignalValue = null,
      valueType?: PhiSignalValueType,
      channel: PhiRenderableBlockSignalChannel = "visibility",
    ) => {
      if (receiver == null) {
        applyRuntimeSignalOverride(channel, action, value);
        return;
      }

      emitPhiRenderableBlockSignal(dispatchSignal, channel, receiver, action, value, valueType, signalScope);
    },
    [applyRuntimeSignalOverride, dispatchSignal, receiver, signalScope],
  );

  return useMemo(
    () => ({
      state,
      setVisibility: (nextVisibility) =>
        emitCommand("change", nextVisibility, "enum", "visibility"),
      setEnabled: (nextEnabled) =>
        emitCommand("change", nextEnabled, "boolean", "enabled"),
      setSize: (nextSize) => emitCommand("change", nextSize ?? null, "size", "size"),
      setMinSize: (nextSize) => emitCommand("change", nextSize ?? null, "size", "minSize"),
      setMaxSize: (nextSize) => emitCommand("change", nextSize ?? null, "size", "maxSize"),
      setZIndex: (nextZIndex) => emitCommand("change", nextZIndex, "number", "zIndex"),
      setOpacity: (nextOpacity) =>
        emitCommand("change", Math.min(1, Math.max(0, nextOpacity)), "number", "opacity"),
      setSelected: (nextSelected: boolean) => {
        if (!canUseRenderableBlockCapability(state, "selectable")) {
          return;
        }
        emit("selected", "change", nextSelected, "boolean");
      },
      setHovered: (nextHovered: boolean) => {
        if (!canUseRenderableBlockCapability(state, "hoverable")) {
          return;
        }
        emit("hovered", "change", nextHovered, "boolean");
      },
      setDragging: (nextDragging: boolean) => {
        if (!canUseRenderableBlockCapability(state, "draggable")) {
          return;
        }
        emit("dragging", "change", nextDragging, "boolean");
      },
      setFocused: (nextFocused: boolean) => {
        if (!canUseRenderableBlockCapability(state, "focusable")) {
          return;
        }
        emit("focused", "change", nextFocused, "boolean");
      },
      setActive: (nextActive: boolean) => {
        if (!canUseRenderableBlockCapability(state, "activatable")) {
          return;
        }
        emit("active", "change", nextActive, "boolean");
      },
      expand: () => emitCommand("change", "visible", "enum", "visibility"),
      collapse: () => emitCommand("change", "collapsed", "enum", "visibility"),
      show: () => emitCommand("change", "visible", "enum", "visibility"),
      hide: () => emitCommand("change", "hidden", "enum", "visibility"),
      toggle: () =>
        emitCommand("toggle", null, "none", "visibility"),
    }),
    [emit, emitCommand, state],
  );
}
