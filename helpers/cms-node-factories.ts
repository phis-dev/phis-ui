import { buildPhiCmsLayoutNamespacedTypeKey } from "../constants/cms-layout-types";
import { resolvePhiCmsLayoutPluginKey } from "../constants/cms-layout-type-keys";
import { buildPhiCmsWidgetNamespacedTypeKey, resolvePhiCmsWidgetPluginKey } from "../constants/cms-widget-types";
import type { PhiCmsLayoutNode, PhiCmsContentWidgetNode } from "../types/cms";
import type { PhiCmsInstanceId } from "../types/cms-instance-id";
import type { PhiCoreWidgetPlacements, PhiCoreWidgetTypeKey } from "../types/core-widget-placements";
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

export type PhiCmsWidgetNodeFactoryCommon = Omit<PhiCmsLayoutNodeFactoryCommon, "parentLayoutNodeId"> & {
  parentLayoutNodeId: PhiCmsInstanceId;
  contentId?: number | null;
};

/**
 * The config a Widget placement takes, read off its type key.
 *
 * A Core Widget listed in `PhiCoreWidgetPlacements` takes the placement Core promises to read, so a
 * misspelt field or a value outside its vocabulary fails where the placement is written rather than
 * being dropped by the parser at render. Everything else -- a Widget of another Module, named with its
 * `pluginKey`, or a type key only known at runtime -- takes a plain record, because nothing here knows
 * what it reads.
 */
export type PhiCmsWidgetPlacementConfig<
  TTypeKey extends string,
  TPluginKey extends string | undefined,
> = [TPluginKey] extends [undefined]
  ? TTypeKey extends PhiCoreWidgetTypeKey
    ? PhiCoreWidgetPlacements[TTypeKey]
    : Record<string, unknown>
  : Record<string, unknown>;

/** What a Widget placement names: which Widget, and configured how. */
export type PhiCmsWidgetPlacementFields<
  TTypeKey extends string,
  TPluginKey extends string | undefined = undefined,
> = {
  /** Optional override; by default the owning module is resolved from the type key. */
  pluginKey?: TPluginKey;
  typeKey: TTypeKey;
  config?: PhiCmsWidgetPlacementConfig<TTypeKey, TPluginKey>;
};

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

/*
 * Generic over the type key rather than overloaded per Widget: an overload set picks the first
 * signature a literal fits, and a config with a wrong field fits the untyped one, so the check would
 * pass exactly when it should fail.
 */
export function buildPhiCmsWidgetNode<
  TTypeKey extends string,
  TPluginKey extends string | undefined = undefined,
>({
  pluginKey,
  typeKey,
  config,
  contentId = null,
  ...common
}: PhiCmsWidgetNodeFactoryCommon &
  PhiCmsWidgetPlacementFields<TTypeKey, TPluginKey>): PhiCmsContentWidgetNode {
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
    config: (config ?? {}) as Record<string, unknown>,
    contentId,
  };
}
