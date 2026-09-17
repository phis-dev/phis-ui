"use client";

import type { ReactNode } from "react";

import type { PhiRenderableBlock } from "../../types";
import {
  resolveRenderableBlockEffectsAttributes,
  resolveRenderableBlockViewportEffects,
} from "../../helpers/renderable-block-effects";
import { PhiEffectsReadyTrigger } from "./phi-effects-ready-trigger";
import { PhiSlotChildEffectsVisibilityObserver } from "./phi-slot-child-effects-visibility-observer";
import { PhiSlotChildViewportEffectsObserver } from "./phi-slot-child-viewport-effects-observer";
import {
  createPhiRenderableBlockReceiver,
  usePhiRenderableBlockRuntime,
} from "../../components/runtime/renderable-block-runtime";
import {
  PhiRuntimeSignalEmissionBoundary,
  PhiSignalIdentityProvider,
} from "../../components/runtime/runtime-signal-identity";
import {
  PhiSlotChildFrameView,
  type PhiSlotChildFrameViewProps,
} from "./phi-slot-child-frame-view";
import type { PhiSlotChildFrameProps } from "./phi-slot-child-frame";

export function PhiSlotChildFrameClient({
  kind,
  blockId,
  config,
  runtime,
  signalScope,
  runtimeSignalEmissionsEnabled = true,
  chrome,
  children,
  ...viewProps
}: PhiSlotChildFrameProps) {
  const receiver = createPhiRenderableBlockReceiver(
    kind === "widget" ? "widget" : "layout",
    blockId,
  );
  const resolvedSignalScope = signalScope ?? (kind === "widget" ? "widget" : "layout");
  const blockRuntime = usePhiRenderableBlockRuntime({
    blockId,
    receiver,
    renderMode: config?.renderMode,
    visibility: config?.visibility,
    enabled: config?.enabled,
    debugMode: config?.debugMode,
    anchor: config?.anchor,
    zIndex: config?.zIndex,
    className: config?.className,
    size: config?.size,
    minSize: config?.minSize,
    maxSize: config?.maxSize,
    collapsedSizeHint: config?.collapsedSizeHint,
    background: config?.background,
    border: config?.border,
    shadow: config?.shadow,
    opacity: config?.opacity,
    effects: config?.effects,
    capabilities: config?.capabilities,
    runtime,
    signalScope: resolvedSignalScope,
  });
  const resolvedVisibility = blockRuntime.state.visibility ?? "visible";
  const resolvedEnabled = blockRuntime.state.enabled ?? true;
  const resolvedSize =
    resolvedVisibility === "collapsed"
      ? blockRuntime.state.collapsedSizeHint ?? blockRuntime.state.size
      : blockRuntime.state.size;
  const resolvedConfig: Partial<PhiRenderableBlock> = {
    ...config,
    visibility: resolvedVisibility,
    enabled: resolvedEnabled,
    renderMode: blockRuntime.state.renderMode,
    debugMode: blockRuntime.state.debugMode,
    className: blockRuntime.state.className,
    size: resolvedSize,
    minSize: blockRuntime.state.minSize,
    maxSize: blockRuntime.state.maxSize,
    collapsedSizeHint: blockRuntime.state.collapsedSizeHint,
    background: blockRuntime.state.background,
    border: blockRuntime.state.border,
    shadow: blockRuntime.state.shadow,
    zIndex: blockRuntime.state.zIndex,
    opacity: blockRuntime.state.opacity,
    effects: blockRuntime.state.effects,
    capabilities: blockRuntime.state.capabilities,
  };
  const effectsAttributes = viewProps.disableEffects
    ? undefined
    : resolveRenderableBlockEffectsAttributes(resolvedConfig);
  const viewportEffects = viewProps.disableEffects
    ? []
    : resolveRenderableBlockViewportEffects(resolvedConfig);
  const effectsTrigger = effectsAttributes?.["data-phi-effects-trigger"];
  const shouldObserveVisibility = effectsTrigger === "on_visible";
  const shouldWaitForReady = effectsTrigger === "on_ready";

  const enhancedChildren = (
    <PhiSignalIdentityProvider
      value={{
        sender: receiver,
        receiver,
        scope: resolvedSignalScope,
      }}
    >
      <PhiRuntimeSignalEmissionBoundary enabled={runtimeSignalEmissionsEnabled}>
        {children}
      </PhiRuntimeSignalEmissionBoundary>
      {chrome}
      {shouldObserveVisibility ? (
        <PhiSlotChildEffectsVisibilityObserver
          once={effectsAttributes?.["data-phi-effects-once"] !== "false"}
        />
      ) : null}
      {shouldWaitForReady ? <PhiEffectsReadyTrigger /> : null}
      {viewportEffects.length > 0 ? (
        <PhiSlotChildViewportEffectsObserver effects={viewportEffects} />
      ) : null}
    </PhiSignalIdentityProvider>
  );

  return (
    <PhiSlotChildFrameView
      {...viewProps as Omit<PhiSlotChildFrameViewProps, "children">}
      kind={kind}
      blockId={blockId}
      receiver={receiver}
      config={resolvedConfig}
      effectsState={blockRuntime.state.effectsState}
    >
      {enhancedChildren as ReactNode}
    </PhiSlotChildFrameView>
  );
}
