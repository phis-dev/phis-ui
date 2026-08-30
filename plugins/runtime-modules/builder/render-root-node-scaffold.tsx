"use client";

import { cloneElement, isValidElement, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { NodeIndexOutlined, ShareAltOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, theme as antdTheme } from "antd";

import { PhiEditScaffoldDrawer } from "./edit-scaffold-drawer";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode, PhiResolvedCmsRenderableTree } from "../../../types/cms";
import { comparePhiCmsInstanceIds, type PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiCmsBorderWidgetConfig } from "../../../types/cms-config";
import { normalizePhiPaddingWidgetConfig } from "../../../types/cms-config";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import {
  resolvePhiBackgroundWidgetStyle,
  type PhiCmsBackgroundWidgetConfig,
} from "../../../components/widgets/config/background";
import type { PhiCmsGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import { resolvePhiBorderWidgetStyle } from "../../../helpers/border-widget-style";
import { resolvePhiAnchorPlacement } from "../../../components/layouts/phi-layout-contract";
import { PhiSlotChildFrame } from "../../../plugins/runtime/phi-slot-child-frame";
import {
  PhiLayoutDeleteButtonOverlay,
  PhiLayoutDragButtonOverlay,
  PhiLayoutPlusButtonOverlay,
} from "./clients/layout-scaffold-overlays";
import {
  PhiPlusButtonWidget,
} from "./clients/layout-scaffold-buttons";
import {
  usePhiStructureDroppable,
  type PhiStructureDragData,
  type PhiStructureDropTargetData,
} from "./structure-dnd";
import { PhiInlineTextEditor } from "./clients/inline-text-editor";
import {
  usePhiAuthoringLayoutDefinition,
  usePhiRuntimeModuleAuthoringRegistration,
  type PhiAuthoringLayoutDefinition,
} from "../../../plugins/runtime-modules/client-authoring-module";
import { usePhiRuntimeModuleState } from "../../../components/runtime/runtime-module-context";
import { PhiCmsRenderDiagnostic } from "../../../components/cms/phi-cms-render-diagnostic";
import { PhiCmsRenderErrorBoundary } from "../../../components/cms/phi-cms-render-error-boundary";
import { isPhiAnchorWidgetPlacement, type PhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";
import type { PhiEffectsWidgetLabels } from "../../../components/widgets/label-types/effects";
import type {
  PhiCmsBuilderWidgetEditorInteraction,
  PhiCmsBuilderWidgetPlugin,
  PhiCmsWidgetAuthoringCanvas,
  PhiCmsWidgetAuthoringContext,
  PhiCmsLayoutPlugin,
  PhiRenderableBlockRenderMode,
  PhiRuntimeModuleClientWidgetDefinition,
} from "../../../types";
import type { PhiRenderableBlockBase, PhiRenderableBlockEffects, PhiSlotSizePolicy } from "../../../types";
import { readPhiShadow, type PhiShadow } from "../../../types/layout-style";
import { combinePhiBoxShadows, resolvePhiShadow } from "../../../helpers/layout-style";
import {
  PHI_VIEWER_ACCESS_ANYONE,
  intersectPhiInheritedViewportFlags,
} from "../../../types/access";
import type { PhiBuilderRootNodeDraft } from "./root-node-normalization";
import { mergeRenderableBlockDefaults } from "../../../helpers/renderable-block-serialization";
import { PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION } from "../../../helpers/renderable-block-defaults";
import { PhiWidgetEffectsToolButton } from "./clients/widget-effects-editor";
import {
  PHI_WIDGET_SCAFFOLD_POPUP_CLASS_NAME,
  PhiWidgetScaffoldPopupProvider,
} from "../../../components/widgets/client/shared/phi-widget-scaffold-popup";
import {
  buildPhiBuilderRootNodeRenderConfig,
  normalizePhiBuilderRootNodeDraft,
} from "./root-node-normalization";
import { resolvePhiRootNodeCssSize } from "./root-node-css-size";
import { PhiWidgetPreviewFallback } from "../../../components/widgets/built-in/widget-preview";
import { splitPhiCmsLayoutNamespacedTypeKey } from "../../../constants/cms-layout-types";
import type {
  PhiLayoutEditInsertControl,
  PhiLayoutEditTitleControl,
} from "../../../components/layouts/phi-layout-contract";
import { PhiBuilderDemandControllerRegistration } from "./demand-controller-registration";
import type { PhiRuntimeControllerMaterializationOwner } from "../../../components/runtime/runtime-controller-materialization";
import { buildPhiBuilderRootNodeRenderableTree } from "./root-node-renderable-tree";
import { usePhiDeveloperBuilderStateValue } from "./developer-workspace-store";

type PhiBuilderDemandControllerContext = {
  area: string;
  ownerKey: string;
  ownerMountScope: PhiRuntimeControllerMaterializationOwner;
  pageKey: string | null;
  regionType: number;
  tree: PhiResolvedCmsRenderableTree;
};

type PhiBuilderDemandControllerContextInput = Omit<PhiBuilderDemandControllerContext, "tree"> & {
  tree?: PhiResolvedCmsRenderableTree;
};

function resolvePhiAuthoringLayoutType(type: string) {
  const { pluginKey, typeKey } = splitPhiCmsLayoutNamespacedTypeKey(type);
  return `${pluginKey}/${typeKey}`;
}

function renderPhiLayoutInsertControl(
  control: PhiLayoutEditInsertControl,
  resolveDropTarget?: (
    target: { parentLayoutNodeId: PhiCmsInstanceId; slotIndex: number },
  ) => PhiStructureDropTargetData,
  parentLayoutNodeId?: PhiCmsInstanceId | null,
  renderInsertPicker?: (input: {
    trigger: ReactElement;
    slotIndex: number;
    targetNodeId: PhiCmsInstanceId;
  }) => ReactNode,
) {
  const commonProps = {
    slotIndex: control.slotIndex,
    label: control.label,
    ariaLabel: control.ariaLabel,
    onInsert: control.onInsert,
    dropTarget:
      resolveDropTarget && parentLayoutNodeId != null
        ? resolveDropTarget({
            parentLayoutNodeId,
            slotIndex: control.slotIndex,
          })
        : null,
  };
  const button = <PhiPlusButtonWidget {...commonProps} />;
  const trigger = renderInsertPicker && parentLayoutNodeId != null
    ? renderInsertPicker({
        trigger: <span style={{ display: "inline-flex" }}>{button}</span>,
        slotIndex: control.slotIndex,
        targetNodeId: parentLayoutNodeId,
      })
    : button;
  return control.presentation === "overlay" ? (
    <PhiLayoutPlusButtonOverlay
      key={control.key}
      {...commonProps}
      anchor={control.anchor}
      slotRole={control.slotRole}
      inset={control.inset}
    >
      {trigger}
    </PhiLayoutPlusButtonOverlay>
  ) : isValidElement(trigger) ? cloneElement(trigger, { key: control.key }) : trigger;
}

function renderPhiLayoutTitleControl(control: PhiLayoutEditTitleControl) {
  return (
    <PhiInlineTextEditor
      autoFocus
      variant="underlined"
      value={control.value}
      onChange={control.onChange}
      onCommit={control.onCommit}
      onCancel={control.onCancel}
      data-phi-collapsible-title-control="true"
      aria-label={control.ariaLabel}
      style={control.style}
    />
  );
}

function PhiAuthoringWidgetLoader({
  widget,
  config,
  slotSizePolicy,
  demandControllerContext,
  children,
}: {
  widget: PhiCmsContentWidgetNode;
  config: Partial<PhiRenderableBlockBase>;
  slotSizePolicy?: PhiSlotSizePolicy;
  demandControllerContext?: PhiBuilderDemandControllerContext;
  children: (
    plugin: PhiCmsBuilderWidgetPlugin<unknown>,
    definition: PhiRuntimeModuleClientWidgetDefinition,
  ) => ReactNode;
}) {
  const type = widget.widgetType;
  const blockId = widget.id;
  const activeModules = usePhiRuntimeModuleState();
  const definition = activeModules.widgetDefinitionsByType.get(type);
  const authoringModule = usePhiRuntimeModuleAuthoringRegistration(definition?.ownerModuleId);
  if (!definition) {
    const moduleIsInactive = !activeModules.widgetTypes.has(type);
    return <PhiCmsRenderDiagnostic issue={{
      code: moduleIsInactive ? "missing-module" : "missing-renderer",
      kind: "widget",
      type,
      blockId,
      detail: moduleIsInactive
        ? "No active Canvas module provides this widget type."
        : "Active widget metadata is unavailable in the Canvas runtime context.",
    }} />;
  }
  if (
    !activeModules.moduleIds.has(definition.ownerModuleId) ||
    !activeModules.widgetTypes.has(type)
  ) {
    return <PhiCmsRenderDiagnostic issue={{
      code: "missing-module",
      kind: "widget",
      type,
      blockId,
      moduleId: definition.ownerModuleId,
      detail: "Widget owner module is not active in the current Canvas sandbox.",
    }} />;
  }

  if (!authoringModule) {
    return <PhiCmsRenderDiagnostic issue={{
      code: "missing-renderer",
      kind: "widget",
      type,
      blockId,
      moduleId: definition.ownerModuleId,
      detail: "Widget owner module does not provide its declared AuthoringClient.",
    }} />;
  }

  const WidgetModule = authoringModule.WidgetModule;

  return (
    <PhiCmsRenderErrorBoundary
      kind="widget"
      blockId={blockId}
      typeKey={type}
      moduleId={definition.ownerModuleId}
    >
      <Suspense fallback={(
        <PhiSlotChildFrame
          kind="widget"
          slotSizePolicy={slotSizePolicy ?? definition.slotSizePolicy}
          blockId={null}
          config={config}
          disableEffects
          runtimeSignalEmissionsEnabled={false}
          className="phi-widget-authoring-loading"
        >
          <PhiWidgetPreviewFallback
            widget={widget}
            pluginTitle={definition.title}
          />
        </PhiSlotChildFrame>
      )}>
        <WidgetModule type={type}>
          {(plugin) => plugin
            ? demandControllerContext && plugin.requiredRuntimeControllers
              ? (
                  <PhiBuilderDemandControllerRegistration
                    area={demandControllerContext.area}
                    ownerKey={demandControllerContext.ownerKey}
                    ownerMountScope={demandControllerContext.ownerMountScope}
                    pageKey={demandControllerContext.pageKey}
                    widget={widget}
                    tree={demandControllerContext.tree}
                    plugin={plugin}
                  >
                    {children(plugin, definition)}
                  </PhiBuilderDemandControllerRegistration>
                )
              : children(plugin, definition)
            : <PhiCmsRenderDiagnostic issue={{
                code: "missing-renderer",
                kind: "widget",
                type,
                blockId,
                moduleId: definition.ownerModuleId,
                detail: "Widget is not registered in its owner module's authoring catalog.",
              }} />}
        </WidgetModule>
      </Suspense>
    </PhiCmsRenderErrorBoundary>
  );
}

function PhiAuthoringLayoutLoader({
  type,
  kind,
  blockId,
  children,
}: {
  type: string;
  kind: "layout";
  blockId: PhiCmsInstanceId | null;
  children: (
    plugin: PhiCmsLayoutPlugin<unknown>,
    definition: PhiAuthoringLayoutDefinition,
    widgetDefinitionsByType: ReadonlyMap<string, PhiRuntimeModuleClientWidgetDefinition>,
  ) => ReactNode;
}) {
  const activeModules = usePhiRuntimeModuleState();
  const layoutType = resolvePhiAuthoringLayoutType(type);
  const definition = usePhiAuthoringLayoutDefinition(layoutType);
  if (!definition) {
    return <PhiCmsRenderDiagnostic issue={{
      code: "missing-renderer",
      kind,
      type,
      blockId,
      detail: "Layout does not provide a client authoring loader.",
    }} />;
  }
  if (
    !activeModules.moduleIds.has(definition.ownerModuleId) ||
    !activeModules.layoutTypes.has(layoutType)
  ) {
    return <PhiCmsRenderDiagnostic issue={{
      code: "missing-module",
      kind,
      type,
      blockId,
      moduleId: definition.ownerModuleId,
      detail: "Layout owner module is not active in the current Canvas sandbox.",
    }} />;
  }

  const LazyAuthoringLayout = definition.component;
  return (
    <PhiCmsRenderErrorBoundary
      kind={kind}
      blockId={blockId}
      typeKey={type}
      moduleId={definition.ownerModuleId}
    >
      <Suspense fallback={null}>
        <LazyAuthoringLayout>
          {(plugin) => children(plugin, definition, activeModules.widgetDefinitionsByType)}
        </LazyAuthoringLayout>
      </Suspense>
    </PhiCmsRenderErrorBoundary>
  );
}

function resolveRootNodeEditSlotAnchor(rootNode: { editSlotAnchor?: PhiAnchorWidgetPlacement | null }) {
  return rootNode.editSlotAnchor ?? undefined;
}

function resolveRootNodeSlotChildKind(
  kind: PhiBuilderRootNodeDraft["kind"] | null | undefined,
): "widget" | "layout" {
  if (kind === "widget" || kind === "layout") {
    return kind;
  }

  return "layout";
}

function buildSlotTitlesPatch(
  config: Record<string, unknown> | null | undefined,
  slotIndex: number,
  title: string,
) {
  const currentTitles = Array.isArray(config?.slotTitles)
    ? config.slotTitles.map((candidate) => (typeof candidate === "string" ? candidate : ""))
    : [];
  const nextTitles = currentTitles.slice();

  while (nextTitles.length <= slotIndex) {
    nextTitles.push("");
  }
  nextTitles[slotIndex] = title.trim();
  while (nextTitles.length > 0 && !nextTitles[nextTitles.length - 1]) {
    nextTitles.pop();
  }

  return { slotTitles: nextTitles };
}

function hasRenderableBlockPreviewEffects(config: PhiRenderableBlockBase | null | undefined) {
  return (Array.isArray(config?.effects?.transitions) && config.effects.transitions.length > 0) ||
    (Array.isArray(config?.effects?.viewportEffects) && config.effects.viewportEffects.length > 0);
}

function formatEffectsPreviewLabel(config: PhiRenderableBlockBase | null | undefined, blockKind: "widget" | "layout") {
  const transitions = config?.effects?.transitions ?? [];
  if (transitions.length === 0) {
    return `Preview ${blockKind} viewport effects`;
  }

  const transitionLabel = transitions
    .map((transition) => {
      const type = transition.type ?? "fade";
      const mode = transition.mode ?? "in";
      if (type === "slide") {
        return `${type} ${mode} ${transition.direction ?? "bottom"}`;
      }
      if (type === "flip" || type === "rotate") {
        return `${type} ${mode} ${transition.axis ?? (type === "flip" ? "y" : "z")}`;
      }
      return `${type} ${mode}`;
    })
    .join(", ");
  return (config?.effects?.viewportEffects?.length ?? 0) > 0
    ? `${transitionLabel}; viewport effects`
    : transitionLabel;
}

function resolveEffectsPreviewDurationMs(config: PhiRenderableBlockBase | null | undefined) {
  const transitions = config?.effects?.transitions ?? [];
  const transitionDurationMs = transitions.reduce((maxDuration, transition) => {
    const durationMs = typeof transition.durationMs === "number" && Number.isFinite(transition.durationMs)
      ? transition.durationMs
      : PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.durationMs ?? 1000;
    const delayMs = typeof transition.delayMs === "number" && Number.isFinite(transition.delayMs)
      ? transition.delayMs
      : PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.delayMs ?? 0;

    return Math.max(maxDuration, durationMs + delayMs);
  }, 0);
  return (config?.effects?.viewportEffects?.length ?? 0) > 0
    ? Math.max(transitionDurationMs, PHI_RENDERABLE_BLOCK_DEFAULT_TRANSITION.durationMs ?? 1000)
    : transitionDurationMs;
}

function PhiEffectsPreviewButton({
  config,
  blockKind,
  onRun,
}: {
  config: PhiRenderableBlockBase | null | undefined;
  blockKind: "widget" | "layout";
  onRun: () => void;
}) {
  const previewLabel = formatEffectsPreviewLabel(config, blockKind);

  return (
    <Button
      className="phi-layout-affordance phi-layout-affordance--effects-preview"
      aria-label={previewLabel}
      title={previewLabel}
      icon={<NodeIndexOutlined />}
      type="text"
      size="small"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRun();
      }}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        zIndex: 4,
        transform: "translate(-50%, -50%)",
        "--phi-layout-affordance-size": "var(--ant-control-height)",
      } as CSSProperties & Record<`--${string}`, string>}
    />
  );
}

function PhiSignalWiringToolButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      type="text"
      size="small"
      aria-label="Wire signals"
      title="Wire signals"
      /*
       * Not a chain link: that glyph is the Rich Text Widget's own tool for an embedded link, and the
       * two sat side by side in the same toolbar meaning entirely different things. The flow-graph glyph
       * is taken by the effects editor, so wiring gets the connected-nodes one.
       */
      icon={<ShareAltOutlined />}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen();
      }}
    />
  );
}

function PhiViewportIntersectionDiagnostic() {
  return (
    <span
      aria-label="This block is hidden at every viewport because its visibility does not overlap its ancestors."
      title="Hidden at every viewport: this block's Compact/Medium/Wide selection has no overlap with its ancestors."
      style={{
        alignItems: "center",
        color: "var(--ant-color-warning)",
        display: "inline-flex",
        height: "var(--ant-control-height-sm)",
        justifyContent: "center",
        width: "var(--ant-control-height-sm)",
      }}
    >
      <WarningOutlined />
    </span>
  );
}

const PHI_WIDGET_AUTHORING_TEXT_SELECTOR = [
  "textarea:not([disabled]):not([readonly])",
  "input:not([disabled]):not([readonly]):not([type='button']):not([type='checkbox']):not([type='radio']):not([type='submit']):not([type='reset'])",
  "[contenteditable='true']",
].join(", ");

