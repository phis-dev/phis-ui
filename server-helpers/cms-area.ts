import "server-only";

import { resolvePhiCmsAreaKey, resolvePhiCmsAreaMask } from "../constants/cms-areas";
import { PhiCmsStatus } from "../constants/phi-cms";
import type {
  PhiCmsAreaPresetNode,
  PhiResolvedCmsAreaPresetPayload,
  PhiResolvedCmsPageTree,
} from "../types/cms";
import type { PhiBlockRuntime } from "../types";
import type { PhiRuntimeModuleCatalog } from "../types/cms-plugins";
import {
  instantiatePhiCmsAreaShellPreset,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
} from "../plugins/runtime-modules/descriptor-compiler";

function createSyntheticAreaPreset({
  siteId,
  areaMask,
}: {
  siteId: number;
  areaMask: number;
}): PhiCmsAreaPresetNode {
  return {
    id: -(9000 + areaMask),
    siteId,
    areaMask,
    status: PhiCmsStatus.Published,
    flags: 0,
    visibilityMask: areaMask,
    config: {},
  };
}

function buildAreaPresetPayloadFromTree({
  areaMask,
  siteId,
  tree,
  sourcePreset,
}: {
  areaMask: number;
  siteId: number;
  tree: PhiResolvedCmsPageTree;
  sourcePreset: PhiResolvedCmsAreaPresetPayload["sourcePreset"];
}): PhiResolvedCmsAreaPresetPayload {
  return {
    areaMask,
    sourcePreset,
    preset: {
      preset: createSyntheticAreaPreset({
        siteId,
        areaMask,
      }),
      regions: tree.regions,
      overlays: tree.overlays,
      layoutNodes: tree.layoutNodes,
      contentWidgets: tree.contentWidgets,
      runtimeModuleIds: tree.runtimeModuleIds ?? null,
    },
  };
}

export async function buildPhiLocalCmsAreaPayload({
  areaMask,
  siteId,
  path,
  runtime,
  runtimeModuleCatalog,
}: {
  areaMask: number;
  siteId: number;
  path: string;
  runtime: PhiBlockRuntime;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
}): Promise<PhiResolvedCmsAreaPresetPayload | null> {
  const areaKey = resolvePhiCmsAreaKey(areaMask);
  const resolvedAreaMask = resolvePhiCmsAreaMask(areaKey);

  if (resolvedAreaMask !== areaMask) {
    return null;
  }

  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const binding = resolvePhiCmsAreaShellPresetBinding(catalog, areaKey);
  if (!binding) {
    return null;
  }
  const tree = await instantiatePhiCmsAreaShellPreset({ binding, catalog, siteId, path, runtime });

  return buildAreaPresetPayloadFromTree({
    areaMask: resolvedAreaMask,
    siteId,
    tree,
    sourcePreset: {
      ownerModuleId: binding.descriptor.ownerModuleId,
      presetKey: binding.descriptor.presetKey,
      sourcePresetVersion: binding.descriptor.shellPresetVersion,
    },
  });
}
