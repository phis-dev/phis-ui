import { isPhiRecord } from "../../../helpers/is-record";
import type {
  PhiAnyCmsBuilderPlugin,
  PhiBuilderContainerMeta,
  PhiBuilderPluginMeta,
  PhiBuilderWidgetMeta,
} from "../../../types/builder";
import type { PhiCmsLayoutPluginDefinition } from "../../../types/cms-plugins";

function normalizeWidgetIconFamily(category: PhiBuilderPluginMeta["category"]) {
  return category === "other" ? "content" : category;
}

function resolveBuilderIconKey(pluginKey: string, iconName?: string | null) {
  return iconName ? `${pluginKey}:${iconName}` : null;
}

function cloneDefaultConfig(value: unknown): Record<string, unknown> | null {
  return isPhiRecord(value) ? { ...value } : null;
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
      contentBinding: plugin.contentBinding ?? null,
      ...(plugin.translatesOwnText ? { translatesOwnText: true as const } : {}),
      signalSubcontrols: plugin.signalSubcontrols,
      slotSizePolicy: plugin.slotSizePolicy,
      surface: plugin.surface ?? null,
      requiredRegionOwnership: plugin.requiredRegionOwnership ?? null,
      defaultConfig,
      resolvedDefaultConfig,
      creationConfig: cloneDefaultConfig(plugin.creationConfig),
      leaf: true,
      fields: plugin.fields,
    };
  }

  const slots = plugin.slots;
  return {
    kind: "layout",
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
    creationConfig: cloneDefaultConfig("creationConfig" in plugin ? plugin.creationConfig : null),
    slots,
    slotPositions: plugin.slotPositions ?? "compact",
    ...("translatesOwnText" in plugin && plugin.translatesOwnText ? { translatesOwnText: true as const } : {}),
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

/**
 * A Widget's defaults under its draft, group by group. The Widget parses its config deeply, so a draft
 * that states one field of `features.pagination` keeps the defaults of the others; merged flat, the
 * stated group replaced the whole default group and a `visibleWhen` on a sibling read nothing. A value
 * the draft states wins as it is, `null` included; lists are values, not groups.
 */
export function mergePhiBuilderConfigDefaults(
  defaults: Record<string, unknown> | null | undefined,
  config: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(defaults ?? {}) };
  for (const [key, value] of Object.entries(config ?? {})) {
    const fallback = merged[key];
    merged[key] = isPhiRecord(fallback) && isPhiRecord(value)
      ? mergePhiBuilderConfigDefaults(fallback as Record<string, unknown>, value as Record<string, unknown>)
      : value;
  }
  return merged;
}

export function resolvePhiBuilderWidgetDraftConfig<TConfig extends Record<string, unknown>>(
  meta: PhiBuilderWidgetMeta | null | undefined,
  draftConfig: Record<string, unknown> | null | undefined,
): Partial<TConfig> {
  return mergePhiBuilderConfigDefaults(resolvePhiBuilderPluginDefaultConfig(meta), draftConfig) as Partial<TConfig>;
}
