import { cloneElement, createElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";

import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutRenderNode,
  PhiResolvedCmsRenderableTree,
} from "../../types/cms";
import { comparePhiCmsInstanceIds, type PhiCmsInstanceId } from "../../types/cms-instance-id";
import type { PhiBlockRuntime, PhiSignalScope } from "../../types";
import type { PhiRenderableBlock, PhiRenderableBlockRuntime } from "../../types/renderable-block";
import { readPhiShadow } from "../../types/layout-style";
import { combinePhiBoxShadows, resolvePhiShadow } from "../../helpers/layout-style";
import type {
  PhiCmsLayoutPlugin,
  PhiCmsPreviewWidgetPlugin,
  PhiCmsRenderIssue,
  PhiCmsRuntimeWidgetPlugin,
  PhiRuntimeModuleRenderPolicies,
} from "../../types/cms-plugins";
import { PhiFlexVerticalLayout } from "../layouts/phi-flex-vertical-layout";
import {
  type PhiSlotChildKind,
} from "../../plugins/runtime/slot-size-policy";
import { PhiSlotChildFrame } from "../../plugins/runtime/phi-slot-child-frame";
import { PhiCmsRegionContainer } from "../regions/phi-cms-region-container";
import { PhiCmsRenderErrorBoundary } from "./phi-cms-render-error-boundary";
import { PhiCmsRenderDiagnostic } from "./phi-cms-render-diagnostic";
import type { PhiResolvedRuntimeRenderRegistry } from "../../plugins/runtime-modules/contracts";
import {
  resolvePhiRuntimeLayoutPluginByTypeKey,
  resolvePhiRuntimeLayoutPluginConfigParser,
} from "../../plugins/runtime/layout-plugin-resolution";
import type { PhiCmsRegionConfig } from "../../types";
import type { PhiCmsBorderWidgetConfig } from "../../types/cms-config";
import {
  resolvePhiBackgroundMotion,
  resolvePhiBackgroundMotionHostStyle,
  resolvePhiBackgroundWidgetStyle,
  type PhiCmsBackgroundWidgetConfig,
} from "../widgets/config/background";
import { PhiBackgroundMotionLayer } from "./clients/phi-background-motion-layer-lazy";
import { resolvePhiBorderWidgetStyle } from "../../helpers/border-widget-style";
import {
  isPhiCmsPageOwnedRegion,
  resolvePhiCmsRegionKey,
} from "../../helpers/cms-region-keys";
import { splitPhiCmsLayoutNamespacedTypeKey } from "../../constants/cms-layout-types";
import {
  createPhiSignalAddress,
  readPhiSignalRouteSet,
} from "../../types/signals";
import {
  readPhiRuntimeTreeRenderMode,
  resolvePhiRuntimeWidgetImplementationMode,
  type PhiRuntimeWidgetImplementationMode,
} from "../../plugins/runtime-modules/render-mode";
import { filterPhiCmsRenderableTreeForViewer } from "../../helpers/cms-access-policy";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../constants/runtime-render-client-types";

function resolvePhiRuntimeWidgetRenderer(
  runtimePlugin: PhiCmsRuntimeWidgetPlugin<unknown> | null,
  previewPlugin: PhiCmsPreviewWidgetPlugin<unknown> | null,
  implementationMode: PhiRuntimeWidgetImplementationMode | null,
) {
  if (implementationMode === "runtime") {
    return runtimePlugin?.render ?? null;
  }
  if (implementationMode === "preview") {
    return previewPlugin?.renderPreview ?? null;
  }
  return null;
}

function resolvePhiRuntimeLayoutRenderer(
  plugin: PhiCmsLayoutPlugin<unknown>,
  policies: PhiRuntimeModuleRenderPolicies | undefined,
  renderMode: "live" | "preview" | "editor",
) {
  if (!policies) {
    return null;
  }
  if (renderMode === "live") {
    return policies.runtime === "custom" ? plugin.render : null;
  }
  if (renderMode === "preview") {
    return policies.preview === "runtimeReadOnly" ? plugin.render : null;
  }
  if (policies.authoring === "custom") {
    return plugin.renderEditor;
  }
  return policies.preview === "runtimeReadOnly" ? plugin.render : null;
}

