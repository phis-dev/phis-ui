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
  /**
   * What runs in this scope whatever the tree says: the Controllers whose Module mounts them for the
   * whole Area (`areaControllerSettings`). The tree's own `controllerSettings` are read off `tree`.
   */
  baseSettings?: readonly PhiRuntimeControllerSetting[] | null;
  /**
   * What the enclosing scope already runs. A Page that configures one of these does not mount a second
   * copy at the same address; its config reaches the running one instead
   * (`collectPhiRuntimeControllerConfigOverlays`).
   */
  enclosingSettings?: readonly PhiRuntimeControllerSetting[] | null;
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

/** Which Controller a setting is about, whatever scope says it: its address is type and instance. */
function buildControllerKey(setting: Pick<PhiRuntimeControllerSetting, "type" | "instanceKey">) {
  return `${setting.type}:${setting.instanceKey}`;
}

/** What a tree tells a Controller, laid over what the Controller was asked with: the tree's keys win. */
function withTreeConfig(
  setting: PhiRuntimeControllerSetting,
  treeSetting: PhiRuntimeControllerSetting | undefined,
): PhiRuntimeControllerSetting {
  if (!treeSetting?.config) return setting;
  return { ...setting, config: { ...(setting.config ?? {}), ...treeSetting.config } };
}

function readTreeControllerSettings(
  tree: PhiResolvedCmsRenderableTree,
  ownerMountScope: PhiRuntimeControllerMaterializationOwner,
) {
  const settings = tree.controllerSettings ?? [];
  for (const setting of settings) {
    if (setting.mountScope !== ownerMountScope) {
      throw new Error(
        `A ${ownerMountScope} tree configures "${buildControllerKey(setting)}" at ` +
        `"${setting.mountScope}" scope; a tree configures its Controllers in its own scope.`,
      );
    }
  }
  return new Map(settings.map((setting) => [buildControllerKey(setting), setting] as const));
}

/**
 * The configs a Page gives Controllers its Area already runs.
 *
 * The Asset Controller is mounted for the whole Area, and the Media Page is the one that knows which
 * dialog and which Form it answers into. Mounting a second Asset Controller for the Page would put two
 * listeners behind one address; instead the Page's config reaches the running one while the Page is
 * shown (`PhiRuntimeControllerConfigOverlays`) and leaves with it.
 */
export function collectPhiRuntimeControllerConfigOverlays({
  tree,
  ownerMountScope,
  enclosingSettings,
}: Pick<PhiRuntimeControllerMaterializationOptions, "tree" | "ownerMountScope" | "enclosingSettings">) {
  const enclosingKeys = new Set((enclosingSettings ?? []).map(buildControllerKey));
  return [...readTreeControllerSettings(tree, ownerMountScope).values()]
    .filter((setting) => enclosingKeys.has(buildControllerKey(setting)) && setting.config != null)
    .map((setting) => ({ type: setting.type, instanceKey: setting.instanceKey, config: setting.config! }));
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

/**
 * The Controllers one scope runs: what its Modules mount for it, what its Widgets ask for, and what its
 * tree configures.
 *
 * A tree setting configures the Controller of its type and instance -- the tree's keys win over what a
 * Widget asked with -- and mounts it when nothing else does, which is how a Page brings a `demand`
 * Controller into being. Three exceptions, each because the Controller runs somewhere else:
 * - one the enclosing scope runs is configured there (`collectPhiRuntimeControllerConfigOverlays`);
 * - one only a deferred Overlay asks for arrives with that Overlay, and the tree's config with it
 *   (`materializePhiOverlayRuntimeControllerSettings`);
 * - one no active Module owns is not run at all. A Module switched off takes its Controller with it, and
 *   what a tree said to that Controller is inert until the Module is back.
 */
export function materializePhiRuntimeControllerSettings({
  tree,
  ownerMountScope,
  widgetPluginsByType,
  baseSettings,
  enclosingSettings,
  activeControllerTypes,
  regionTypes,
  includeOverlays,
  excludedOverlayIds,
}: PhiRuntimeControllerMaterializationOptions): PhiRuntimeControllerSetting[] {
  const settingsByKey = new Map<string, PhiRuntimeControllerSetting>();
  const allowedControllerTypes = new Set<string>(activeControllerTypes);
  const treeSettings = readTreeControllerSettings(tree, ownerMountScope);
  const enclosingKeys = new Set((enclosingSettings ?? []).map(buildControllerKey));

  for (const setting of baseSettings ?? []) {
    if (setting.mountScope !== ownerMountScope) {
      continue;
    }

    settingsByKey.set(buildSettingKey(setting), withTreeConfig({ ...setting }, treeSettings.get(buildControllerKey(setting))));
  }

  materializeWidgetSettings({
    tree,
    widgets: filterMaterializedWidgets(tree, regionTypes, includeOverlays, excludedOverlayIds),
    ownerMountScope,
    widgetPluginsByType,
    allowedControllerTypes,
    settingsByKey,
    treeSettings,
  });

  const deferredKeys = new Set(
    excludedOverlayIds && excludedOverlayIds.size > 0
      ? tree.overlays
        .filter((overlay) => excludedOverlayIds.has(overlay.id))
        .flatMap((overlay) => materializePhiOverlayRuntimeControllerSettings({
          tree,
          overlay,
          widgetPluginsByType,
          activeControllerTypes: allowedControllerTypes,
        }))
        .map(buildControllerKey)
      : [],
  );
  for (const [controllerKey, setting] of treeSettings) {
    const key = buildSettingKey(setting);
    if (
      settingsByKey.has(key) ||
      enclosingKeys.has(controllerKey) ||
      deferredKeys.has(controllerKey) ||
      !allowedControllerTypes.has(setting.type)
    ) {
      continue;
    }
    settingsByKey.set(key, { ...setting });
  }

  return [...settingsByKey.values()];
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
    treeSettings: readTreeControllerSettings(tree, "area"),
  });
}

function materializeWidgetSettings({
  tree,
  widgets,
  ownerMountScope,
  widgetPluginsByType,
  allowedControllerTypes,
  settingsByKey,
  treeSettings,
}: {
  tree: PhiResolvedCmsRenderableTree;
  widgets: readonly PhiCmsContentWidgetNode[];
  ownerMountScope: PhiRuntimeControllerMaterializationOwner;
  widgetPluginsByType: WidgetPluginRegistryLike;
  allowedControllerTypes: ReadonlySet<string>;
  settingsByKey: Map<string, PhiRuntimeControllerSetting>;
  treeSettings: ReadonlyMap<string, PhiRuntimeControllerSetting>;
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
        settingsByKey.set(
          key,
          withTreeConfig(materializedSetting, treeSettings.get(buildControllerKey(materializedSetting))),
        );
      }
    }
  }

  return [...settingsByKey.values()];
}
