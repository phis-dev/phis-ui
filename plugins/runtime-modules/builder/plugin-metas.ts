import type {
  PhiAnyCmsBuilderPlugin,
  PhiBuilderContainerMeta,
  PhiBuilderPluginMeta,
  PhiBuilderWidgetMeta,
} from "../../../types/builder";
import type {
  PhiCmsLayoutPluginDefinition,
  PhiResolvedRuntimeModuleSet,
} from "../../../types/cms-plugins";
import { canPhiViewerAccessOwnedPolicy } from "../../../types/access";

function normalizeWidgetIconFamily(category: PhiBuilderPluginMeta["category"]) {
  return category === "other" ? "content" : category;
}

function resolveBuilderIconKey(pluginKey: string, iconName?: string | null) {
  return iconName ? `${pluginKey}:${iconName}` : null;
}

function cloneDefaultConfig(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : null;
}

export function buildPhiBuilderPluginMeta(plugin: PhiAnyCmsBuilderPlugin): PhiBuilderPluginMeta {
  const kind = plugin.kind === "widget" ? "widget" : "layout";
  const category = plugin.category;
  const iconName = plugin.iconName ?? null;
  const iconFamily = plugin.iconFamily ?? (kind === "widget" ? normalizeWidgetIconFamily(category) : null);
  const iconKey = resolveBuilderIconKey(plugin.pluginKey, iconName);
  const defaultConfig = cloneDefaultConfig(plugin.defaultConfig);
  const resolvedDefaultConfig = plugin.kind === "widget"
    ? cloneDefaultConfig(plugin.parseConfig(defaultConfig ?? {}))
    : defaultConfig;

  if (plugin.kind === "widget") {
    return {
      kind: "widget",
      pluginKey: plugin.pluginKey,
      typeKey: plugin.typeKey,
      title: plugin.title,
      description: plugin.description ?? null,
      icon: plugin.icon ?? (iconFamily ? resolveBuilderIconKey(plugin.pluginKey, iconFamily) : null) ?? null,
      iconName,
      iconFamily,
      iconKey,
      category,
      tags: plugin.tags ?? null,
      runtimeSignals: plugin.runtimeSignals ?? null,
      contentBinding: "contentBinding" in plugin ? plugin.contentBinding ?? null : null,
      signalSubcontrols: plugin.signalSubcontrols,
      slotSizePolicy: plugin.slotSizePolicy ?? null,
      defaultConfig,
      resolvedDefaultConfig,
      leaf: true,
      fields: plugin.fields,
    };
  }

  const slots = plugin.slots;
  return {
    kind: "layout",
    layoutKind: plugin.layoutKind,
    pluginKey: plugin.pluginKey,
    typeKey: plugin.typeKey,
    title: plugin.title,
    description: plugin.description ?? null,
    icon: plugin.icon ?? (iconFamily ? resolveBuilderIconKey(plugin.pluginKey, iconFamily) : null) ?? null,
    iconName,
    iconFamily,
    iconKey,
    category,
    tags: plugin.tags ?? null,
    runtimeSignals: plugin.runtimeSignals ?? null,
    slotSizePolicy: plugin.slotSizePolicy ?? null,
    defaultConfig,
    resolvedDefaultConfig,
    slots,
    fields: plugin.fields,
    allowReorder: true,
    defaultAnchor: plugin.defaultAnchor ?? slots.find((slot) => slot.defaultAnchor != null)?.defaultAnchor ?? null,
    slotMode: slots.every((slot) => slot.sequential)
      ? "sequential"
      : slots.length === 1
        ? "single"
        : "named",
  };
}

export function buildPhiBuilderLayoutPluginMetas(
  definition: PhiCmsLayoutPluginDefinition<unknown>,
): readonly PhiBuilderContainerMeta[] {
  const meta = buildPhiBuilderPluginMeta(definition);
  if (meta.kind === "widget") {
    throw new Error(`${definition.pluginKey}/${definition.typeKey}: layout definition produced widget metadata.`);
  }

  return [meta];
}

export function resolvePhiBuilderPluginDefaultConfig(
  meta: PhiBuilderPluginMeta | null | undefined,
): Record<string, unknown> | null {
  return cloneDefaultConfig(meta?.resolvedDefaultConfig ?? meta?.defaultConfig);
}

export function resolvePhiBuilderWidgetDraftConfig<TConfig extends Record<string, unknown>>(
  meta: PhiBuilderWidgetMeta | null | undefined,
  draftConfig: Record<string, unknown> | null | undefined,
): Partial<TConfig> {
  return {
    ...(resolvePhiBuilderPluginDefaultConfig(meta) ?? {}),
    ...(draftConfig ?? {}),
  } as Partial<TConfig>;
}

export function buildPhiBuilderPluginMetas(
  moduleSet: PhiResolvedRuntimeModuleSet,
  viewer?: import("../../../types/access").PhiAccessViewer,
): PhiBuilderPluginMeta[] {
  const layoutDefinitions = viewer
    ? [...moduleSet.layoutDefinitionsByType.values()].filter((entry) =>
        canPhiViewerAccessOwnedPolicy(
          viewer,
          entry.accessPolicy,
          moduleSet.moduleDefinitionsById.get(entry.ownerModuleId)?.serverBinding.providerId,
        )
      )
    : [...moduleSet.layoutDefinitionsByType.values()];
  const widgetDefinitions = viewer
    ? [...moduleSet.widgetDefinitionsByType.values()].filter((entry) =>
        canPhiViewerAccessOwnedPolicy(
          viewer,
          entry.accessPolicy,
          moduleSet.moduleDefinitionsById.get(entry.ownerModuleId)?.serverBinding.providerId,
        )
      )
    : [...moduleSet.widgetDefinitionsByType.values()];
  return [
    ...layoutDefinitions.flatMap((entry) =>
      buildPhiBuilderLayoutPluginMetas(entry.definition)
    ),
    ...widgetDefinitions.map((entry) =>
      buildPhiBuilderPluginMeta(entry.definition)
    ),
  ];
}