function findPhiWidgetAuthoringTextTarget(
  container: HTMLElement | null,
  clientX: number,
  clientY: number,
) {
  if (!container) {
    return null;
  }

  return [...container.querySelectorAll<HTMLElement>(PHI_WIDGET_AUTHORING_TEXT_SELECTOR)]
    .find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    }) ?? null;
}

function PhiWidgetEffectsPreviewFrame({
  kind,
  slotSizePolicy,
  blockId,
  regionKey,
  config,
  title,
  editorInteraction = "inert",
  onSelect,
  dropTarget,
  tools,
  style,
  children,
}: {
  kind: "widget";
  slotSizePolicy?: Parameters<typeof PhiSlotChildFrame>[0]["slotSizePolicy"];
  blockId?: PhiCmsInstanceId | null;
  regionKey: string | null;
  config: Partial<PhiRenderableBlockBase>;
  title?: string | null;
  editorInteraction?: PhiCmsBuilderWidgetEditorInteraction;
  onSelect?: () => void;
  dropTarget?: PhiStructureDropTargetData | null;
  tools?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { token } = antdTheme.useToken();
  const selected = usePhiDeveloperBuilderStateValue(
    "public",
    (state) =>
      blockId != null &&
      regionKey != null &&
      state.selectedRootRegionKey === regionKey &&
      state.nodeKind === "widget" &&
      state.nodeId === blockId,
  );
  const [previewRunId, setPreviewRunId] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isAuthoringActive, setIsAuthoringActive] = useState(false);
  const [isToolbarPopupOpen, setIsToolbarPopupOpen] = useState(false);
  const authoringContentRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);
  const authoringFocusTargetRef = useRef<HTMLElement | null>(null);
  const suppressInspectorRef = useRef(false);
  const suppressInspectorFrameRef = useRef<number | null>(null);
  const outsideClickCleanupRef = useRef<(() => void) | null>(null);
  const previewDurationMs = resolveEffectsPreviewDurationMs(config);
  const supportsAuthoring = editorInteraction === "authoring";
  const {
    accepted: dropAccepted,
    isOver: dropIsOver,
    setNodeRef: setDropNodeRef,
  } = usePhiStructureDroppable(dropTarget ?? null);

  const armOutsideClickConsumption = useCallback(() => {
    outsideClickCleanupRef.current?.();
    const consumeOutsideClick = (clickEvent: MouseEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopImmediatePropagation();
      outsideClickCleanupRef.current?.();
    };
    const cleanupTimer = window.setTimeout(() => {
      outsideClickCleanupRef.current?.();
    }, 750);
    outsideClickCleanupRef.current = () => {
      document.removeEventListener("click", consumeOutsideClick, true);
      window.clearTimeout(cleanupTimer);
      outsideClickCleanupRef.current = null;
    };
    document.addEventListener("click", consumeOutsideClick, true);
  }, []);

  useEffect(() => {
    if (!isAuthoringActive) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      const content = authoringContentRef.current;
      const focusTarget = authoringFocusTargetRef.current;
      authoringFocusTargetRef.current = null;
      const resolvedFocusTarget = focusTarget ?? content;
      resolvedFocusTarget?.focus();
      if (focusTarget?.isContentEditable) {
        focusTarget.click();
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isAuthoringActive]);

  useEffect(() => () => {
    if (suppressInspectorFrameRef.current != null) {
      window.cancelAnimationFrame(suppressInspectorFrameRef.current);
    }
    outsideClickCleanupRef.current?.();
  }, []);

  useEffect(() => {
    if (!isAuthoringActive) {
      return undefined;
    }

    const scaffold = authoringContentRef.current?.closest(".phi-builder-widget-scaffold");
    if (!scaffold) {
      return undefined;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && scaffold.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest(`.${PHI_WIDGET_SCAFFOLD_POPUP_CLASS_NAME}`)) {
        return;
      }

      armOutsideClickConsumption();
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [armOutsideClickConsumption, isAuthoringActive]);

  useEffect(() => {
    if (!isToolbarPopupOpen) {
      return undefined;
    }

    const scaffold = authoringContentRef.current?.closest(".phi-builder-widget-scaffold");
    if (!scaffold) {
      return undefined;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (scaffold.contains(target) || target.closest(`.${PHI_WIDGET_SCAFFOLD_POPUP_CLASS_NAME}`)) {
        return;
      }

      armOutsideClickConsumption();
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [armOutsideClickConsumption, isToolbarPopupOpen]);

  const suppressInspectorForCurrentPointerAction = () => {
    suppressInspectorRef.current = true;
    if (suppressInspectorFrameRef.current != null) {
      window.cancelAnimationFrame(suppressInspectorFrameRef.current);
    }
    suppressInspectorFrameRef.current = window.requestAnimationFrame(() => {
      suppressInspectorRef.current = false;
      suppressInspectorFrameRef.current = null;
    });
  };

  const finishAuthoringOnPointerLeave = () => {
    const scaffold = authoringContentRef.current?.closest(".phi-builder-widget-scaffold");
    const activeElement = document.activeElement;

    suppressInspectorForCurrentPointerAction();
    if (scaffold && activeElement instanceof HTMLElement && scaffold.contains(activeElement)) {
      activeElement.blur();
    }
    setIsAuthoringActive(false);
  };

  const renderEditorLayers = () => (
    <>
      <div
        ref={authoringContentRef}
        className={[
          "phi-builder-widget-scaffold__content",
          isAuthoringActive ? "phi-builder-widget-scaffold__content--authoring" : null,
        ].filter(Boolean).join(" ")}
        data-phi-builder-scaffold-action={isAuthoringActive ? "true" : undefined}
        data-phi-builder-authoring-active={isAuthoringActive ? "true" : undefined}
        inert={isAuthoringActive ? undefined : true}
        tabIndex={isAuthoringActive ? -1 : undefined}
        onBlurCapture={isAuthoringActive ? (event) => {
          const nextTarget = event.relatedTarget;
          if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
            return;
          }
          suppressInspectorForCurrentPointerAction();
          setIsAuthoringActive(false);
        } : undefined}
        onClick={isAuthoringActive ? (event) => event.stopPropagation() : undefined}
        onDoubleClick={isAuthoringActive ? (event) => event.stopPropagation() : undefined}
        onMouseDown={isAuthoringActive ? (event) => event.stopPropagation() : undefined}
        onPointerDown={isAuthoringActive ? (event) => event.stopPropagation() : undefined}
        onKeyDown={isAuthoringActive ? (event) => {
          event.stopPropagation();
          if (event.key === "Escape" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            setIsAuthoringActive(false);
            interactionRef.current?.focus();
          }
        } : undefined}
      >
        {children}
      </div>
      <div
        ref={(node) => {
          interactionRef.current = node;
          setDropNodeRef(node);
        }}
        className="phi-builder-widget-scaffold__interaction"
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-label={onSelect ? `Select ${title?.trim() || "widget"}` : undefined}
        aria-hidden={onSelect ? undefined : true}
        data-phi-structure-drop-state={
          dropAccepted ? "accepted" : dropIsOver ? "rejected" : undefined
        }
        onClick={onSelect ? (event) => {
          event.stopPropagation();

          if (suppressInspectorRef.current) {
            suppressInspectorRef.current = false;
            return;
          }

          if (supportsAuthoring) {
            const authoringTarget = findPhiWidgetAuthoringTextTarget(
              authoringContentRef.current,
              event.clientX,
              event.clientY,
            );
            if (authoringTarget) {
              authoringFocusTargetRef.current = authoringTarget;
              setIsAuthoringActive(true);
              return;
            }
          }

          onSelect();
        } : undefined}
        onKeyDown={onSelect ? (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          onSelect();
        } : undefined}
      />
      <div className="phi-builder-widget-scaffold__state" aria-hidden="true" />
    </>
  );

  useEffect(() => {
    if (!isPreviewing) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setIsPreviewing(false), previewDurationMs + 50);
    return () => window.clearTimeout(timeout);
  }, [isPreviewing, previewDurationMs, previewRunId]);

  const widgetScaffoldStyle = {
    ...style,
    "--phi-builder-widget-scaffold-hover-border": token.colorWarningBorder,
    "--phi-builder-widget-scaffold-hover-background": `color-mix(in srgb, ${token.colorWarningBg} 50%, transparent)`,
    "--phi-builder-widget-scaffold-selected-border": token.colorWarning,
    "--phi-builder-widget-scaffold-selected-background": `color-mix(in srgb, ${token.colorWarningBg} 70%, transparent)`,
    "--phi-builder-widget-scaffold-debug-border": token.colorInfoBorder,
    "--phi-builder-widget-scaffold-drop-accepted": token.colorSuccess,
    "--phi-builder-widget-scaffold-drop-rejected": token.colorError,
    "--phi-builder-widget-scaffold-label-background": token.colorWarningBg,
    "--phi-builder-widget-scaffold-label-border": token.colorWarningBorder,
    "--phi-builder-widget-scaffold-label-color": token.colorWarningText,
  } satisfies CSSProperties & Record<`--${string}`, string>;

  if (!hasRenderableBlockPreviewEffects(config)) {
    return (
      <PhiWidgetScaffoldPopupProvider onOpenChange={setIsToolbarPopupOpen}>
        <PhiSlotChildFrame
          kind={kind}
          slotSizePolicy={slotSizePolicy}
          blockId={blockId}
          config={config}
          disableEffects
          runtimeSignalEmissionsEnabled={false}
          className="phi-builder-widget-scaffold"
          style={widgetScaffoldStyle}
          builderWidgetTitle={title}
          builderWidgetSelected={selected}
          builderWidgetPopupOpen={isToolbarPopupOpen}
          onPointerLeave={isAuthoringActive && !isToolbarPopupOpen ? finishAuthoringOnPointerLeave : undefined}
          chrome={tools}
        >
          {renderEditorLayers()}
        </PhiSlotChildFrame>
      </PhiWidgetScaffoldPopupProvider>
    );
  }

  const previewConfig: Partial<PhiRenderableBlockBase> = {
    ...config,
    effects: {
      ...config.effects,
      transitionTrigger: "on_mount",
    },
  };
  return (
    <PhiWidgetScaffoldPopupProvider onOpenChange={setIsToolbarPopupOpen}>
      <PhiSlotChildFrame
        key={`effects-preview-${previewRunId}`}
        kind={kind}
        slotSizePolicy={slotSizePolicy}
        blockId={blockId}
        config={previewConfig}
        disableEffects={!isPreviewing}
        runtimeSignalEmissionsEnabled={false}
        className="phi-builder-widget-scaffold"
        style={widgetScaffoldStyle}
        builderWidgetTitle={title}
        builderWidgetSelected={selected}
        builderWidgetPopupOpen={isToolbarPopupOpen}
        onPointerLeave={isAuthoringActive && !isToolbarPopupOpen ? finishAuthoringOnPointerLeave : undefined}
        chrome={(
          <>
            {tools}
            {!isPreviewing ? (
              <PhiEffectsPreviewButton
                config={config}
                blockKind="widget"
                onRun={() => {
                  setIsPreviewing(false);
                  window.requestAnimationFrame(() => {
                    setPreviewRunId((current) => current + 1);
                    setIsPreviewing(true);
                  });
                }}
              />
            ) : null}
          </>
        )}
      >
        {renderEditorLayers()}
      </PhiSlotChildFrame>
    </PhiWidgetScaffoldPopupProvider>
  );
}

function PhiLayoutEffectsPreviewFrame({
  kind,
  slotSizePolicy,
  blockId,
  config,
  explicitInlineSize,
  explicitBlockSize,
  children,
}: {
  kind: "layout";
  slotSizePolicy?: PhiSlotSizePolicy;
  blockId?: PhiCmsInstanceId | null;
  config: Partial<PhiRenderableBlockBase>;
  explicitInlineSize?: boolean;
  explicitBlockSize?: boolean;
  children: ReactNode;
}) {
  const [previewRunId, setPreviewRunId] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewDurationMs = resolveEffectsPreviewDurationMs(config);

  useEffect(() => {
    if (!isPreviewing) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setIsPreviewing(false), previewDurationMs + 50);
    return () => window.clearTimeout(timeout);
  }, [isPreviewing, previewDurationMs, previewRunId]);

  const hasPreviewEffects = hasRenderableBlockPreviewEffects(config);
  const previewConfig: Partial<PhiRenderableBlockBase> = hasPreviewEffects
    ? {
        ...config,
        effects: {
          ...config.effects,
          transitionTrigger: "on_mount",
        },
      }
    : config;

  return (
    <PhiSlotChildFrame
      key={hasPreviewEffects ? `layout-effects-preview-${blockId ?? "root"}-${previewRunId}` : undefined}
      className="phi-builder-root-scaffold__slot"
      kind={kind}
      slotSizePolicy={slotSizePolicy}
      blockId={blockId}
      config={previewConfig}
      explicitInlineSize={explicitInlineSize}
      explicitBlockSize={explicitBlockSize}
      disableEffects={!hasPreviewEffects || !isPreviewing}
    >
      {children}
      {hasPreviewEffects && !isPreviewing ? (
        <PhiEffectsPreviewButton
          config={config}
          blockKind={kind}
          onRun={() => {
            setIsPreviewing(false);
            window.requestAnimationFrame(() => {
              setPreviewRunId((current) => current + 1);
              setIsPreviewing(true);
            });
          }}
        />
      ) : null}
    </PhiSlotChildFrame>
  );
}

