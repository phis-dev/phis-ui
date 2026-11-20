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
import type { PhiCmsAreaShellPresetBinding } from "../types/cms-module-descriptors";
import { applyPhiPresetTreePublishedContent } from "./cms-bound-content";
import { createPhiModuleMediaLoader } from "../gateway/server-module-media";
import { buildPhiAreaShellPresetConfig } from "../helpers/cms-area-config";
import {
  instantiatePhiCmsAreaShellPreset,
  resolvePhiCmsDescriptorCatalog,
} from "../plugins/runtime-modules/descriptor-compiler";

/** The Area row a shell preset stands for: no stored id, and the config the shell proposes. */
function createSyntheticAreaPreset({
  siteId,
  areaMask,
  config,
}: {
  siteId: number;
  areaMask: number;
  config: Record<string, unknown>;
}): PhiCmsAreaPresetNode {
  return {
    id: -(9000 + areaMask),
    siteId,
    areaMask,
    status: PhiCmsStatus.Published,
    flags: 0,
    visibilityMask: areaMask,
    config,
  };
}

function buildAreaPresetPayloadFromTree({
  areaMask,
  siteId,
  tree,
  sourcePreset,
  config,
}: {
  areaMask: number;
  siteId: number;
  tree: PhiResolvedCmsPageTree;
  sourcePreset: PhiResolvedCmsAreaPresetPayload["sourcePreset"];
  config: Record<string, unknown>;
}): PhiResolvedCmsAreaPresetPayload {
  return {
    areaMask,
    sourcePreset,
    preset: {
      preset: createSyntheticAreaPreset({
        siteId,
        areaMask,
        config,
      }),
      regions: tree.regions,
      overlays: tree.overlays,
      layoutNodes: tree.layoutNodes,
      contentWidgets: tree.contentWidgets,
      controllerSettings: tree.controllerSettings ?? [],
    },
  };
}

/**
 * The Area's shell as its preset builds it, for an Area that stores no structure on that shell.
 *
 * `binding` is the Area's effective shell (`resolvePhiAreaRouteScope`): the base Module's, or the one
 * an active Module brings. A stored structure of another shell is not this Area's answer and is not read.
 */
export async function buildPhiLocalCmsAreaPayload({
  binding,
  areaMask,
  siteId,
  path,
  runtime,
  runtimeModuleCatalog,
}: {
  binding: PhiCmsAreaShellPresetBinding;
  areaMask: number;
  siteId: number;
  path: string;
  runtime: PhiBlockRuntime;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
}): Promise<PhiResolvedCmsAreaPresetPayload | null> {
  const areaKey = resolvePhiCmsAreaKey(areaMask);
  const resolvedAreaMask = resolvePhiCmsAreaMask(areaKey);

  if (resolvedAreaMask !== areaMask || binding.descriptor.area !== areaKey) {
    return null;
  }

  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const tree = await applyPhiPresetTreePublishedContent(
    await instantiatePhiCmsAreaShellPreset({
      binding,
      catalog,
      siteId,
      path,
      runtime,
      loadModuleMedia: createPhiModuleMediaLoader(runtime.site.key),
    }),
    { runtimeModuleCatalog, siteKey: runtime.site.key, locale: runtime.locale.current },
  );

  return buildAreaPresetPayloadFromTree({
    areaMask: resolvedAreaMask,
    siteId,
    tree,
    sourcePreset: {
      ownerModuleId: binding.descriptor.ownerModuleId,
      presetKey: binding.descriptor.presetKey,
      sourcePresetVersion: binding.descriptor.shellPresetVersion,
    },
    config: buildPhiAreaShellPresetConfig(binding.descriptor.settings),
  });
}
