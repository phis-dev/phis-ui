import { buildPhiCmsLayoutNamespacedTypeKey, resolvePhiCmsLayoutPluginKey } from "../constants/cms-layout-types";
import { buildPhiCmsWidgetNamespacedTypeKey, resolvePhiCmsWidgetPluginKey } from "../constants/cms-widget-types";
import type { PhiCmsLayoutNode, PhiCmsContentWidgetNode } from "../types/cms";
import type { PhiCmsInstanceId } from "../types/cms-instance-id";
import {
  resolvePhiLayoutCreationPreset,
  type PhiLayoutCreationPreset,
} from "./cms-layout-defaults";
import type { PhiLayoutKind } from "../components/layouts/phi-layout-contract";

type PhiCmsLayoutNodeFactoryCommon = {
  id: PhiCmsInstanceId;
  siteId: number;
  parentLayoutNodeId: PhiCmsInstanceId | null;
  slotIndex: number;
  sortOrder?: number;
  status: number;
  flags?: number;
  visibilityMask: number;
  label: string | null;
};

type PhiCmsWidgetNodeFactoryCommon = Omit<PhiCmsLayoutNodeFactoryCommon, "parentLayoutNodeId"> & {
  parentLayoutNodeId: PhiCmsInstanceId;
};

export function buildPhiCmsWidgetTypeKey(pluginKey: string, typeKey: string): string {
  return buildPhiCmsWidgetNamespacedTypeKey(pluginKey, typeKey);
}

export function buildPhiCmsLayoutNode({
  pluginKey,
  typeKey,
  creationPreset,
  config,
  ...common
}: PhiCmsLayoutNodeFactoryCommon & {
  /** Optional override; by default the owning module is resolved from the type key. */
  pluginKey?: string;
  typeKey: string;
  creationPreset?: {
    layoutKind: PhiLayoutKind;
    preset: PhiLayoutCreationPreset;
  };
  config?: Record<string, unknown>;
}): PhiCmsLayoutNode {
  return {
    id: common.id,
    siteId: common.siteId,
    parentLayoutNodeId: common.parentLayoutNodeId,
    widgetType: buildPhiCmsLayoutNamespacedTypeKey(pluginKey ?? resolvePhiCmsLayoutPluginKey(typeKey), typeKey),
    slotIndex: common.slotIndex,
    sortOrder: common.sortOrder ?? 0,
    status: common.status,
    flags: common.flags ?? 0,
    visibilityMask: common.visibilityMask,
    label: common.label,
    config: {
      ...(creationPreset == null
        ? {}
        : resolvePhiLayoutCreationPreset(creationPreset.layoutKind, creationPreset.preset)),
      ...(config ?? {}),
    },
  };
}

export function buildPhiCmsWidgetNode({
  pluginKey,
  typeKey,
  config,
  contentId = null,
  ...common
}: PhiCmsWidgetNodeFactoryCommon & {
  /** Optional override; by default the owning module is resolved from the type key. */
  pluginKey?: string;
  typeKey: string;
  config?: Record<string, unknown>;
  contentId?: number | null;
}): PhiCmsContentWidgetNode {
  return {
    id: common.id,
    siteId: common.siteId,
    parentLayoutNodeId: common.parentLayoutNodeId,
    widgetType: buildPhiCmsWidgetNamespacedTypeKey(pluginKey ?? resolvePhiCmsWidgetPluginKey(typeKey), typeKey),
    slotIndex: common.slotIndex,
    sortOrder: common.sortOrder ?? 0,
    status: common.status,
    flags: common.flags ?? 0,
    visibilityMask: common.visibilityMask,
    label: common.label,
    config: config ?? {},
    contentId,
  };
}
