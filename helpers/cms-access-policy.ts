import { splitPhiCmsLayoutNamespacedTypeKey } from "../constants/cms-layout-types";
import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiCmsOverlayNode,
  PhiCmsRegionNode,
  PhiResolvedCmsRenderableTree,
} from "../types/cms";
import type { PhiCmsRuntimeRenderRegistry } from "../types/cms-plugins";
import type { PhiResolvedRuntimeModuleSet } from "../types/cms-plugins";
import type { PhiCmsInstanceId } from "../types/cms-instance-id";
import type { PhiAccessViewer, PhiRoleProviderId } from "../types/access";
import {
  canPhiViewerAccess,
  canPhiViewerAccessOwnedPolicy,
  readPhiViewerAccessPolicy,
} from "../types/access";

type AccessRegistry = Pick<
  PhiCmsRuntimeRenderRegistry,
  | "widgetAccessPoliciesByType"
  | "layoutAccessPoliciesByType"
  | "roleProviderIdByWidgetType"
  | "roleProviderIdByLayoutType"
>;

export function buildPhiRuntimeModuleAccessRegistry(
  moduleSet: PhiResolvedRuntimeModuleSet,
): AccessRegistry {
  return {
    widgetAccessPoliciesByType: new Map(
      [...moduleSet.widgetDefinitionsByType].flatMap(([type, entry]) =>
        entry.accessPolicy ? [[type, entry.accessPolicy] as const] : []
      ),
    ),
    layoutAccessPoliciesByType: new Map(
      [...moduleSet.layoutDefinitionsByType].flatMap(([type, entry]) =>
        entry.accessPolicy ? [[type, entry.accessPolicy] as const] : []
      ),
    ),
    roleProviderIdByWidgetType: new Map(
      [...moduleSet.widgetDefinitionsByType].flatMap(([type, entry]) => {
        const providerId =
          moduleSet.moduleDefinitionsById.get(entry.ownerModuleId)?.serverBinding.providerId;
        return providerId ? [[type, providerId] as const] : [];
      }),
    ),
    roleProviderIdByLayoutType: new Map(
      [...moduleSet.layoutDefinitionsByType].flatMap(([type, entry]) => {
        const providerId =
          moduleSet.moduleDefinitionsById.get(entry.ownerModuleId)?.serverBinding.providerId;
        return providerId ? [[type, providerId] as const] : [];
      }),
    ),
  };
}

function readOwnedConfigPolicy(
  config: Record<string, unknown>,
  viewer: PhiAccessViewer,
  ownerProviderId?: PhiRoleProviderId | null,
) {
  if (!Object.prototype.hasOwnProperty.call(config, "accessPolicy")) {
    return true;
  }
  const policy = readPhiViewerAccessPolicy(config.accessPolicy);
  return policy != null &&
    canPhiViewerAccessOwnedPolicy(viewer, policy, ownerProviderId);
}

function resolveLayoutRegistryType(type: string) {
  try {
    const { pluginKey, typeKey } = splitPhiCmsLayoutNamespacedTypeKey(type);
    return `${pluginKey}/${typeKey}`;
  } catch {
    return null;
  }
}

function canAccessRegion(region: PhiCmsRegionNode, viewer: PhiAccessViewer) {
  return readOwnedConfigPolicy(region.config, viewer);
}

function canAccessOverlay(overlay: PhiCmsOverlayNode, viewer: PhiAccessViewer) {
  return readOwnedConfigPolicy(overlay.config, viewer);
}

function canAccessLayout(
  layout: PhiCmsLayoutNode,
  viewer: PhiAccessViewer,
  registry: AccessRegistry,
) {
  const type = resolveLayoutRegistryType(layout.widgetType);
  if (!type) {
    return false;
  }
  const ownerProviderId = registry.roleProviderIdByLayoutType.get(type);
  return (
    canPhiViewerAccessOwnedPolicy(
      viewer,
      registry.layoutAccessPoliciesByType.get(type),
      ownerProviderId,
    ) &&
    readOwnedConfigPolicy(layout.config, viewer, ownerProviderId)
  );
}

function canAccessWidget(
  widget: PhiCmsContentWidgetNode,
  viewer: PhiAccessViewer,
  registry: AccessRegistry,
) {
  const ownerProviderId = registry.roleProviderIdByWidgetType.get(widget.widgetType);
  return (
    canPhiViewerAccessOwnedPolicy(
      viewer,
      registry.widgetAccessPoliciesByType.get(widget.widgetType),
      ownerProviderId,
    ) &&
    readOwnedConfigPolicy(widget.config, viewer, ownerProviderId)
  );
}

