import "server-only";

import type { PhiBlockRuntime } from "../../types/widget-runtime";
import type { PhiRuntimeModuleDefinition } from "../../types/cms-plugins";
import { resolvePhiRuntimeModuleSourceLocale } from "../../types/runtime-module-locale";
import { PHI_TR_CTX_WEB_UI_LABEL, createGlobalTranslator } from "../../gateway/tr";

type PhiLocalizedRuntimeModuleLabels = ReadonlyMap<string, Readonly<{ title: string; description: string }>>;

const MODULE_LABEL_CACHE = new Map<string, PhiLocalizedRuntimeModuleLabels>();

function buildModuleLabelCacheKey(
  locale: string,
  definitions: readonly PhiRuntimeModuleDefinition[],
) {
  return JSON.stringify([
    locale.trim().toLowerCase(),
    definitions.map((definition) => [
      definition.moduleId,
      resolvePhiRuntimeModuleSourceLocale(definition),
      definition.title,
      definition.description,
    ]),
  ]);
}

export async function localizePhiRuntimeModuleDefinitions(
  runtime: Pick<PhiBlockRuntime, "locale" | "phis">,
  definitions: readonly PhiRuntimeModuleDefinition[],
) {
  const cacheKey = buildModuleLabelCacheKey(runtime.locale.current, definitions);
  const cached = MODULE_LABEL_CACHE.get(cacheKey);
  if (cached) {
    return definitions.map((definition) => {
      const labels = cached.get(definition.moduleId);
      return labels ? { ...definition, ...labels } : definition;
    });
  }

  const definitionsBySourceLocale = new Map<string, PhiRuntimeModuleDefinition[]>();
  for (const definition of definitions) {
    const sourceLocale = resolvePhiRuntimeModuleSourceLocale(definition);
    const current = definitionsBySourceLocale.get(sourceLocale) ?? [];
    current.push(definition);
    definitionsBySourceLocale.set(sourceLocale, current);
  }

  const localizedLabelsByModuleId = new Map<string, { title: string; description: string }>();
  await Promise.all([...definitionsBySourceLocale].map(async ([sourceLocale, sourceDefinitions]) => {
    const translator = createGlobalTranslator({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
      sourceLocale,
    });
    const sourceMessages = sourceDefinitions.flatMap((definition) => [
      definition.title,
      definition.description,
    ]);
    const translatedMessages = await translator.trBulk(sourceMessages, PHI_TR_CTX_WEB_UI_LABEL);
    sourceDefinitions.forEach((definition, index) => {
      localizedLabelsByModuleId.set(definition.moduleId, {
        title: translatedMessages[index * 2] ?? definition.title,
        description: translatedMessages[index * 2 + 1] ?? definition.description,
      });
    });
  }));

  MODULE_LABEL_CACHE.set(cacheKey, localizedLabelsByModuleId);
  return definitions.map((definition) => {
    const labels = localizedLabelsByModuleId.get(definition.moduleId);
    return labels ? { ...definition, ...labels } : definition;
  });
}
