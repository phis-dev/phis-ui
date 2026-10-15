import "server-only";

import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { PHI_TR_CTX_WEB_UI_LABEL, createGlobalTranslator } from "../../../gateway/tr";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { logRuntimeEvent } from "../../../net/log";
import type { PhiBuilderModuleAuthoringCatalogEntry } from "./module-authoring-catalog";
import { mapPhiBuilderPluginMetaText } from "./plugin-meta-labels";
import {
  PHI_CANONICAL_SOURCE_LOCALE,
  isPhiLocaleReadableAsSource,
  resolvePhiTranslationLocale,
} from "../../../helpers/locale";

/**
 * The authoring catalog in the language the Builder is being used in.
 *
 * The catalog crosses to the Client once, as a prop, and everything the Inspector shows about a
 * plugin comes out of it -- so this is the one place the words can be turned, and turning them here
 * costs one round trip for a whole Area's worth of plugins.
 *
 * It is a bulk translation rather than a label set on purpose. A label set needs every string written
 * down in advance under a key, which works for a Control we ship and cannot work for a field an
 * outside Module declares. The same reasoning already governs Module titles next door.
 *
 * Nothing is kept here between requests. `trBulk` keeps every answer in the translation cache, which a
 * translation write empties in every process (gateway/CACHES.md); a map of its own beside it kept the
 * old words until the process restarted.
 */
export async function localizePhiBuilderModuleAuthoringCatalog(
  runtime: Pick<PhiBlockRuntime, "locale">,
  entries: readonly PhiBuilderModuleAuthoringCatalogEntry[],
): Promise<PhiBuilderModuleAuthoringCatalogEntry[]> {
  const locale = runtime.locale.current;
  const targetLocale = resolvePhiTranslationLocale(locale);
  /* Keyed by source locale and text: "Titel" written in German is not the same unit as an English one. */
  const translations = new Map<string, string>();
  const translationKey = (sourceLocale: string, text: string) => `${sourceLocale}\u0000${text}`;

  /*
   * The same walk twice: once to learn what is there, once to put the answers back. Collected into a
   * set per source locale, so "Padding" -- which nearly every Layout declares -- is asked for once and
   * not twelve times, and so the second walk looks its answer up by the text itself rather than by a
   * position the two walks would have to agree on.
   *
   * Grouped by the Module's source locale, because a Module that is not ours may write its fields in
   * its own language (TRANSLATIONS.md, "Runtime Module metadata"). Every Module of ours writes English,
   * the canonical source, and is asked for exactly as before: without a source locale, so the units
   * its texts are keyed by stay the ones they always were.
   */
  const pendingBySourceLocale = new Map<string, Set<string>>();
  for (const entry of entries) {
    const sourceLocale = resolvePhiTranslationLocale(entry.sourceLocale);
    /* A reader of the Module's own language reads its words as written. */
    if (isPhiLocaleReadableAsSource(targetLocale, sourceLocale)) continue;
    const pending = pendingBySourceLocale.get(sourceLocale) ?? new Set<string>();
    for (const plugin of entry.plugins) {
      mapPhiBuilderPluginMetaText(plugin, (text) => {
        pending.add(text);
        return text;
      });
    }
    pendingBySourceLocale.set(sourceLocale, pending);
  }

  await Promise.all([...pendingBySourceLocale].map(async ([sourceLocale, pending]) => {
    if (pending.size === 0) return;
    const sources = [...pending];
    const translator = createGlobalTranslator({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      locale,
      ...(sourceLocale === PHI_CANONICAL_SOURCE_LOCALE ? {} : { sourceLocale }),
    });
    /*
     * A failed batch leaves the source texts for this request, and the failure is logged; the next
     * request asks again, because nothing failed is kept (`trBulk` keeps only answers).
     */
    let translated: string[] | null = null;
    try {
      translated = await translator.trBulk(sources, PHI_TR_CTX_WEB_UI_LABEL);
    } catch (error) {
      logRuntimeEvent("warn", "builder.plugin_labels.translation_failed", {
        message: "Plugin labels could not be translated; the source texts are shown for this request.",
        area: "builder",
        error,
        meta: { locale, sourceLocale, count: sources.length },
      });
    }
    if (translated) {
      sources.forEach((source, index) => {
        translations.set(translationKey(sourceLocale, source), translated![index] ?? source);
      });
    }
  }));

  return entries.map((entry) => {
    const sourceLocale = resolvePhiTranslationLocale(entry.sourceLocale);
    return {
      ...entry,
      plugins: entry.plugins.map((plugin) =>
        mapPhiBuilderPluginMetaText(plugin, (text) => translations.get(translationKey(sourceLocale, text)) ?? text),
      ),
    };
  });
}