function PhiAuthoringLayoutEffectsPreviewFrame({
  type,
  ...props
}: Omit<Parameters<typeof PhiLayoutEffectsPreviewFrame>[0], "slotSizePolicy"> & {
  type: string;
}) {
  const definition = usePhiAuthoringLayoutDefinition(resolvePhiAuthoringLayoutType(type));
  return (
    <PhiLayoutEffectsPreviewFrame
      {...props}
      slotSizePolicy={definition?.slotSizePolicy}
    />
  );
}

function readObjectConfig<T>(value: unknown): T | null {
  return typeof value === "object" && value != null ? (value as T) : null;
}

function formatLayoutScaffoldLabel(
  typeKey: string,
  _kind: "layout" | "widget" | null | undefined,
  definitionTitle?: string | null,
) {
  const typeTitle = splitPhiCmsLayoutNamespacedTypeKey(typeKey)
    .typeKey
    ?.split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ") ?? "Layout";
  const kindLabel = "layout";

  return `${definitionTitle?.trim() || typeTitle} ${kindLabel}`;
}

function resolveLayoutNodeRootProps(node: PhiCmsLayoutRenderNode) {
  return {
    id: node.id,
    typeKey: node.widgetType,
    kind: "layout" as const,
    title: node.label ?? undefined,
    editSlotAnchor:
      (typeof node.config.anchor === "string" && isPhiAnchorWidgetPlacement(node.config.anchor)
        ? node.config.anchor
        : resolvePhiAnchorPlacement(node.config.anchor as Parameters<typeof resolvePhiAnchorPlacement>[0])) ?? undefined,
    rootNodeConfig: node.config,
    rootNodeGeometry: node.config as PhiCmsGeometryWidgetConfig,
    rootNodePadding: normalizePhiPaddingWidgetConfig(node.config),
    rootNodeBackground: readObjectConfig<PhiCmsBackgroundWidgetConfig>(node.config.rootNodeBackground),
    rootNodeBorder: readObjectConfig<PhiCmsBorderWidgetConfig>(node.config.rootNodeBorder),
    rootNodeShadow: readPhiShadow(node.config.rootNodeShadow) ?? null,
    childLayouts: node.childLayouts,
    childWidgets: node.childWidgets,
  };
}