export function filterPhiCmsRenderableTreeForViewer<TTree extends PhiResolvedCmsRenderableTree>({
  tree,
  viewer,
  registry,
}: {
  tree: TTree;
  viewer: PhiAccessViewer;
  registry: AccessRegistry;
}): TTree {
  if (
    tree.page &&
    !canPhiViewerAccess(viewer, tree.page.accessPolicy)
  ) {
    return { ...tree, regions: [], overlays: [], layoutNodes: [], contentWidgets: [] };
  }

  const layoutsById = new Map(tree.layoutNodes.map((node) => [node.id, node]));
  const childLayoutsByParent = new Map<PhiCmsInstanceId, PhiCmsLayoutNode[]>();
  const childWidgetsByParent = new Map<PhiCmsInstanceId, PhiCmsContentWidgetNode[]>();

  for (const layout of tree.layoutNodes) {
    if (layout.parentLayoutNodeId == null) {
      continue;
    }
    const children = childLayoutsByParent.get(layout.parentLayoutNodeId) ?? [];
    children.push(layout);
    childLayoutsByParent.set(layout.parentLayoutNodeId, children);
  }
  for (const widget of tree.contentWidgets) {
    const children = childWidgetsByParent.get(widget.parentLayoutNodeId) ?? [];
    children.push(widget);
    childWidgetsByParent.set(widget.parentLayoutNodeId, children);
  }

  const allowedLayoutIds = new Set<PhiCmsInstanceId>();
  const allowedWidgetIds = new Set<PhiCmsInstanceId>();
  const allowedRegionIds = new Set<number>();
  const allowedOverlayIds = new Set<PhiCmsInstanceId>();
  const visiting = new Set<PhiCmsInstanceId>();

  function includeLayout(layoutId: PhiCmsInstanceId): boolean {
    const layout = layoutsById.get(layoutId);
    if (
      !layout ||
      visiting.has(layoutId) ||
      !canAccessLayout(layout, viewer, registry)
    ) {
      return false;
    }
    if (allowedLayoutIds.has(layoutId)) {
      return true;
    }

    visiting.add(layoutId);
    allowedLayoutIds.add(layoutId);
    for (const childLayout of childLayoutsByParent.get(layoutId) ?? []) {
      includeLayout(childLayout.id);
    }
    for (const childWidget of childWidgetsByParent.get(layoutId) ?? []) {
      if (canAccessWidget(childWidget, viewer, registry)) {
        allowedWidgetIds.add(childWidget.id);
      }
    }
    visiting.delete(layoutId);
    return true;
  }

  for (const region of tree.regions) {
    if (
      canAccessRegion(region, viewer) &&
      includeLayout(region.rootLayoutNodeId)
    ) {
      allowedRegionIds.add(region.id);
    }
  }

  for (const overlay of tree.overlays) {
    const rootLayoutNodeIds = [
      overlay.headerLayoutNodeId,
      overlay.bodyLayoutNodeId,
      overlay.footerLayoutNodeId,
    ].filter((id): id is PhiCmsInstanceId => id != null);
    if (!canAccessOverlay(overlay, viewer)) continue;
    const previousLayoutIds = new Set(allowedLayoutIds);
    const previousWidgetIds = new Set(allowedWidgetIds);
    if (rootLayoutNodeIds.every((id) => includeLayout(id))) {
      allowedOverlayIds.add(overlay.id);
    } else {
      for (const id of allowedLayoutIds) {
        if (!previousLayoutIds.has(id)) allowedLayoutIds.delete(id);
      }
      for (const id of allowedWidgetIds) {
        if (!previousWidgetIds.has(id)) allowedWidgetIds.delete(id);
      }
    }
  }

  return {
    ...tree,
    regions: tree.regions.filter((region) => allowedRegionIds.has(region.id)),
    overlays: tree.overlays.filter((overlay) => allowedOverlayIds.has(overlay.id)),
    layoutNodes: tree.layoutNodes.filter((layout) => allowedLayoutIds.has(layout.id)),
    contentWidgets: tree.contentWidgets.filter((widget) => allowedWidgetIds.has(widget.id)),
  };
}
