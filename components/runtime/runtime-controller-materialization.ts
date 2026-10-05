import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiCmsOverlayNode,
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
  /**
   * Overlays whose Controllers arrive with their zones rather than with the Area.
   *
   * A closed, deferred Overlay is not in the page, and neither should the Controllers its Widgets ask
   * for be: the sign-in Form put the Form Controller and the Auth Controller on every Public page for
   * the few visitors who ever open it. `next/overlay-zones.tsx` mounts them when the zones are asked for
   * (`materializePhiOverlayRuntimeControllerSettings`).
   */
  excludedOverlayIds?: ReadonlySet<PhiCmsInstanceId>;
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

function readOverlayRootLayoutNodeIds(overlays: readonly PhiCmsOverlayNode[]) {
  return overlays.flatMap((overlay) => [
    overlay.headerLayoutNodeId,
    overlay.bodyLayoutNodeId,
    overlay.footerLayoutNodeId,
  ].filter((id): id is PhiCmsInstanceId => id != null));
}

function withoutOverlayWidgets(
  tree: PhiResolvedCmsRenderableTree,
  widgets: readonly PhiCmsContentWidgetNode[],
  excludedOverlayIds: ReadonlySet<PhiCmsInstanceId> | undefined,
): readonly PhiCmsContentWidgetNode[] {
  if (!excludedOverlayIds || excludedOverlayIds.size === 0) {
    return widgets;
  }
  const excludedLayoutIds = collectIncludedLayoutIds(
    tree.layoutNodes,
    readOverlayRootLayoutNodeIds(tree.overlays.filter((overlay) => excludedOverlayIds.has(overlay.id))),
  );
  return widgets.filter((widget) => !excludedLayoutIds.has(widget.parentLayoutNodeId));
}

function filterMaterializedWidgets(
  tree: PhiResolvedCmsRenderableTree,
  regionTypes?: readonly number[] | null,
  includeOverlays = false,
  excludedOverlayIds?: ReadonlySet<PhiCmsInstanceId>,
): readonly PhiCmsContentWidgetNode[] {
  if (!regionTypes || regionTypes.length === 0) {
    return withoutOverlayWidgets(tree, tree.contentWidgets, excludedOverlayIds);
  }

  const selectedRegionTypes = new Set(regionTypes);
  const rootLayoutNodeIds = [
    ...tree.regions
    .filter((region) => selectedRegionTypes.has(region.regionType))
    .map((region) => region.rootLayoutNodeId),
    ...(includeOverlays ? readOverlayRootLayoutNodeIds(tree.overlays) : []),
  ];

  if (rootLayoutNodeIds.length === 0) {
    return [];
  }

  const includedLayoutIds = collectIncludedLayoutIds(tree.layoutNodes, rootLayoutNodeIds);
  return withoutOverlayWidgets(
    tree,
    tree.contentWidgets.filter((widget) => includedLayoutIds.has(widget.parentLayoutNodeId)),
    excludedOverlayIds,
  );
}

export function materializePhiRuntimeControllerSettings({
  tree,
  ownerMountScope,
  widgetPluginsByType,
  baseSettings,
  activeControllerTypes,
  regionTypes,
  includeOverlays,
  excludedOverlayIds,
}: PhiRuntimeControllerMaterializationOptions): PhiRuntimeControllerSetting[] {
  const settingsByKey = new Map<string, PhiRuntimeControllerSetting>();
  const allowedControllerTypes = new Set<string>(activeControllerTypes);

  for (const setting of baseSettings ?? []) {
    if (setting.mountScope !== ownerMountScope) {
      continue;
    }

    settingsByKey.set(buildSettingKey(setting), { ...setting });
  }

  return materializeWidgetSettings({
    tree,
    widgets: filterMaterializedWidgets(tree, regionTypes, includeOverlays, excludedOverlayIds),
    ownerMountScope,
    widgetPluginsByType,
    allowedControllerTypes,
    settingsByKey,
  });
}

/**
 * The Controllers one Overlay's Widgets ask for, mounted with its zones when it first opens.
 *
 * The counterpart of `excludedOverlayIds`: what the Area left out because the Overlay was closed, the
 * zones bring. In the Area's scope, because the Overlay is the Area's -- the addresses are the ones the
 * page would have mounted, so nothing that sends to them has to know when they arrived.
 */
export function materializePhiOverlayRuntimeControllerSettings({
  tree,
  overlay,
  widgetPluginsByType,
  activeControllerTypes,
}: Pick<PhiRuntimeControllerMaterializationOptions, "tree" | "widgetPluginsByType" | "activeControllerTypes"> & {
  overlay: PhiCmsOverlayNode;
}): PhiRuntimeControllerSetting[] {
  const includedLayoutIds = collectIncludedLayoutIds(tree.layoutNodes, readOverlayRootLayoutNodeIds([overlay]));
  return materializeWidgetSettings({
    tree,
    widgets: tree.contentWidgets.filter((widget) => includedLayoutIds.has(widget.parentLayoutNodeId)),
    ownerMountScope: "area",
    widgetPluginsByType,
    allowedControllerTypes: new Set<string>(activeControllerTypes),
    settingsByKey: new Map(),
  });
}

function materializeWidgetSettings({
  tree,
  widgets,
  ownerMountScope,
  widgetPluginsByType,
  allowedControllerTypes,
  settingsByKey,
}: {
  tree: PhiResolvedCmsRenderableTree;
  widgets: readonly PhiCmsContentWidgetNode[];
  ownerMountScope: PhiRuntimeControllerMaterializationOwner;
  widgetPluginsByType: WidgetPluginRegistryLike;
  allowedControllerTypes: ReadonlySet<string>;
  settingsByKey: Map<string, PhiRuntimeControllerSetting>;
}): PhiRuntimeControllerSetting[] {
  for (const widget of widgets) {
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
        /*
         * A Widget asked for a Controller no active Module owns. Dropping the requirement renders the
         * Widget without the thing it declared it needs: its signals go to an address nobody holds, and
         * the page looks fine. The declaration is the Widget's contract with its Module, so this is a
         * contract error and is reported as one -- the renderer shows it in the Widget's place.
         */
        throw new Error(
          `${widget.widgetType}.requiredRuntimeControllers: Controller "${materializedSetting.type}" ` +
          `(instance "${materializedSetting.instanceKey}") is not owned by an active Module in this ` +
          `${ownerMountScope} scope (Widget ${widget.id}).`,
        );
      }

      const key = buildSettingKey(materializedSetting);
      if (!settingsByKey.has(key)) {
        settingsByKey.set(key, materializedSetting);
      }
    }
  }

  return [...settingsByKey.values()];
}