function resolveRootNodeChromeStyle({
  background,
  border,
  shadow,
  style,
}: {
  background?: PhiCmsBackgroundWidgetConfig | null;
  border?: PhiCmsBorderWidgetConfig | null;
  shadow?: PhiShadow | null;
  style?: CSSProperties;
}): CSSProperties | undefined {
  if (background == null && border == null && shadow == null) {
    return style;
  }

  const backgroundStyle = background == null ? {} : resolvePhiBackgroundWidgetStyle(background);

  return {
    ...style,
    ...backgroundStyle,
    ...(border == null ? {} : resolvePhiBorderWidgetStyle(border)),
    boxShadow: combinePhiBoxShadows(backgroundStyle.boxShadow, resolvePhiShadow(shadow)),
  };
}

function resolvePhiAuthoringLayoutRenderer(
  plugin: PhiCmsLayoutPlugin<unknown>,
  definition: PhiAuthoringLayoutDefinition,
  renderMode: PhiRenderableBlockRenderMode,
) {
  if (renderMode === "live") {
    return definition.renderPolicies.runtime === "custom" ? plugin.render : null;
  }

  if (renderMode === "preview") {
    return definition.renderPolicies.preview === "runtimeReadOnly" ? plugin.render : null;
  }

  if (definition.renderPolicies.authoring === "custom") {
    return plugin.renderEditor;
  }

  return definition.renderPolicies.authoring === "usePreview" &&
    definition.renderPolicies.preview === "runtimeReadOnly"
    ? plugin.render
    : null;
}

function resolvePhiAuthoringWidgetRenderer(
  plugin: PhiCmsBuilderWidgetPlugin<unknown>,
  definition: PhiRuntimeModuleClientWidgetDefinition,
) {
  switch (definition.renderPolicies.authoring) {
    case "custom":
      return plugin.renderEditor;
    case "usePreview":
      // `loadAuthoring` supplies the explicit client-safe preview adapter. It is never the server
      // plugin's `renderPreview()` implementation or an implicit runtime fallback.
      return plugin.renderEditor;
  }
}

function resolvePhiAuthoringLayoutConfigParser(
  plugin: PhiCmsLayoutPlugin<unknown>,
) {
  return plugin.parseConfig;
}