function resolveLayoutRegistryType(type: string) {
  const { pluginKey, typeKey } = splitPhiCmsLayoutNamespacedTypeKey(type);
  return `${pluginKey}/${typeKey}`;
}

function renderCmsDiagnostic(issue: PhiCmsRenderIssue, error?: unknown) {
  console.warn("[phi-cms-layout-renderer] CMS block is not renderable.", {
    issue,
    error,
  });
  return <PhiCmsRenderDiagnostic issue={issue} />;
}

function wrapPhiRuntimeModuleUiProvider(
  node: ReactNode,
  type: string,
  ownerModuleIdsByType: ReadonlyMap<string, string>,
  registry: PhiResolvedRuntimeRenderRegistry,
) {
  const ownerModuleId = ownerModuleIdsByType.get(type);
  const Provider = ownerModuleId
    ? registry.uiProvidersByModuleId.get(ownerModuleId as `${string}/${string}`)
    : null;
  return Provider ? createElement(Provider, null, node) : node;
}

export type PhiCmsLayoutRendererProps = {
  tree: PhiResolvedCmsRenderableTree;
  runtime: PhiBlockRuntime;
  regionClassName?: string;
  regionTypes?: number[];
  stackGap?: number | string;
  registry: PhiResolvedRuntimeRenderRegistry;
};

type PhiCmsRenderContext = Pick<PhiCmsLayoutRendererProps, "runtime" | "tree"> & {
  regionConfig?: PhiCmsRegionConfig;
  signalScope: Extract<PhiSignalScope, "area" | "page">;
  signalRuntime: PhiRenderableBlockRuntime;
  layoutPluginsByType: ReadonlyMap<string, PhiCmsLayoutPlugin<unknown>>;
  runtimeRegistry: PhiResolvedRuntimeRenderRegistry;
  signalParticipants: ReadonlySet<string>;
};

type PhiRenderedChildEntry = {
  slotIndex: number;
  sortOrder: number;
  id: PhiCmsInstanceId;
  kind: "layout" | "widget";
  element: ReactNode;
};

function resolvePhiTreeSignalParticipants(tree: PhiResolvedCmsRenderableTree) {
  const participants = new Set<string>();

  for (const node of [...tree.overlays, ...tree.layoutNodes, ...tree.contentWidgets]) {
    const routes = readPhiSignalRouteSet(node.config.signalRoutes);
    if (!routes) {
      continue;
    }

    participants.add(createPhiSignalAddress("cms", node.id));
    for (const route of [...(routes.emits ?? []), ...(routes.listens ?? [])]) {
      if (typeof route.receiver === "string") {
        participants.add(route.receiver);
      }
    }
  }

  return participants;
}

function buildLayoutNodeResolver(tree: PhiResolvedCmsRenderableTree) {
  const childWidgetsByParent = new Map<PhiCmsInstanceId, PhiCmsContentWidgetNode[]>();
  const childLayoutsByParent = new Map<PhiCmsInstanceId, typeof tree.layoutNodes>();

  for (const widget of tree.contentWidgets) {
    const current = childWidgetsByParent.get(widget.parentLayoutNodeId) ?? [];
    current.push(widget);
    childWidgetsByParent.set(widget.parentLayoutNodeId, current);
  }

  for (const layout of tree.layoutNodes) {
    if (layout.parentLayoutNodeId == null) {
      continue;
    }

    const current = childLayoutsByParent.get(layout.parentLayoutNodeId) ?? [];
    current.push(layout);
    childLayoutsByParent.set(layout.parentLayoutNodeId, current);
  }

  const sortNodes = <T extends { sortOrder: number; id: PhiCmsInstanceId }>(nodes: T[]) =>
    nodes.sort((left, right) => left.sortOrder - right.sortOrder || comparePhiCmsInstanceIds(left.id, right.id));

  for (const widgets of childWidgetsByParent.values()) {
    sortNodes(widgets);
  }
  for (const layouts of childLayoutsByParent.values()) {
    sortNodes(layouts);
  }

  const layoutById = new Map(tree.layoutNodes.map((widget) => [widget.id, widget]));

  function createNode(layoutId: PhiCmsInstanceId): PhiCmsLayoutRenderNode | null {
    const layout = layoutById.get(layoutId);
    if (!layout) {
      return null;
    }

    const childLayouts = (childLayoutsByParent.get(layout.id) ?? [])
      .map((candidate) => createNode(candidate.id))
      .filter((candidate): candidate is PhiCmsLayoutRenderNode => candidate !== null);

    const childWidgets = childWidgetsByParent.get(layout.id) ?? [];

    return {
      ...layout,
      childLayouts,
      childWidgets,
    };
  }

  return createNode;
}

