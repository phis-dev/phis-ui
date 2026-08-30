import type { PhiCmsRegionTypeValue } from "../../constants/phi-cms";
import { prunePhiSignalRoutesFromConfig } from "../../helpers/signal-route-lifecycle";
import {
  createPhiPresetCmsInstanceId,
  type PhiCmsInstanceId,
} from "../../types/cms-instance-id";
import type { PhiCmsPresetIdentity } from "../../types/cms-module-descriptors";
import type { PhiResolvedCmsPageTree } from "../../types/cms";
import { PHI_SIGNAL_SCOPES, createPhiSignalAddress } from "../../types/signals";

export function omitPhiCmsShellCompositionNodes(
  tree: PhiResolvedCmsPageTree,
  sourceIdentity: PhiCmsPresetIdentity,
  omitRegionTypes: readonly PhiCmsRegionTypeValue[],
  omitNodeKeys: readonly string[],
) {
  const omittedTypes = new Set<number>(omitRegionTypes);
  const explicitOmittedIds = new Set<PhiCmsInstanceId>(
    omitNodeKeys.map((nodeKey) => createPhiPresetCmsInstanceId({
      domain: "area",
      ...sourceIdentity,
      nodeKey,
    })),
  );
  const omittedLayoutIds = new Set<PhiCmsInstanceId>([
    ...tree.layoutNodes.filter((node) => explicitOmittedIds.has(node.id)).map((node) => node.id),
    ...tree.regions.filter((region) => omittedTypes.has(region.regionType)).map((region) => region.rootLayoutNodeId),
    ...tree.overlays.filter((overlay) => explicitOmittedIds.has(overlay.id)).flatMap((overlay) => [
      overlay.headerLayoutNodeId,
      overlay.bodyLayoutNodeId,
      overlay.footerLayoutNodeId,
    ].filter((id): id is PhiCmsInstanceId => id != null)),
  ]);
  const omittedOverlayIds = new Set<PhiCmsInstanceId>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of tree.layoutNodes) {
      if (node.parentLayoutNodeId != null && omittedLayoutIds.has(node.parentLayoutNodeId)) {
        const previousSize = omittedLayoutIds.size;
        omittedLayoutIds.add(node.id);
        changed ||= omittedLayoutIds.size !== previousSize;
      }
    }
    for (const overlay of tree.overlays) {
      const rootLayoutNodeIds = [
        overlay.headerLayoutNodeId,
        overlay.bodyLayoutNodeId,
        overlay.footerLayoutNodeId,
      ].filter((id): id is PhiCmsInstanceId => id != null);
      if (explicitOmittedIds.has(overlay.id) || rootLayoutNodeIds.some((id) => omittedLayoutIds.has(id))) {
        const previousOverlaySize = omittedOverlayIds.size;
        omittedOverlayIds.add(overlay.id);
        changed ||= omittedOverlayIds.size !== previousOverlaySize;
        for (const id of rootLayoutNodeIds) {
          const previousLayoutSize = omittedLayoutIds.size;
          omittedLayoutIds.add(id);
          changed ||= omittedLayoutIds.size !== previousLayoutSize;
        }
      }
    }
  }
  const omittedWidgetIds = new Set(
    tree.contentWidgets
      .filter((node) => explicitOmittedIds.has(node.id) || omittedLayoutIds.has(node.parentLayoutNodeId))
      .map((node) => node.id),
  );
  const omittedTargets = [...omittedOverlayIds, ...omittedLayoutIds, ...omittedWidgetIds].flatMap((id) =>
    PHI_SIGNAL_SCOPES.map((scope) => ({ address: createPhiSignalAddress("cms", id), scope })),
  );
  const pruneConfig = (config: Record<string, unknown>) =>
    prunePhiSignalRoutesFromConfig(config, omittedTargets);
  const clearRoot = (value: PhiCmsInstanceId | null) =>
    value != null && omittedLayoutIds.has(value) ? null : value;
  return {
    ...tree,
    page: {
      ...tree.page,
      heroRootLayoutNodeId: clearRoot(tree.page.heroRootLayoutNodeId),
      headerBottomRootLayoutNodeId: clearRoot(tree.page.headerBottomRootLayoutNodeId),
      siderRightRootLayoutNodeId: clearRoot(tree.page.siderRightRootLayoutNodeId),
      footerTopRootLayoutNodeId: clearRoot(tree.page.footerTopRootLayoutNodeId),
      drawerRightRootLayoutNodeId: clearRoot(tree.page.drawerRightRootLayoutNodeId),
      contentRootLayoutNodeId: clearRoot(tree.page.contentRootLayoutNodeId),
    },
    regions: tree.regions.filter((region) => !omittedTypes.has(region.regionType)).map((region) => ({
      ...region,
      config: pruneConfig(region.config),
    })),
    overlays: tree.overlays.filter((overlay) => !omittedOverlayIds.has(overlay.id)).map((overlay) => ({
      ...overlay,
      config: pruneConfig(overlay.config),
    })),
    layoutNodes: tree.layoutNodes.filter((node) => !omittedLayoutIds.has(node.id)).map((node) => ({
      ...node,
      config: pruneConfig(node.config),
    })),
    contentWidgets: tree.contentWidgets
      .filter((node) => !omittedWidgetIds.has(node.id) && !omittedLayoutIds.has(node.parentLayoutNodeId))
      .map((node) => ({ ...node, config: pruneConfig(node.config) })),
  } satisfies PhiResolvedCmsPageTree;
}

export function mergePhiCmsShellTrees(
  base: PhiResolvedCmsPageTree,
  overlay: PhiResolvedCmsPageTree,
) {
  const regionTypes = new Set<number>();
  for (const region of [...base.regions, ...overlay.regions]) {
    if (regionTypes.has(region.regionType)) {
      throw new Error(`Area shell composition contains duplicate Region type "${String(region.regionType)}".`);
    }
    regionTypes.add(region.regionType);
  }
  return {
    ...base,
    ...overlay,
    pageMeta: Object.prototype.hasOwnProperty.call(overlay, "pageMeta") ? overlay.pageMeta : base.pageMeta,
    runtimeModuleIds: Object.prototype.hasOwnProperty.call(overlay, "runtimeModuleIds")
      ? overlay.runtimeModuleIds
      : base.runtimeModuleIds,
    regions: [...base.regions, ...overlay.regions],
    overlays: [...base.overlays, ...overlay.overlays],
    layoutNodes: [...base.layoutNodes, ...overlay.layoutNodes],
    contentWidgets: [...base.contentWidgets, ...overlay.contentWidgets],
  } satisfies PhiResolvedCmsPageTree;
}