function resolvePhiRootNodeRenderedBody(
  rootNode: PhiBuilderRootNodeDraft,
  renderMode: PhiRenderableBlockRenderMode,
  plugin: PhiCmsLayoutPlugin<unknown>,
  definition: PhiAuthoringLayoutDefinition,
  widgetDefinitionsByType: ReadonlyMap<string, PhiRuntimeModuleClientWidgetDefinition>,
  regionKey: string | null,
  renderChildLayoutNode?: (node: PhiCmsLayoutRenderNode) => ReactNode,
  onDeleteWidgetNode?: (node: PhiCmsContentWidgetNode) => void,
  onOpenInspectorWidgetNode?: (node: PhiCmsContentWidgetNode) => void,
  onOpenWiringWidgetNode?: (node: PhiCmsContentWidgetNode) => void,
  onUpdateWidgetNodeConfig?: (node: PhiCmsContentWidgetNode, configPatch: Record<string, unknown>) => void,
  resolveWidgetDragData?: (
    node: PhiCmsContentWidgetNode,
  ) => Omit<PhiStructureDragData, "getPreviewElement">,
  resolveWidgetDropTarget?: (
    node: PhiCmsContentWidgetNode,
  ) => PhiStructureDropTargetData,
  inheritedViewportFlags?: number | null,
  effectsLabels?: PhiEffectsWidgetLabels,
  demandControllerContext?: PhiBuilderDemandControllerContext,
  authoringCanvas?: PhiCmsWidgetAuthoringCanvas,
) {
  if (rootNode.kind === null) {
    return null;
  }

  const normalizedRootNode = normalizePhiBuilderRootNodeDraft(rootNode);
  if (normalizedRootNode.id == null) {
    return null;
  }
  const resolvedViewportFlags = intersectPhiInheritedViewportFlags(
    inheritedViewportFlags,
    normalizedRootNode.rootNodeConfig?.viewportFlags,
  );

  const syntheticRootNode = {
    id: normalizedRootNode.id,
    siteId: -1,
    widgetType: normalizedRootNode.typeKey,
    slotIndex: 0,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: normalizedRootNode.title ?? "Root",
    config: buildPhiBuilderRootNodeRenderConfig(normalizedRootNode, renderMode),
    parentLayoutNodeId: null,
    childLayouts: normalizedRootNode.childLayouts ?? [],
    childWidgets: normalizedRootNode.childWidgets ?? [],
  } satisfies PhiCmsLayoutRenderNode;
  const previewTree = demandControllerContext?.tree ?? {
    page: {
      id: -1,
      siteId: -1,
      areaMask: 0,
      path: "",
      pageType: 0,
      status: 0,
      flags: 0,
      visibilityMask: 0,
      accessPolicy: PHI_VIEWER_ACCESS_ANYONE,
      titleMsgId: null,
      descriptionMsgId: null,
      heroRootLayoutNodeId: null,
      headerBottomRootLayoutNodeId: null,
      siderRightRootLayoutNodeId: null,
      footerTopRootLayoutNodeId: null,
      drawerRightRootLayoutNodeId: null,
      contentRootLayoutNodeId: null,
      layoutConfig: {},
    },
    regions: [],
    overlays: [],
    layoutNodes: [],
    contentWidgets: [],
  };

  const previewRuntime = {
    site: {
      id: -1,
      key: "preview",
      publicUrl: undefined,
      name: "Preview",
      hostname: null,
      availableLocales: [],
      store: { enabled: false },
      theme: { mode: "light" },
    },
    phis: {
      apiBaseUrl: "",
      internalToken: "",
    },
    locale: {
      current: "en",
    },
    area: "public",
    viewer: {
      access: "public",
      roleClaims: [],
      groupClaims: [],
      authorizationRevision: 0,
    },
  } as unknown as PhiBlockRuntime;

  const renderWidgetNode = (widget: PhiCmsContentWidgetNode) => {
    const renderableBlockConfig = mergeRenderableBlockDefaults(
      widget.config as Partial<PhiRenderableBlockBase> | null | undefined,
    );
    const widgetViewportFlags = intersectPhiInheritedViewportFlags(
      resolvedViewportFlags,
      widget.config.viewportFlags,
    );
    return (
      <PhiAuthoringWidgetLoader
        key={`widget-${widget.id}`}
        widget={widget}
        config={{ ...renderableBlockConfig, renderMode: "editor" }}
        slotSizePolicy={widgetDefinitionsByType.get(widget.widgetType)?.slotSizePolicy}
        demandControllerContext={demandControllerContext}
      >
        {(plugin, definition) => {
          const resolvedConfig = plugin.parseConfig(widget.config ?? {}) as Record<string, unknown>;
          const widgetTitle = widget.label ?? plugin.title ?? widget.widgetType;
          const parsedWidgetConfig = (resolvedConfig ?? {}) as Record<string, unknown>;
      const editorConfig = {
        ...renderableBlockConfig,
        ...parsedWidgetConfig,
        renderMode: "editor",
      };
      const authoring: PhiCmsWidgetAuthoringContext<Record<string, unknown>> | null =
        authoringCanvas
          ? {
              canvas: authoringCanvas,
              updateConfig:
                renderMode === "editor" && onUpdateWidgetNodeConfig
                  ? (configPatch) => onUpdateWidgetNodeConfig(widget, configPatch)
                  : undefined,
            }
          : null;
      const renderAuthoringWidget = resolvePhiAuthoringWidgetRenderer(plugin, definition);
      const renderedWidget = renderAuthoringWidget({
        widget,
        runtime: previewRuntime,
        tree: previewTree,
        config: editorConfig,
        authoring,
      });
      const renderedEditorTools = definition.renderPolicies.authoring === "custom"
        ? plugin.renderEditorTools?.({
            widget,
            runtime: previewRuntime,
            tree: previewTree,
            config: editorConfig,
            authoring,
          })
        : null;
      const renderedScaffoldTools = (
        <>
          {widgetViewportFlags === 0 ? <PhiViewportIntersectionDiagnostic /> : null}
          {renderedEditorTools}
          {onOpenWiringWidgetNode ? (
            <PhiSignalWiringToolButton onOpen={() => onOpenWiringWidgetNode({ ...widget })} />
          ) : null}
          <PhiWidgetEffectsToolButton
            effects={renderableBlockConfig.effects}
            labels={effectsLabels}
            onChange={(effects: PhiRenderableBlockEffects) =>
              onUpdateWidgetNodeConfig?.(widget, { effects })
            }
          />
        </>
      );

      const renderedNode = isValidElement(renderedWidget)
        ? cloneElement(renderedWidget as ReactElement<Record<string, unknown>>, {
            "data-phi-widget-node": widget.widgetType,
          } as never)
        : (
            <div data-phi-widget-node={widget.widgetType}>
              {renderedWidget}
            </div>
          );
      const shouldWrapWidgetNode =
        renderMode === "editor" &&
        (
          typeof onDeleteWidgetNode === "function" ||
          typeof onOpenInspectorWidgetNode === "function" ||
          typeof onUpdateWidgetNodeConfig === "function"
        );

      if (!shouldWrapWidgetNode) {
        return (
          <PhiWidgetEffectsPreviewFrame
            key={`widget-${widget.id}`}
            kind="widget"
            slotSizePolicy={plugin.slotSizePolicy}
            blockId={widget.id}
            regionKey={regionKey}
            config={editorConfig as Partial<PhiRenderableBlockBase>}
            title={widgetTitle}
            editorInteraction={plugin.editorInteraction}
          >
            {renderedNode}
          </PhiWidgetEffectsPreviewFrame>
        );
      }

      return (
        <PhiWidgetEffectsPreviewFrame
          key={`widget-${widget.id}`}
          kind="widget"
          slotSizePolicy={plugin.slotSizePolicy}
          blockId={widget.id}
          regionKey={regionKey}
          config={editorConfig as Partial<PhiRenderableBlockBase>}
          title={widgetTitle}
          editorInteraction={plugin.editorInteraction}
          onSelect={
            onOpenInspectorWidgetNode
              ? () => onOpenInspectorWidgetNode({ ...widget })
              : undefined
          }
          dropTarget={resolveWidgetDropTarget?.(widget) ?? null}
          tools={onDeleteWidgetNode ? (
            <>
              {resolveWidgetDragData ? (
                <PhiLayoutDragButtonOverlay
                  ariaLabel={`Move ${widgetTitle}`}
                  nodeKind="widget"
                  dragData={resolveWidgetDragData(widget)}
                />
              ) : null}
              <PhiLayoutDeleteButtonOverlay
                onOpenInspector={
                  onOpenInspectorWidgetNode
                    ? () => onOpenInspectorWidgetNode({ ...widget })
                    : null
                }
                inspectorAriaLabel="Open widget inspector"
                top={-10}
                bottom="auto"
                transform="translateY(-50%)"
                zIndex={40}
                nodeKind="widget"
                leading={renderedScaffoldTools}
                onDelete={() => onDeleteWidgetNode({ ...widget })}
              />
            </>
          ) : null}
          style={{
            position: "relative",
            zIndex: 30,
          }}
        >
          {renderedNode}
        </PhiWidgetEffectsPreviewFrame>
      );
        }}
      </PhiAuthoringWidgetLoader>
    );
  };

  const renderSequentialSlotChildren = () => {
    return [...syntheticRootNode.childLayouts, ...syntheticRootNode.childWidgets]
      .sort((left, right) => left.sortOrder - right.sortOrder || comparePhiCmsInstanceIds(left.id, right.id))
      .reduce<ReactNode[]>((slots, entry) => {
        const rendered =
          "contentId" in entry
            ? renderWidgetNode(entry)
            : renderChildLayoutNode
              ? renderChildLayoutNode(entry)
              : renderPhiRootNodePreview(resolveLayoutNodeRootProps(entry));

        slots[entry.slotIndex] = rendered;
        return slots;
      }, []);
  };
  const rootRenderMode = renderMode === "preview" ? "preview" : renderMode === "editor" ? "editor" : "live";
  const renderRootNode = resolvePhiAuthoringLayoutRenderer(plugin, definition, rootRenderMode);
  const parseRootConfig = resolvePhiAuthoringLayoutConfigParser(plugin);

  if (!renderRootNode) {
    return <PhiCmsRenderDiagnostic issue={{
      code: "missing-renderer",
      kind: "layout",
      type: normalizedRootNode.typeKey,
      blockId: normalizedRootNode.id ?? null,
      moduleId: definition.ownerModuleId,
      detail: `The declared ${rootRenderMode} render policy has no client authoring implementation.`,
    }} />;
  }

  try {
    return renderRootNode({
      node: syntheticRootNode,
      layoutKind: plugin.layoutKind,
      runtime: {} as PhiBlockRuntime,
      tree: previewTree,
      config:
        (parseRootConfig?.(buildPhiBuilderRootNodeRenderConfig(normalizedRootNode, rootRenderMode)) ??
          plugin.parseConfig(buildPhiBuilderRootNodeRenderConfig(normalizedRootNode, rootRenderMode))),
      renderChildren: () => syntheticRootNode.childWidgets.map((widget) => renderWidgetNode(widget)),
      renderSequentialSlotChildren,
    });
  } catch (error) {
    return <PhiCmsRenderDiagnostic issue={{
      code: "render-failed",
      kind: "layout",
      type: normalizedRootNode.typeKey,
      blockId: normalizedRootNode.id ?? null,
      moduleId: definition.ownerModuleId,
      detail: error instanceof Error ? error.message : String(error),
    }} />;
  }
}