function buildLayoutTree(tree: PhiResolvedCmsRenderableTree) {
  const createNode = buildLayoutNodeResolver(tree);
  return tree.regions
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
    .map((region) => ({
      region,
      root: createNode(region.rootLayoutNodeId),
    }))
    .filter((entry) => entry.root !== null);
}

export function PhiCmsOverlayRenderer({
  tree,
  runtime,
  registry,
  signalScope,
}: {
  tree: PhiResolvedCmsRenderableTree;
  runtime: PhiBlockRuntime;
  registry: PhiResolvedRuntimeRenderRegistry;
  signalScope: Extract<PhiSignalScope, "area" | "page">;
}) {
  const createNode = buildLayoutNodeResolver(tree);
  const layoutPluginsByType = registry.layoutPluginsByType;
  const signalParticipants = resolvePhiTreeSignalParticipants(tree);
  const signalRuntime: PhiRenderableBlockRuntime = {
    siteKey: runtime.site.key,
    publicUrl: runtime.site.publicUrl ?? null,
    defaultLang: runtime.locale.current,
    area: runtime.area,
    pageKey: runtime.page?.path ?? null,
  };

  return tree.overlays
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || comparePhiCmsInstanceIds(left.id, right.id))
    .map((overlay) => {
      const renderRoot = (layoutId: PhiCmsInstanceId | null, zone: "header" | "body" | "footer") => {
        if (layoutId == null) return null;
        const root = createNode(layoutId);
        if (!root) return null;
        return wrapPhiRenderedSlotChild(renderLayoutNode(root, {
          runtime,
          tree,
          regionConfig: undefined,
          signalScope,
          signalRuntime,
          layoutPluginsByType,
          runtimeRegistry: registry,
          signalParticipants,
        }), {
          kind: "layout",
          blockId: root.id,
          config: root.config as Partial<PhiRenderableBlock> | null | undefined,
          key: `overlay-${zone}-layout-${root.id}`,
          typeKey: root.widgetType,
          moduleId: registry.ownerModuleIdByLayoutType.get(resolveLayoutRegistryType(root.widgetType)) ?? null,
          signalScope,
          signalRuntime,
          signalParticipant:
            signalParticipants.has(createPhiSignalAddress("cms", root.id)) ||
            layoutPluginsByType.get(resolveLayoutRegistryType(root.widgetType))?.runtimeSignals != null,
        });
      };
      const renderedHeader = renderRoot(overlay.headerLayoutNodeId, "header");
      const renderedBody = renderRoot(overlay.bodyLayoutNodeId, "body");
      const renderedFooter = renderRoot(overlay.footerLayoutNodeId, "footer");
      if (!renderedBody ||
        (overlay.headerLayoutNodeId != null && !renderedHeader) ||
        (overlay.footerLayoutNodeId != null && !renderedFooter)) return null;
      return (
        <PhiRuntimeModuleRenderClientHost
          key={`overlay-${overlay.id}`}
          type={PhiRuntimeRenderClientType.OverlayContainer}
          componentProps={{
            overlayId: overlay.id,
            overlayType: overlay.overlayType,
            config: overlay.config,
            signalScope,
            header: renderedHeader,
            body: renderedBody,
            footer: renderedFooter,
          }}
        />
      );
    });
}

