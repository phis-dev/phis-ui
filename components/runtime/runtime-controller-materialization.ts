import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiResolvedCmsRenderableTree,
} from "../../types/cms";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import type {
  PhiRuntimeControllerSetting,
  PhiCmsWidgetRuntimeControllerRequirementResolver,
} from "../../types/cms-plugins";

type RuntimeControllerMaterializationWidgetMeta = {
  parseConfig: (raw: Record<string, unknown>) => unknown;
  requiredRuntimeControllers?: PhiCmsWidgetRuntimeControllerRequirementResolver<unknown>;
};

type WidgetPluginRegistryLike =
  | Map<string, RuntimeControllerMaterializationWidgetMeta>
  | ReadonlyMap<string, RuntimeControllerMaterializationWidgetMeta>;

export type PhiRuntimeControllerMaterializationOwner = Extract<
  PhiRuntimeControllerSetting["mountScope"],
  "area" | "page"
>;

export type PhiRuntimeControllerMaterializationOptions = {
  tree: PhiResolvedCmsRenderableTree;
  ownerMountScope: PhiRuntimeControllerMaterializationOwner;
  widgetPluginsByType: WidgetPluginRegistryLike;
  baseSettings?: readonly PhiRuntimeControllerSetting[] | null;
  activeControllerTypes: ReadonlySet<string> | readonly string[];
  regionTypes?: readonly number[] | null;
  includeOverlays?: boolean;
};

function buildSettingKey(setting: Pick<PhiRuntimeControllerSetting, "type" | "instanceKey" | "mountScope">) {
  return `${setting.mountScope}:${setting.type}:${setting.instanceKey}`;
}

export function materializePhiWidgetRuntimeControllerSettings({
  widget,
  tree,
  ownerMountScope,
  plugin,
}: {
  widget: PhiCmsContentWidgetNode;
  tree: PhiResolvedCmsRenderableTree;
  ownerMountScope: PhiRuntimeControllerMaterializationOwner;
  plugin: RuntimeControllerMaterializationWidgetMeta;
}): PhiRuntimeControllerSetting[] {
  if (!plugin.requiredRuntimeControllers) {
    return [];
  }

  const config = plugin.parseConfig(widget.config);
  const settingsByKey = new Map<string, PhiRuntimeControllerSetting>();
  for (const requirement of plugin.requiredRuntimeControllers({ widget, tree, config })) {
    const setting: PhiRuntimeControllerSetting = {
      type: requirement.type,
      instanceKey: requirement.instanceKey,
      mountScope: ownerMountScope,
      enabled: requirement.enabled,
      config: requirement.config,
    };
    const key = buildSettingKey(setting);
    if (settingsByKey.has(key)) {
      throw new Error(
        `${widget.widgetType}.requiredRuntimeControllers: duplicate requirement "${key}".`,
      );
    }
    settingsByKey.set(key, setting);
  }

  return [...settingsByKey.values()];
}

function collectIncludedLayoutIds(
  layoutNodes: readonly PhiCmsLayoutNode[],
  rootLayoutNodeIds: readonly PhiCmsInstanceId[],
) {
  const childrenByParent = new Map<PhiCmsInstanceId, PhiCmsLayoutNode[]>();
  for (const node of layoutNodes) {
    if (node.parentLayoutNodeId == null) {
      continue;
    }

    const siblings = childrenByParent.get(node.parentLayoutNodeId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentLayoutNodeId, siblings);
  }

  const included = new Set<PhiCmsInstanceId>();
  const visit = (layoutId: PhiCmsInstanceId) => {
    if (included.has(layoutId)) {
      return;
    }

    included.add(layoutId);
    for (const child of childrenByParent.get(layoutId) ?? []) {
      visit(child.id);
    }
  };

  for (const rootLayoutNodeId of rootLayoutNodeIds) {
    visit(rootLayoutNodeId);
  }

  return included;
}

function filterMaterializedWidgets(
  tree: PhiResolvedCmsRenderableTree,
  regionTypes?: readonly number[] | null,
  includeOverlays = false,
): readonly PhiCmsContentWidgetNode[] {
  if (!regionTypes || regionTypes.length === 0) {
    return tree.contentWidgets;
  }

  const selectedRegionTypes = new Set(regionTypes);
  const rootLayoutNodeIds = [
    ...tree.regions
    .filter((region) => selectedRegionTypes.has(region.regionType))
    .map((region) => region.rootLayoutNodeId),
    ...(includeOverlays ? tree.overlays.flatMap((overlay) => [
      overlay.headerLayoutNodeId,
      overlay.bodyLayoutNodeId,
      overlay.footerLayoutNodeId,
    ].filter((id): id is PhiCmsInstanceId => id != null)) : []),
  ];

  if (rootLayoutNodeIds.length === 0) {
    return [];
  }

  const includedLayoutIds = collectIncludedLayoutIds(tree.layoutNodes, rootLayoutNodeIds);
  return tree.contentWidgets.filter((widget) => includedLayoutIds.has(widget.parentLayoutNodeId));
}

export function materializePhiRuntimeControllerSettings({
  tree,
  ownerMountScope,
  widgetPluginsByType,
  baseSettings,
  activeControllerTypes,
  regionTypes,
  includeOverlays,
}: PhiRuntimeControllerMaterializationOptions): PhiRuntimeControllerSetting[] {
  const settingsByKey = new Map<string, PhiRuntimeControllerSetting>();
  const allowedControllerTypes = new Set<string>(activeControllerTypes);

  for (const setting of baseSettings ?? []) {
    if (setting.mountScope !== ownerMountScope) {
      continue;
    }

    settingsByKey.set(buildSettingKey(setting), { ...setting });
  }

  for (const widget of filterMaterializedWidgets(tree, regionTypes, includeOverlays)) {
    const plugin = widgetPluginsByType.get(widget.widgetType);
    if (!plugin) {
      continue;
    }

    for (const materializedSetting of materializePhiWidgetRuntimeControllerSettings({
      widget,
      tree,
      ownerMountScope,
      plugin,
    })) {
      if (!allowedControllerTypes.has(materializedSetting.type)) {
        console.warn("[phi-runtime-controller-materialization] Missing runtime controller policy.", {
          ownerMountScope,
          controllerType: materializedSetting.type,
          controllerInstanceKey: materializedSetting.instanceKey,
          widgetId: widget.id,
          widgetType: widget.widgetType,
        });
        continue;
      }

      const key = buildSettingKey(materializedSetting);
      if (!settingsByKey.has(key)) {
        settingsByKey.set(key, materializedSetting);
      }
    }
  }

  return [...settingsByKey.values()];
}
