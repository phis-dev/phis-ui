import "server-only";

import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { PHI_TR_CTX_WEB_UI_LABEL, createGlobalTranslator } from "../../../gateway/tr";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { logRuntimeEvent } from "../../../net/log";
import type { PhiBuilderModuleAuthoringCatalogEntry } from "./module-authoring-catalog";
import { mapPhiBuilderPluginMetaText } from "./plugin-meta-labels";

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
  const translations = new Map<string, string>();

  /*
   * The same walk twice: once to learn what is there, once to put the answers back. Collected into a
   * set, so "Padding" -- which nearly every Layout declares -- is asked for once and not twelve
   * times, and so the second walk looks its answer up by the text itself rather than by a position
   * the two walks would have to agree on.
   */
  const pending = new Set<string>();
  for (const entry of entries) {
    for (const plugin of entry.plugins) {
      mapPhiBuilderPluginMetaText(plugin, (text) => {
        pending.add(text);
        return text;
      });
    }
  }

  if (pending.size > 0) {
    // Only what has words: `trBulk` leaves empty messages out of its answer, which would shift the rest.
    const sources = [...pending].filter((text) => text.trim().length > 0);
    const translator = createGlobalTranslator({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      locale,
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
        meta: { locale, count: sources.length },
      });
    }
    if (translated) {
      sources.forEach((source, index) => {
        translations.set(source, translated![index] ?? source);
      });
    }
  }

  return entries.map((entry) => ({
    ...entry,
    plugins: entry.plugins.map((plugin) =>
      mapPhiBuilderPluginMetaText(plugin, (text) => translations.get(text) ?? text),
    ),
  }));
}