function renderContentWidget(
  widget: PhiCmsContentWidgetNode,
  context: PhiCmsRenderContext,
): ReactNode {
  const renderMode = readPhiRuntimeTreeRenderMode(widget.config);
  const policies = context.runtimeRegistry.widgetRenderPoliciesByType.get(widget.widgetType);
  const implementationMode = policies
    ? resolvePhiRuntimeWidgetImplementationMode(policies, renderMode)
    : null;
  const runtimePlugin = implementationMode === "runtime"
    ? context.runtimeRegistry.runtimeWidgetPluginsByType.get(widget.widgetType) ?? null
    : null;
  const previewPlugin = implementationMode === "preview"
    ? context.runtimeRegistry.previewWidgetPluginsByType.get(widget.widgetType) ?? null
    : null;
  const widgetPlugin = runtimePlugin ?? previewPlugin;

  if (widgetPlugin) {
    try {
      const renderWidget = resolvePhiRuntimeWidgetRenderer(
        runtimePlugin,
        previewPlugin,
        implementationMode,
      );
      const moduleId = context.runtimeRegistry.ownerModuleIdByWidgetType.get(widget.widgetType) ?? null;
      if (!renderWidget) {
        return renderCmsDiagnostic({
          code: "missing-renderer",
          kind: "widget",
          type: widget.widgetType,
          blockId: widget.id,
          moduleId,
          detail: `The declared ${renderMode} render policy has no runtime implementation.`,
        });
      }
      const rendered = normalizeRenderedCmsNode(renderWidget({
        widget,
        runtime: context.runtime,
        tree: context.tree,
        regionConfig: context.regionConfig,
        config: widgetPlugin.parseConfig(widget.config),
        registry: context.runtimeRegistry,
      }), {
        kind: "widget",
        id: widget.id,
        typeKey: widget.widgetType,
        renderMode,
        moduleId,
      });
      return wrapPhiRuntimeModuleUiProvider(
        rendered,
        widget.widgetType,
        context.runtimeRegistry.ownerModuleIdByWidgetType,
        context.runtimeRegistry,
      );
    } catch (error) {
      return renderCmsDiagnostic({
        code: "render-failed",
        kind: "widget",
        type: widget.widgetType,
        blockId: widget.id,
        moduleId: context.runtimeRegistry.ownerModuleIdByWidgetType.get(widget.widgetType) ?? null,
        detail: error instanceof Error ? error.message : String(error),
      }, error);
    }
  }

  const implementationIssue = implementationMode === "runtime"
    ? context.runtimeRegistry.runtimeWidgetRenderIssuesByType.get(widget.widgetType)
    : implementationMode === "preview"
      ? context.runtimeRegistry.previewWidgetRenderIssuesByType.get(widget.widgetType)
      : null;
  const registryIssue = implementationIssue ??
    context.runtimeRegistry.renderIssuesByWidgetType.get(widget.widgetType);
  return renderCmsDiagnostic({
    code: registryIssue?.code ?? "missing-renderer",
    kind: "widget",
    type: widget.widgetType,
    blockId: widget.id,
    moduleId:
      registryIssue?.moduleId ??
      context.runtimeRegistry.ownerModuleIdByWidgetType.get(widget.widgetType) ??
      null,
    detail: registryIssue?.detail ?? "Widget is missing from the resolved runtime registry.",
  });
}

function isRenderableNode(node: ReactNode) {
  return node !== null && node !== undefined && node !== false;
}

function isThenable<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

function isRenderableElementType(type: unknown) {
  return (
    typeof type === "string" ||
    typeof type === "function" ||
    (typeof type === "object" && type !== null && "$$typeof" in type)
  );
}

