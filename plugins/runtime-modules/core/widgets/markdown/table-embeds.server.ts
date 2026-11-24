import "server-only";

import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { getPhiTableWidgetLabels } from "../../../../../components/widgets/label-sets/table";
import type { PhiMarkdownTableEmbedResolver } from "../../../../../components/widgets/shared/markdown-render";
import { PHI_TR_CTX_WEB_UI_LABEL } from "../../../../../gateway/tr";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { trGlobalBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiBlockRuntime, PhiRenderableBlockRenderMode, PhiTableWidgetConfig } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import { canPhiViewerAccessOwnedPolicy as canSee, type PhiRoleProviderId } from "../../../../../types/access";
import type { PhiTableEmbedReference } from "../../../../../types/table-embed";

type Registry = Pick<PhiCmsRuntimeRenderRegistry, "runtimeModuleCatalog" | "activeModuleIds" | "widgetAccessPoliciesByType" | "roleProviderIdByWidgetType">;

/** The Tables a Markdown text embeds (TABLES.md, "Tables in Markdown"). */
export function createPhiMarkdownTableEmbedResolver({ registry, runtime, renderMode }: {
  registry: Registry;
  runtime: PhiBlockRuntime;
  renderMode: PhiRenderableBlockRenderMode;
}): PhiMarkdownTableEmbedResolver {
  return async (embeds) => {
    const resolved = embeds.map(({ reference }) => resolveEmbed(reference, registry, runtime));
    const configs = resolved.filter((entry) => typeof entry !== "string");
    const words = configs.flatMap(({ presentation }) => [presentation.title, ...presentation.columns.map((column) => column.title)]);
    const [translated, labels] = !configs.length ? [[], null] : await Promise.all([
      trGlobalBulkForLocale(runtime.locale.current, words.filter((text) => text) as string[], PHI_TR_CTX_WEB_UI_LABEL),
      getPhiTableWidgetLabels({ ...phiRuntime(runtime), locale: runtime.locale.current }),
    ]);
    let at = 0;
    const word = (text = "") => text && (translated[at++]?.trim() || text);
    return resolved.map((entry, index) => {
      const { caption } = embeds[index]!;
      if (typeof entry === "string") return { caption, table: null, notice: renderMode === "live" ? null : entry };
      const title = word(entry.presentation.title);
      const columns = entry.presentation.columns.map((column) => ({ ...column, title: word(column.title) }));
      const presentation = { ...entry.presentation, columns, title: caption || title };
      return { caption, table: { config: { ...entry, presentation }, labels: labels!, renderMode }, notice: null };
    });
  };
}

function resolveEmbed({ embedKey, params }: PhiTableEmbedReference, registry: Registry, runtime: PhiBlockRuntime): PhiTableWidgetConfig | string {
  const owner = [...registry.runtimeModuleCatalog.values()]
    .find((entry) => entry.definition.embeddableTables?.some((embed) => embed.key === embedKey))?.definition;
  const embed = owner?.embeddableTables!.find((candidate) => candidate.key === embedKey);
  if (!owner || !embed) return `No Module offers the Table "${embedKey}".`;
  if (!registry.activeModuleIds.has(owner.moduleId)) return `"${owner.title}" is not active in this Area.`;
  const table = PhiCmsWidgetType.Table;
  if (!canSee(runtime.viewer, registry.widgetAccessPoliciesByType.get(table), registry.roleProviderIdByWidgetType.get(table)) ||
    !canSee(runtime.viewer, embed.accessPolicy, owner.serverBinding.providerId as PhiRoleProviderId)) return `This viewer may not see "${embedKey}".`;
  const provider = owner.dataProviders!.find((candidate) => candidate.key === embed.source.providerKey)!;
  const resource = provider.kind === "table" ? provider.resources.find((candidate) => candidate.resourceKey === embed.source.resourceKey)! : null!;
  const binding: Record<string, unknown> = {};
  const filters: Record<string, never> = {};
  for (const [name, raw] of params) {
    const param = Object.hasOwn(embed.params ?? {}, name) ? embed.params![name]! : null;
    const bound = param && "binding" in param ? resource.bindingFields?.find((field) => field.key === param.binding) : undefined;
    const field = bound ?? (param && "filter" in param ? resource.fields.find((candidate) => candidate.key === param.filter) : undefined);
    const into: Record<string, unknown> = bound ? binding : filters;
    const value = !field || Object.hasOwn(into, field.key) ? undefined
      : field.type === "enum" ? field.options?.find((option) => String(option.value) === raw)?.value
      : field.type === "string" ? (raw.trim().length <= 200 && raw.trim()) || undefined
      : field.type === "number" ? /^-?\d+(\.\d+)?$/u.test(raw) ? Number(raw) : undefined
      : field.type === "boolean" ? raw === "true" || (raw === "false" ? false : undefined) : undefined;
    if (value === undefined) return field ? `"${name}" does not take "${raw}" here.` : `"${embedKey}" has no parameter "${name}".`;
    into[field!.key] = value;
  }
  const source = { ...embed.source, params: { ...embed.source.params, ...binding } };
  const open = resource.bindingFields?.find((field) => field.required && field.defaultValue === undefined && !Object.hasOwn(source.params, field.key));
  if (open) return `"${embedKey}" needs a parameter for "${open.key}".`;
  // `maxRows` is one page, no pager; as is a resource that does not page.
  const pagination = (embed.maxRows || resource.query.pagination === "none") && { pagination: { enabled: false, pageSize: embed.maxRows } };
  return { presentation: embed.presentation, features: { sorting: embed.sorting, ...pagination }, fixedFilters: { ...embed.fixedFilters, ...filters }, source, signalRoutes: null };
}
