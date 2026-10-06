import "server-only";

import type { PhiBlockRuntime } from "../../types/widget-runtime";
import type { PhiRuntimeModuleDefinition } from "../../types/cms-plugins";
import { resolvePhiRuntimeModuleSourceLocale } from "../../types/runtime-module-locale";
import {
  PHI_TR_CTX_MODULE_DESCRIPTION,
  PHI_TR_CTX_WEB_UI_LABEL,
  createGlobalTranslator,
} from "../../gateway/tr";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";

/**
 * Module titles and descriptions in the language of the request.
 *
 * Nothing is kept here between requests: `trBulk` keeps every answer in the translation cache, which
 * a translation write empties in every process (gateway/CACHES.md). A map of its own beside it kept
 * whatever the first request got -- a provisional answer, or the source text after a failed batch --
 * until the process restarted.
 *
 * Each text is asked for once, however many Modules share it, and the answers are looked up by text.
 */
async function translateTexts(
  translator: ReturnType<typeof createGlobalTranslator>,
  texts: readonly string[],
  ctx: string,
) {
  const sources = [...new Set(texts.map((text) => text.trim()))];
  const translated = await translator.trBulk(sources, ctx);
  return new Map(sources.map((source, index) => [source, translated[index] ?? source]));
}

export async function localizePhiRuntimeModuleDefinitions(
  runtime: Pick<PhiBlockRuntime, "locale">,
  definitions: readonly PhiRuntimeModuleDefinition[],
) {
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
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      locale: runtime.locale.current,
      sourceLocale,
    });
    const [titles, descriptions] = await Promise.all([
      translateTexts(translator, sourceDefinitions.map((definition) => definition.title), PHI_TR_CTX_WEB_UI_LABEL),
      translateTexts(translator, sourceDefinitions.map((definition) => definition.description), PHI_TR_CTX_MODULE_DESCRIPTION),
    ]);
    for (const definition of sourceDefinitions) {
      localizedLabelsByModuleId.set(definition.moduleId, {
        title: titles.get(definition.title.trim()) ?? definition.title,
        description: descriptions.get(definition.description.trim()) ?? definition.description,
      });
    }
  }));

  return definitions.map((definition) => {
    const labels = localizedLabelsByModuleId.get(definition.moduleId);
    return labels ? { ...definition, ...labels } : definition;
  });
}