function renderInvalidCmsNodeDiagnostic(
  kind: PhiCmsRenderIssue["kind"],
  id: PhiCmsInstanceId,
  typeKey: string,
  renderMode: string,
  moduleId?: PhiCmsRenderIssue["moduleId"],
) {
  return renderCmsDiagnostic({
    code: "invalid-render-output",
    kind,
    type: typeKey,
    blockId: id,
    moduleId,
    detail: `Invalid ${renderMode} render output.`,
  });
}

function normalizeRenderedCmsNode(
  node: ReactNode,
  meta: {
    kind: PhiCmsRenderIssue["kind"];
    id: PhiCmsInstanceId;
    typeKey: string;
    renderMode: string;
    moduleId?: PhiCmsRenderIssue["moduleId"];
  },
): ReactNode {
  if (isThenable(node)) {
    return Promise.resolve(node)
      .then((resolvedNode) => normalizeRenderedCmsNode(resolvedNode, meta))
      .catch((error) => renderCmsDiagnostic({
        code: "render-failed",
        kind: meta.kind,
        type: meta.typeKey,
        blockId: meta.id,
        moduleId: meta.moduleId,
        detail: error instanceof Error ? error.message : String(error),
      }, error)) as unknown as ReactNode;
  }

  if (isValidElement(node) && !isRenderableElementType(node.type)) {
    return renderInvalidCmsNodeDiagnostic(meta.kind, meta.id, meta.typeKey, meta.renderMode, meta.moduleId);
  }

  return node;
}

function withLayoutRenderKey(node: ReactNode, key: string) {
  return isValidElement(node) ? cloneElement(node as ReactElement<Record<string, unknown>>, { key } as never) : node;
}

function wrapPhiRenderedSlotChild(
  node: ReactNode,
  options: {
    kind: PhiSlotChildKind;
    slotSizePolicy?: PhiCmsRuntimeWidgetPlugin<unknown>["slotSizePolicy"] | PhiCmsLayoutPlugin<unknown>["slotSizePolicy"];
    blockId?: PhiCmsInstanceId | null;
    config?: Partial<PhiRenderableBlock> | null | undefined;
    key: string;
    typeKey: string;
    moduleId?: PhiCmsRenderIssue["moduleId"];
    signalScope: Extract<PhiSignalScope, "area" | "page">;
    signalRuntime: PhiRenderableBlockRuntime;
    signalParticipant?: boolean;
  },
): ReactNode {
  if (!isRenderableNode(node)) {
    return node;
  }

  if (isThenable(node)) {
    return node.then((resolvedNode) => wrapPhiRenderedSlotChild(resolvedNode, options)) as unknown as ReactNode;
  }

  return (
    <PhiSlotChildFrame
      key={options.key}
      kind={options.kind}
      slotSizePolicy={options.slotSizePolicy}
      blockId={options.blockId}
      config={options.config}
      runtime={options.signalRuntime}
      signalScope={options.signalScope}
      signalParticipant={options.signalParticipant}
    >
      <PhiCmsRenderErrorBoundary
        kind={options.kind}
        blockId={options.blockId}
        typeKey={options.typeKey}
        moduleId={options.moduleId}
      >
        {node}
      </PhiCmsRenderErrorBoundary>
    </PhiSlotChildFrame>
  );
}