export function renderPhiRootNodeScaffold(
  rootNode: PhiBuilderRootNodeDraft & {
    regionKey: string;
    editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  },
  onOpenInsert?: (
    options?: {
      defaultPickSection?: "layout" | "widget";
      allowWidgetSection?: boolean;
      slotIndex?: number;
      targetNodeId?: PhiCmsInstanceId | null;
    },
  ) => void,
  onOpenInspector?: (options?: {
    nodeId?: PhiCmsInstanceId | null;
    nodeKey?: string | null;
    nodeKind?: "layout" | "widget" | null;
    openWiring?: boolean;
  }) => void,
  onDeleteRootNode?: (options?: {
    nodeId?: PhiCmsInstanceId | null;
    nodeKey?: string | null;
    nodeKind?: "layout" | "widget" | null;
  }) => void,
  onUpdateWidgetNodeConfig?: (node: PhiCmsContentWidgetNode, configPatch: Record<string, unknown>) => void,
  onUpdateLayoutNodeConfig?: (node: PhiCmsLayoutRenderNode, configPatch: Record<string, unknown>) => void,
  options?: {
    fallbackBlockSize?: string | null;
    fallbackMinBlockSize?: string | null;
    effectsLabels?: PhiEffectsWidgetLabels;
    demandControllerContext?: PhiBuilderDemandControllerContextInput;
    authoringCanvas?: PhiCmsWidgetAuthoringCanvas;
    inheritedViewportFlags?: number | null;
    draggable?: boolean;
    resolveDragData?: (
      node: {
        nodeId: PhiCmsInstanceId;
        nodeKind: "layout" | "widget";
      },
      title: string,
    ) => Omit<PhiStructureDragData, "getPreviewElement">;
    resolveDropTarget?: (
      target: {
        parentLayoutNodeId: PhiCmsInstanceId;
        slotIndex: number;
      },
    ) => PhiStructureDropTargetData;
    resolveWidgetDropTarget?: (
      node: PhiCmsContentWidgetNode,
    ) => PhiStructureDropTargetData;
    renderInsertPicker?: (input: {
      trigger: ReactElement;
      slotIndex: number;
      targetNodeId: PhiCmsInstanceId;
    }) => ReactNode;
  },
) {
  if (rootNode.kind === null) {
    return null;
  }

  const regionKey = rootNode.regionKey;
  const normalizedRootNode = normalizePhiBuilderRootNodeDraft(rootNode);
  if (normalizedRootNode.id == null) {
    return null;
  }
  const demandControllerTree = options?.demandControllerContext?.tree ?? (
    options?.demandControllerContext
      ? buildPhiBuilderRootNodeRenderableTree({
          rootNode: normalizedRootNode,
          regionType: options.demandControllerContext.regionType,
          renderMode: "editor",
        })
      : null
  );
  const demandControllerContext = options?.demandControllerContext && demandControllerTree
    ? { ...options.demandControllerContext, tree: demandControllerTree }
    : undefined;
  const rootTitle = normalizedRootNode.title ?? "Root";
  const rootPackageName = normalizedRootNode.packageName ?? normalizedRootNode.typeKey;
  const rootNodeEffects = mergeRenderableBlockDefaults(
    normalizedRootNode.rootNodeConfig as Partial<PhiRenderableBlockBase> | null | undefined,
  ).effects;
  const rootNodeRenderableConfig =
    (normalizedRootNode.rootNodeConfig ?? {}) as Partial<PhiRenderableBlockBase>;
  const resolvedViewportFlags = intersectPhiInheritedViewportFlags(
    options?.inheritedViewportFlags,
    rootNodeRenderableConfig.viewportFlags,
  );
  const syntheticRootNodeForUpdates = {
    id: normalizedRootNode.id,
    siteId: -1,
    widgetType: normalizedRootNode.typeKey,
    slotIndex: 0,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: normalizedRootNode.title ?? "Root",
    config: normalizedRootNode.rootNodeConfig ?? {},
    parentLayoutNodeId: null,
    childLayouts: normalizedRootNode.childLayouts ?? [],
    childWidgets: normalizedRootNode.childWidgets ?? [],
  } satisfies PhiCmsLayoutRenderNode;
  const wrapRootScaffoldChild = (child: ReactNode) => (
    <PhiLayoutEffectsPreviewFrame
      kind="layout"
      blockId={normalizedRootNode.id ?? null}
      config={rootNodeRenderableConfig}
      explicitInlineSize={normalizedRootNode.rootNodeGeometry?.size?.width != null}
      explicitBlockSize={normalizedRootNode.rootNodeGeometry?.size?.height != null}
    >
      {child}
    </PhiLayoutEffectsPreviewFrame>
  );
  const renderRootScaffoldToolbar = () => {
    if (typeof onDeleteRootNode !== "function") {
      return null;
    }

    const nodeKind = "layout" as const;

    return (
      <>
        {resolvedViewportFlags === 0 ? <PhiViewportIntersectionDiagnostic /> : null}
        {options?.draggable && options.resolveDragData ? (
          <PhiLayoutDragButtonOverlay
            ariaLabel={`Move ${rootTitle}`}
            nodeKind={nodeKind}
            dragData={options.resolveDragData(
              {
                nodeId: normalizedRootNode.id!,
                nodeKind,
              },
              rootTitle,
            )}
          />
        ) : null}
        <PhiLayoutDeleteButtonOverlay
          leading={
            typeof onUpdateLayoutNodeConfig === "function" ? (
              <>
                {onOpenInspector ? (
                  <PhiSignalWiringToolButton
                    onOpen={() => onOpenInspector({
                      nodeId: normalizedRootNode.id ?? null,
                      nodeKey: normalizedRootNode.typeKey,
                      nodeKind,
                      openWiring: true,
                    })}
                  />
                ) : null}
                <PhiWidgetEffectsToolButton
                  effects={rootNodeEffects}
                  labels={options?.effectsLabels}
                  onChange={(effects: PhiRenderableBlockEffects) =>
                    onUpdateLayoutNodeConfig(syntheticRootNodeForUpdates, { effects })
                  }
                />
              </>
            ) : null
          }
          onOpenInspector={
            onOpenInspector
              ? () =>
                  onOpenInspector({
                    nodeId: normalizedRootNode.id ?? null,
                    nodeKey: normalizedRootNode.typeKey,
                    nodeKind: normalizedRootNode.kind,
                  })
              : null
          }
          inspectorAriaLabel="Open layout inspector"
          nodeKind={nodeKind}
          onDelete={() =>
            onDeleteRootNode({
              nodeId: normalizedRootNode.id ?? null,
              nodeKey: normalizedRootNode.typeKey,
              nodeKind: normalizedRootNode.kind,
            })
          }
        />
      </>
    );
  };
  const renderRootDrawer = (
    child: ReactNode,
    definitionTitle?: string | null,
  ) => (
    <PhiEditScaffoldDrawer
      className="phi-builder-root-scaffold"
      kind="layout"
      nodeId={normalizedRootNode.id!}
      regionKey={regionKey}
      title={rootTitle}
      scaffoldLabel={formatLayoutScaffoldLabel(
        normalizedRootNode.typeKey,
        normalizedRootNode.kind,
        definitionTitle,
      )}
      packageName={rootPackageName}
      style={
        {
          "--phi-root-scaffold-width": resolvePhiRootNodeCssSize(normalizedRootNode.rootNodeGeometry?.size?.width, "100%"),
          "--phi-root-scaffold-height":
            resolvePhiRootNodeCssSize(normalizedRootNode.rootNodeGeometry?.size?.height, options?.fallbackBlockSize ?? "auto"),
          "--phi-root-scaffold-min-width":
            resolvePhiRootNodeCssSize(normalizedRootNode.rootNodeGeometry?.minSize?.width, "0"),
          "--phi-root-scaffold-min-height":
            resolvePhiRootNodeCssSize(normalizedRootNode.rootNodeGeometry?.minSize?.height, options?.fallbackMinBlockSize ?? "0"),
          "--phi-root-scaffold-max-width":
            resolvePhiRootNodeCssSize(normalizedRootNode.rootNodeGeometry?.maxSize?.width, "none"),
          "--phi-root-scaffold-max-height":
            resolvePhiRootNodeCssSize(normalizedRootNode.rootNodeGeometry?.maxSize?.height, "none"),
          "--phi-root-scaffold-flex":
            normalizedRootNode.rootNodeGeometry?.size?.width != null || normalizedRootNode.rootNodeGeometry?.size?.height != null ? "0 0 auto" : "1 1 auto",
          "--phi-root-scaffold-explicit-width":
            resolvePhiRootNodeCssSize(normalizedRootNode.rootNodeGeometry?.size?.width, "auto"),
          "--phi-root-scaffold-explicit-height":
            resolvePhiRootNodeCssSize(normalizedRootNode.rootNodeGeometry?.size?.height, "auto"),
        } as React.CSSProperties & Record<`--${string}`, string>
      }
      onClick={
        onOpenInspector
          ? () =>
              onOpenInspector({
                nodeId: normalizedRootNode.id ?? null,
                nodeKey: normalizedRootNode.typeKey,
                nodeKind: normalizedRootNode.kind,
              })
          : undefined
      }
      chrome={renderRootScaffoldToolbar()}
    >
      {wrapRootScaffoldChild(child)}
    </PhiEditScaffoldDrawer>
  );

  const renderChildLayoutNode = (node: PhiCmsLayoutRenderNode) => {
    const nodeKind = "layout" as const;
    const rootProps = resolveLayoutNodeRootProps(node);
    return (
      <PhiAuthoringLayoutEffectsPreviewFrame
        type={node.widgetType}
        kind={nodeKind}
        blockId={node.id}
        config={node.config as Partial<PhiRenderableBlockBase>}
        explicitInlineSize={rootProps.rootNodeGeometry?.size?.width != null}
        explicitBlockSize={rootProps.rootNodeGeometry?.size?.height != null}
      >
        {renderPhiRootNodeScaffold(
          { ...rootProps, regionKey },
          (options) =>
            onOpenInsert?.({
              ...options,
              slotIndex: options?.slotIndex ?? 0,
              targetNodeId: node.id,
            }),
          (options) =>
            onOpenInspector?.({
              nodeId: options?.nodeId ?? node.id,
              nodeKey: options?.nodeKey ?? node.widgetType,
              nodeKind: options?.nodeKind ?? nodeKind,
              openWiring: options?.openWiring,
            }),
          (options) =>
            onDeleteRootNode?.({
              nodeId: options?.nodeId ?? node.id,
              nodeKey: options?.nodeKey ?? node.widgetType,
              nodeKind: options?.nodeKind ?? nodeKind,
            }),
          onUpdateWidgetNodeConfig,
          onUpdateLayoutNodeConfig,
          {
            effectsLabels: options?.effectsLabels,
            demandControllerContext,
            inheritedViewportFlags: resolvedViewportFlags,
            draggable: true,
            resolveDragData: options?.resolveDragData,
            resolveDropTarget: options?.resolveDropTarget,
            resolveWidgetDropTarget: options?.resolveWidgetDropTarget,
            renderInsertPicker: options?.renderInsertPicker,
          },
        )}
      </PhiAuthoringLayoutEffectsPreviewFrame>
    );
  };

  return (
    <PhiAuthoringLayoutLoader
      type={normalizedRootNode.typeKey}
      kind="layout"
      blockId={normalizedRootNode.id ?? -1}
    >
      {(plugin, definition, widgetDefinitionsByType) => {
        const rendered = resolvePhiRootNodeRenderedBody(
          normalizedRootNode,
          "editor",
          plugin,
          definition,
          widgetDefinitionsByType,
          regionKey,
          renderChildLayoutNode,
          onDeleteRootNode
            ? (widget) =>
                onDeleteRootNode({
                  nodeId: widget.id,
                  nodeKey: widget.widgetType,
                  nodeKind: "widget",
                })
            : undefined,
          onOpenInspector
            ? (widget) =>
                onOpenInspector({
                  nodeId: widget.id,
                  nodeKey: widget.widgetType,
                  nodeKind: "widget",
                })
            : undefined,
          onOpenInspector
            ? (widget) =>
                onOpenInspector({
                  nodeId: widget.id,
                  nodeKey: widget.widgetType,
                  nodeKind: "widget",
                  openWiring: true,
                })
            : undefined,
          onUpdateWidgetNodeConfig,
          options?.resolveDragData
            ? (widget) =>
                options.resolveDragData!(
                  {
                    nodeId: widget.id,
                    nodeKind: "widget",
                  },
                  widget.label ?? widget.widgetType,
                )
            : undefined,
          options?.resolveWidgetDropTarget,
          options?.inheritedViewportFlags,
          options?.effectsLabels,
          demandControllerContext,
          options?.authoringCanvas,
        );

        if (!isValidElement(rendered)) {
          return renderRootDrawer(rendered, definition.title);
        }

        const rootNodeRenderConfig = buildPhiBuilderRootNodeRenderConfig(normalizedRootNode, "editor");

        return renderRootDrawer(
          cloneElement(rendered as ReactElement<Record<string, unknown>>, {
            anchor: rootNodeRenderConfig.anchor,
            editSlotAction: (
              _slotIndex: number,
              options?: { defaultPickSection?: "layout" | "widget"; allowWidgetSection?: boolean; slotIndex?: number },
            ) =>
              onOpenInsert?.({
                ...options,
                slotIndex: options?.slotIndex ?? _slotIndex,
                targetNodeId: normalizedRootNode.id,
              }),
            editSlotTitleAction: (slotIndex: number, title: string) =>
              onUpdateLayoutNodeConfig?.(
                syntheticRootNodeForUpdates,
                buildSlotTitlesPatch(normalizedRootNode.rootNodeConfig, slotIndex, title),
              ),
            editSlotAnchor: resolveRootNodeEditSlotAnchor(rootNode),
            editRenderInsertControl: (control: PhiLayoutEditInsertControl) =>
              renderPhiLayoutInsertControl(
                control,
                options?.resolveDropTarget,
                normalizedRootNode.id,
                options?.renderInsertPicker,
              ),
            editRenderTitleControl: renderPhiLayoutTitleControl,
            padding: normalizedRootNode.rootNodePadding?.padding ?? undefined,
            paddingTop: normalizedRootNode.rootNodePadding?.paddingTop ?? undefined,
            paddingRight: normalizedRootNode.rootNodePadding?.paddingRight ?? undefined,
            paddingBottom: normalizedRootNode.rootNodePadding?.paddingBottom ?? undefined,
            paddingLeft: normalizedRootNode.rootNodePadding?.paddingLeft ?? undefined,
            style: resolveRootNodeChromeStyle({
              background: normalizedRootNode.rootNodeBackground,
              border: normalizedRootNode.rootNodeBorder,
              shadow: normalizedRootNode.rootNodeShadow,
              style: (rendered.props as { style?: CSSProperties }).style,
            }),
            rootNodeBackground: normalizedRootNode.rootNodeBackground ?? null,
            rootNodeBorder: normalizedRootNode.rootNodeBorder ?? null,
          } as never),
          definition.title,
        );
      }}
    </PhiAuthoringLayoutLoader>
  );
}

