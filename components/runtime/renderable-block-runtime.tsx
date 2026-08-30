"use client";

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
  PhiRenderableBlockBase,
  PhiRenderableBlockCapabilities,
  PhiRenderableBlockInteractionState,
  PhiRenderableBlockRuntime,
  PhiRenderableBlockRuntimeContext,
  PhiRenderableBlockSize,
  PhiRenderableBlockVisibility,
} from "../../types/renderable-block";
import type { PhiBlockRuntime } from "../../types/widget-runtime";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import { readPhiShadow } from "../../types/layout-style";
import {
  mergeRenderableBlockDefaults,
  normalizeRenderableBlockAnchor,
} from "../../helpers/renderable-block-serialization";
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

function normalizePhiRenderableBlockSize(value: PhiRenderableBlockSize | null | undefined) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const width = value.width ?? undefined;
  const height = value.height ?? undefined;

  if (width == null && height == null) {
    return undefined;
  }

  return {
    ...(width == null ? {} : { width }),
    ...(height == null ? {} : { height }),
  };
}

function normalizePhiRenderableBlockCapabilities(
  value: PhiRenderableBlockCapabilities | null | undefined,
) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const next: PhiRenderableBlockCapabilities = {};
  let hasValue = false;
  for (const key of ["selectable", "draggable", "hoverable", "activatable", "focusable", "droppable"] as const) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      next[key] = candidate;
      hasValue = true;
    }
  }

  return hasValue ? next : undefined;
}

function normalizePhiRenderableBlockRuntimeContext(value: PhiRenderableBlockRuntimeContext | null | undefined) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const next: PhiRenderableBlockRuntimeContext = {};
  let hasValue = false;

  if (typeof value.siteKey === "string" || value.siteKey === null) {
    next.siteKey = value.siteKey;
    hasValue = true;
  }
  if (typeof value.publicUrl === "string" || value.publicUrl === null) {
    next.publicUrl = value.publicUrl;
    hasValue = true;
  }
  if (typeof value.defaultLang === "string" || value.defaultLang === null) {
    next.defaultLang = value.defaultLang;
    hasValue = true;
  }
  if (typeof value.area === "string" || value.area === null) {
    next.area = value.area;
    hasValue = true;
  }
  if (typeof value.pageKey === "string" || value.pageKey === null) {
    next.pageKey = value.pageKey;
    hasValue = true;
  }
  if (typeof value.regionKey === "string" || value.regionKey === null) {
    next.regionKey = value.regionKey;
    hasValue = true;
  }
  if (typeof value.blockId === "string" || typeof value.blockId === "number" || value.blockId === null) {
    next.blockId = value.blockId;
    hasValue = true;
  }

  return hasValue ? next : undefined;
}

function normalizePhiRenderableBlockInteractionState(
  value: PhiRenderableBlockInteractionState | null | undefined,
) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const next: PhiRenderableBlockInteractionState = {};
  let hasValue = false;

  for (const key of ["selected", "hovered", "dragging", "focused", "active"] as const) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      next[key] = candidate;
      hasValue = true;
    }
  }

  return hasValue ? next : undefined;
}

function normalizePhiRenderableBlockRuntime(value: PhiRenderableBlockRuntime | null | undefined) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const context = normalizePhiRenderableBlockRuntimeContext(value);
  const interaction = normalizePhiRenderableBlockInteractionState(value);
  if (!context && !interaction) {
    return undefined;
  }

  return {
    ...context,
    ...interaction,
  };
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

function canUseRenderableBlockCapability(
  state: PhiRenderableBlockRuntimeState,
  capability: keyof NonNullable<PhiRenderableBlockRuntimeState["capabilities"]>,
) {
  return state.capabilities?.[capability] !== false;
}

function applyPhiRenderableBlockSignal(
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

  if (channel === "background" || channel === "border") {
    if (value == null) {
      return { ...current, [channel]: null };
    }

    return typeof value === "object" && !Array.isArray(value)
      ? { ...current, [channel]: value }
      : current;
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
    return { ...current, shadow: readPhiShadow(value) };
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
    const nextSize = normalizePhiRenderableBlockSize(value as PhiRenderableBlockSize | null | undefined);
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

export type PhiRenderableWidgetRuntimeInput<TConfig extends Record<string, unknown> = Record<string, unknown>> = {
  blockId: PhiCmsInstanceId | null | undefined;
  receiver?: PhiRenderableBlockReceiver | null | undefined;
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area">;
  config?: TConfig | null;
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
    effect: input.effect,
    className: input.className,
    size: normalizePhiRenderableBlockSize(input.size),
    minSize: normalizePhiRenderableBlockSize(input.minSize),
    maxSize: normalizePhiRenderableBlockSize(input.maxSize),
    collapsedSizeHint: normalizePhiRenderableBlockSize(input.collapsedSizeHint),
    capabilities: normalizePhiRenderableBlockCapabilities(input.capabilities),
    background: input.background ?? undefined,
    border: input.border ?? undefined,
    shadow: input.shadow ?? undefined,
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

  if (channel === "shadow") {
    return { shadow: next.shadow };
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

function resolvePhiRenderableWidgetRuntimeInput<TConfig extends Record<string, unknown> = Record<string, unknown>>(
  input: PhiRenderableWidgetRuntimeInput<TConfig>,
): Partial<PhiRenderableBlockRuntimeState> {
  const normalizedConfig = mergeRenderableBlockDefaults(input.config as Partial<PhiRenderableBlockBase> | null | undefined);

  return {
    blockId: input.blockId ?? null,
    receiver: input.receiver ?? null,
    runtime: {
      siteKey: input.runtime.site.key,
      publicUrl: input.runtime.site.publicUrl ?? null,
      defaultLang: input.runtime.locale.current,
      area: input.runtime.area,
    },
    ...normalizedConfig,
  };
}

export function usePhiRenderableWidgetRuntime<TConfig extends Record<string, unknown> = Record<string, unknown>>(
  input: PhiRenderableWidgetRuntimeInput<TConfig>,
): PhiRenderableBlockRuntimeController {
  return usePhiRenderableBlockRuntime(resolvePhiRenderableWidgetRuntimeInput(input));
}