function buildRenderedChildEntries(
  node: PhiCmsLayoutRenderNode,
  context: PhiCmsRenderContext,
): PhiRenderedChildEntry[] {
  return [
    ...node.childLayouts.map((child) => {
      const resolvedLayoutPlugin = resolvePhiRuntimeLayoutPluginByTypeKey(child.widgetType, context.layoutPluginsByType);
      const layoutPlugin = resolvedLayoutPlugin;

      return {
        slotIndex: child.slotIndex,
        sortOrder: child.sortOrder,
        id: child.id,
        kind: "layout" as const,
        element: wrapPhiRenderedSlotChild(renderLayoutNode(child, context), {
          kind: "layout",
          slotSizePolicy: layoutPlugin?.slotSizePolicy,
          blockId: child.id,
          config: child.config as Partial<PhiRenderableBlock> | null | undefined,
          key: `layout-${child.id}`,
          typeKey: child.widgetType,
          moduleId: context.runtimeRegistry.ownerModuleIdByLayoutType.get(resolveLayoutRegistryType(child.widgetType)) ?? null,
          signalScope: context.signalScope,
          signalRuntime: context.signalRuntime,
          signalParticipant:
            context.signalParticipants.has(createPhiSignalAddress("cms", child.id)) ||
            layoutPlugin?.runtimeSignals != null,
        }),
      };
    }),
    ...node.childWidgets.map((child) => {
      return {
        slotIndex: child.slotIndex,
        sortOrder: child.sortOrder,
        id: child.id,
        kind: "widget" as const,
        element: wrapPhiRenderedSlotChild(renderContentWidget(child, context), {
          kind: "widget",
          slotSizePolicy: context.runtimeRegistry.widgetSlotSizePoliciesByType.get(child.widgetType),
          blockId: child.id,
          config: child.config as Partial<PhiRenderableBlock> | null | undefined,
          key: `widget-${child.id}`,
          typeKey: child.widgetType,
          moduleId: context.runtimeRegistry.ownerModuleIdByWidgetType.get(child.widgetType) ?? null,
          signalScope: context.signalScope,
          signalRuntime: context.signalRuntime,
          signalParticipant:
            context.signalParticipants.has(createPhiSignalAddress("cms", child.id)) ||
            context.runtimeRegistry.runtimeWidgetPluginsByType.get(child.widgetType)?.runtimeSignals != null ||
            context.runtimeRegistry.previewWidgetPluginsByType.get(child.widgetType)?.runtimeSignals != null,
        }),
      };
    }),
  ].sort((left, right) => left.sortOrder - right.sortOrder || comparePhiCmsInstanceIds(left.id, right.id));
}

function renderChildren(
  node: PhiCmsLayoutRenderNode,
  context: PhiCmsRenderContext,
) {
  return buildRenderedChildEntries(node, context)
    .filter((entry) => isRenderableNode(entry.element))
    .map((entry) => withLayoutRenderKey(entry.element, `${entry.kind}-${entry.id}`));
}

function buildSequentialSlots(entries: readonly PhiRenderedChildEntry[]) {
  return entries
    .filter((entry) => isRenderableNode(entry.element))
    .reduce<ReactNode[]>((slots, entry) => {
      slots[entry.slotIndex] = withLayoutRenderKey(entry.element, `${entry.kind}-${entry.id}`);
      return slots;
    }, []);
}

function renderSequentialSlotChildren(
  node: PhiCmsLayoutRenderNode,
  context: PhiCmsRenderContext,
) {
  return buildSequentialSlots(buildRenderedChildEntries(node, context));
}

async function renderResolvedSequentialSlotChildren(
  node: PhiCmsLayoutRenderNode,
  context: PhiCmsRenderContext,
) {
  const entries = buildRenderedChildEntries(node, context);

  const resolvedEntries = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      element: await Promise.resolve(entry.element as unknown as Promise<ReactNode> | ReactNode),
    })),
  );

  return buildSequentialSlots(resolvedEntries);
}