export function renderPhiRootNodePreview(
  rootNode: PhiBuilderRootNodeDraft & {
    editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  },
) {
  const normalizedRootNode = normalizePhiBuilderRootNodeDraft(rootNode);

  return (
    <PhiSlotChildFrame
      className="phi-builder-root-scaffold__slot"
      kind={resolveRootNodeSlotChildKind(normalizedRootNode.kind)}
      blockId={normalizedRootNode.id ?? null}
      explicitInlineSize={normalizedRootNode.rootNodeGeometry?.size?.width != null}
      explicitBlockSize={normalizedRootNode.rootNodeGeometry?.size?.height != null}
      config={normalizedRootNode.rootNodeConfig as Partial<PhiRenderableBlockBase> | null | undefined}
    >
      <PhiAuthoringLayoutLoader
        type={normalizedRootNode.typeKey}
        kind="layout"
        blockId={normalizedRootNode.id ?? null}
      >
        {(plugin, definition, widgetDefinitionsByType) => {
          const rendered = resolvePhiRootNodeRenderedBody(
            normalizedRootNode,
            "preview",
            plugin,
            definition,
            widgetDefinitionsByType,
            null,
          );
          if (rendered == null) {
            return null;
          }

          const rootNodeRenderConfig = buildPhiBuilderRootNodeRenderConfig(normalizedRootNode, "preview");
          return normalizedRootNode.kind !== "widget" && isValidElement(rendered)
            ? cloneElement(rendered as ReactElement<Record<string, unknown>>, {
                anchor: rootNodeRenderConfig.anchor,
                editSlotAnchor: resolveRootNodeEditSlotAnchor(rootNode),
                padding: normalizedRootNode.rootNodePadding?.padding ?? undefined,
                paddingTop: normalizedRootNode.rootNodePadding?.paddingTop ?? undefined,
                paddingRight: normalizedRootNode.rootNodePadding?.paddingRight ?? undefined,
                paddingBottom: normalizedRootNode.rootNodePadding?.paddingBottom ?? undefined,
                paddingLeft: normalizedRootNode.rootNodePadding?.paddingLeft ?? undefined,
                style: resolveRootNodeChromeStyle({
                  background: normalizedRootNode.rootNodeBackground,
                  border: normalizedRootNode.rootNodeBorder,
                  shadow: normalizedRootNode.rootNodeShadow,
                  style: (rendered.props as { style?: CSSProperties }).style,
                }),
                rootNodeBackground: normalizedRootNode.rootNodeBackground ?? null,
                rootNodeBorder: normalizedRootNode.rootNodeBorder ?? null,
              } as never)
            : rendered;
        }}
      </PhiAuthoringLayoutLoader>
    </PhiSlotChildFrame>
  );
}
