import "server-only";

import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { PHI_TR_CTX_WEB_UI_LABEL, createGlobalTranslator } from "../../../gateway/tr";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
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
 */
const PLUGIN_TEXT_CACHE = new Map<string, Map<string, string>>();

function resolveLocaleCache(locale: string) {
  const key = locale.trim().toLowerCase();
  const cached = PLUGIN_TEXT_CACHE.get(key);
  if (cached) {
    return cached;
  }
  const created = new Map<string, string>();
  PLUGIN_TEXT_CACHE.set(key, created);
  return created;
}

export async function localizePhiBuilderModuleAuthoringCatalog(
  runtime: Pick<PhiBlockRuntime, "locale">,
  entries: readonly PhiBuilderModuleAuthoringCatalogEntry[],
): Promise<PhiBuilderModuleAuthoringCatalogEntry[]> {
  const locale = runtime.locale.current;
  const translations = resolveLocaleCache(locale);

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
        if (!translations.has(text)) {
          pending.add(text);
        }
        return text;
      });
    }
  }

  if (pending.size > 0) {
    const sources = [...pending];
    const translator = createGlobalTranslator({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      locale,
    });
    const translated = await translator
      .trBulk(sources, PHI_TR_CTX_WEB_UI_LABEL)
      .catch(() => sources);
    sources.forEach((source, index) => {
      translations.set(source, translated[index] ?? source);
    });
  }

  return entries.map((entry) => ({
    ...entry,
    plugins: entry.plugins.map((plugin) =>
      mapPhiBuilderPluginMetaText(plugin, (text) => translations.get(text) ?? text),
    ),
  }));
}