function renderLayoutNode(
  node: PhiCmsLayoutRenderNode,
  context: PhiCmsRenderContext,
): ReactNode {
  const resolvedLayoutPlugin = resolvePhiRuntimeLayoutPluginByTypeKey(node.widgetType, context.layoutPluginsByType);
  const layoutPlugin = resolvedLayoutPlugin;
  const registryType = resolveLayoutRegistryType(node.widgetType);
  const moduleId = context.runtimeRegistry.ownerModuleIdByLayoutType.get(registryType) ?? null;

  if (layoutPlugin) {
    try {
      const renderMode =
        node.config.renderMode === "preview" || node.config.renderMode === "editor"
          ? node.config.renderMode
          : "live";
      const renderLayout = resolvePhiRuntimeLayoutRenderer(
        layoutPlugin,
        context.runtimeRegistry.layoutRenderPoliciesByType.get(registryType),
        renderMode,
      );
      const parseLayoutConfig = resolvePhiRuntimeLayoutPluginConfigParser(
        layoutPlugin,
      );
      if (!renderLayout) {
        return renderCmsDiagnostic({
          code: "missing-renderer",
          kind: "layout",
          type: node.widgetType,
          blockId: node.id,
          moduleId,
          detail: `No ${renderMode} renderer is declared.`,
        });
      }
      const rendered = renderLayout({
        node,
        layoutKind: layoutPlugin.layoutKind,
        runtime: context.runtime,
        tree: context.tree,
        regionConfig: context.regionConfig,
        config: parseLayoutConfig ? parseLayoutConfig(node.config) : layoutPlugin.parseConfig(node.config),
        renderChildren: (targetNode) => renderChildren(targetNode, context),
        renderSequentialSlotChildren: (targetNode) => renderSequentialSlotChildren(targetNode, context),
        renderResolvedSequentialSlotChildren: (targetNode) => renderResolvedSequentialSlotChildren(targetNode, context),
      });
      const normalizedRendered = normalizeRenderedCmsNode(rendered, {
        kind: "layout",
        id: node.id,
        typeKey: node.widgetType,
        renderMode,
        moduleId,
      });
      const rootNodeBackground =
        typeof node.config.rootNodeBackground === "object" && node.config.rootNodeBackground != null
          ? (node.config.rootNodeBackground as PhiCmsBackgroundWidgetConfig)
          : null;
      const rootNodeBorder =
        typeof node.config.rootNodeBorder === "object" && node.config.rootNodeBorder != null
          ? (node.config.rootNodeBorder as PhiCmsBorderWidgetConfig)
          : null;
      const rootNodeShadow = readPhiShadow(node.config.rootNodeShadow) ?? null;

      if (
        !isValidElement(normalizedRendered) ||
        (rootNodeBackground == null && rootNodeBorder == null && rootNodeShadow == null)
      ) {
        return wrapPhiRuntimeModuleUiProvider(
          normalizedRendered,
          registryType,
          context.runtimeRegistry.ownerModuleIdByLayoutType,
          context.runtimeRegistry,
        );
      }

      const renderedProps = normalizedRendered.props as { style?: CSSProperties };
      const rootNodeBackgroundMotion = resolvePhiBackgroundMotion(rootNodeBackground);
      const rootNodeBackgroundStyle = rootNodeBackground == null
        ? {}
        : rootNodeBackgroundMotion == null
          ? resolvePhiBackgroundWidgetStyle(rootNodeBackground)
          : resolvePhiBackgroundMotionHostStyle(rootNodeBackground);
      const styledRendered = cloneElement(normalizedRendered as ReactElement<Record<string, unknown>>, {
        rootNodeBackground,
        rootNodeBorder,
        backgroundLayer: rootNodeBackgroundMotion == null || rootNodeBackground == null
          ? null
          : <PhiBackgroundMotionLayer config={rootNodeBackground} />,
        style: {
          ...renderedProps.style,
          ...rootNodeBackgroundStyle,
          ...(rootNodeBackgroundMotion == null ? {} : { position: "relative", isolation: "isolate" }),
          ...(rootNodeBorder == null ? {} : resolvePhiBorderWidgetStyle(rootNodeBorder)),
          boxShadow: combinePhiBoxShadows(rootNodeBackgroundStyle.boxShadow, resolvePhiShadow(rootNodeShadow)),
        },
      } as never);
      return wrapPhiRuntimeModuleUiProvider(
        styledRendered,
        registryType,
        context.runtimeRegistry.ownerModuleIdByLayoutType,
        context.runtimeRegistry,
      );
    } catch (error) {
      return renderCmsDiagnostic({
        code: "render-failed",
        kind: "layout",
        type: node.widgetType,
        blockId: node.id,
        moduleId,
        detail: error instanceof Error ? error.message : String(error),
      }, error);
    }
  }

  const registryIssue = context.runtimeRegistry.renderIssuesByLayoutType.get(registryType);
  return renderCmsDiagnostic({
    code: registryIssue?.code ?? "missing-renderer",
    kind: "layout",
    type: node.widgetType,
    blockId: node.id,
    moduleId: registryIssue?.moduleId ?? moduleId,
    detail: registryIssue?.detail ?? "Layout is missing from the resolved runtime registry.",
  });
}

export async function PhiCmsLayoutRenderer({
  tree,
  runtime,
  regionClassName,
  regionTypes,
  stackGap = 21,
  registry,
}: PhiCmsLayoutRendererProps) {
  const filteredTree = filterPhiCmsRenderableTreeForViewer({
    tree,
    viewer: runtime.viewer,
    registry,
  });
  const signalParticipants = resolvePhiTreeSignalParticipants(filteredTree);
  const allowedRegionTypes = regionTypes ? new Set(regionTypes) : null;
  const layoutPluginsByType = registry.layoutPluginsByType;
  const resolvedRegions = buildLayoutTree(filteredTree).filter(({ region }) =>
    allowedRegionTypes ? allowedRegionTypes.has(region.regionType) : true,
  );
  const renderableRegions = resolvedRegions.filter(({ root }) => root != null);

  if (renderableRegions.length === 0) {
    return null;
  }

  const renderedRegions = renderableRegions.map(({ region, root }) => {
    const regionKey = resolvePhiCmsRegionKey(region.regionType) ?? "content";
    const signalScope: Extract<PhiSignalScope, "area" | "page"> =
      isPhiCmsPageOwnedRegion(regionKey) ? "page" : "area";
    const signalRuntime: PhiRenderableBlockRuntime = {
      siteKey: runtime.site.key,
      publicUrl: runtime.site.publicUrl ?? null,
      defaultLang: runtime.locale.current,
      area: runtime.area,
      pageKey: runtime.page?.path ?? null,
      regionKey,
    };
    const renderedRoot = root
      ? wrapPhiRenderedSlotChild(renderLayoutNode(root, {
          runtime,
          tree: filteredTree,
          regionConfig: region.config,
          signalScope,
          signalRuntime,
          layoutPluginsByType,
          runtimeRegistry: registry,
          signalParticipants,
        }), {
          kind: "layout",
          blockId: root.id,
          config: root.config as Partial<PhiRenderableBlock> | null | undefined,
          key: `root-layout-${root.id}`,
          typeKey: root.widgetType,
          moduleId: registry.ownerModuleIdByLayoutType.get(resolveLayoutRegistryType(root.widgetType)) ?? null,
          signalScope,
          signalRuntime,
          signalParticipant:
            signalParticipants.has(createPhiSignalAddress("cms", root.id)) ||
            layoutPluginsByType.get(resolveLayoutRegistryType(root.widgetType))?.runtimeSignals != null,
        })
      : null;

    return (
      <PhiCmsRegionContainer
        key={`region-${region.id}`}
        className={regionClassName}
        regionKey={regionKey}
        regionType={region.regionType}
        config={region.config}
        shellTheme={runtime.site.theme?.shell}
        previewMode={root?.config.renderMode === "preview"}
        runtime={runtime}
        signalParticipant={signalParticipants.has(createPhiSignalAddress("region", regionKey))}
      >
        {renderedRoot}
      </PhiCmsRegionContainer>
    );
  });

  if (renderedRegions.length === 1) {
    return renderedRegions[0];
  }

  return (
    <PhiFlexVerticalLayout
      gap={stackGap}
      size={{ width: "100%" }}
      maxSize={{ width: "100%" }}
      style={{ marginInline: 0 }}
      slots={renderedRegions}
    />
  );
}
