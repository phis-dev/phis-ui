import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, PHI_TR_CTX_WEB_UI_MESSAGE } from "../gateway/tr";
import { PhiCmsFlags } from "../constants/phi-cms";
import {
  collectPhiConfigTexts,
  collectPhiDeclaredConfigTexts,
  writePhiConfigTexts,
  type PhiConfigTextLocation,
  type PhiConfigTextRegister,
} from "../helpers/config-text-fields";
import { hasPhiFlag } from "../helpers/flags";
import { maskPhiTextPlaceholders, resolvePhiTextPlaceholders } from "../helpers/text-placeholders";
import { PHI_TEXT_SOURCE_PRESET, readPhiTextSource } from "../helpers/text-source";
import type { PhiBlockRuntime } from "../types";
import type { PhiResolvedCmsRenderableTree } from "../types/cms";
import type { PhiCmsRuntimeRenderRegistry, PhiCmsWidgetPluginDefinition } from "../types/cms-plugins";
import { trBulkForLocale, trGlobalBulkForLocale } from "./translate";

/**
 * The words in Widget configs in the reader's language, translated in one pass for a page.
 *
 * Translating is the rule, not something each Widget remembers: which fields are text is answered by
 * their names (`helpers/config-text-fields.ts`), a text no field edits is declared by the Widget
 * (`configTexts`), and every Widget is handed its config with those already in the reader's language. A
 * Widget that `translatesOwnText` is left out -- a Markdown body is parsed into units before it is
 * translated, and its author may want it left as written, which is why only such content Widgets carry
 * the `NoTranslate` switch. A node a Preset flagged `NoTranslate` holds words it read from a Label Set in
 * the reader's language already: nothing of it is sent, its placeholders are only filled in.
 *
 * Every text is masked before it is sent and filled after (`helpers/text-placeholders.ts`): `{site.name}`
 * never reaches a translator, and a list entry's values stand as `%1` onwards, so "Up to %1 users" is
 * translated once for every Site.
 *
 * The store is whose words they are (`helpers/text-source.ts`): a Preset's go to the platform's store,
 * an author's to the Site's. One request per store and register, whatever the number of Widgets. The
 * search index reads a Page's words through the same pass (`server-helpers/search-index.ts`).
 */

const CTX_BY_REGISTER: Readonly<Record<PhiConfigTextRegister, string>> = {
  label: PHI_TR_CTX_WEB_UI_LABEL,
  message: PHI_TR_CTX_WEB_UI_MESSAGE,
};

type PhiTextBatchKey = `${"global" | "site"}:${PhiConfigTextRegister}`;

export type PhiWidgetTextDefinition = Partial<Pick<
  PhiCmsWidgetPluginDefinition<unknown>,
  "fields" | "translatesOwnText" | "configTexts"
>>;

export type PhiWidgetTextSubject = {
  id: string;
  flags: number;
  config: Record<string, unknown>;
  definition: PhiWidgetTextDefinition | null | undefined;
};

function collectSubjectTexts(subject: PhiWidgetTextSubject): PhiConfigTextLocation[] {
  const { definition } = subject;
  if (!definition || definition.translatesOwnText) return [];
  const located = [
    ...collectPhiConfigTexts(definition.fields ?? [], subject.config),
    ...collectPhiDeclaredConfigTexts(definition.configTexts ?? [], subject.config),
  ];
  const seen = new Set<string>();
  return located.filter((location) => {
    const key = location.path.join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Each subject's config with its words translated, keyed by id; a subject with none is not in the map. */
export async function translatePhiWidgetConfigTexts(
  subjects: readonly PhiWidgetTextSubject[],
  runtime: PhiBlockRuntime,
): Promise<Map<string, Record<string, unknown>>> {
  const pending = subjects
    .map((subject) => ({
      subject,
      batch: readPhiTextSource(subject.config.textSource) === PHI_TEXT_SOURCE_PRESET ? "global" as const : "site" as const,
      // Filled in all the same: a value or `{year}` is not a word, and a node left as written still shows it.
      translate: !hasPhiFlag(subject.flags, PhiCmsFlags.NoTranslate),
      locations: collectSubjectTexts(subject).map((location) => ({
        location,
        masked: maskPhiTextPlaceholders(location.text, location.values?.length ?? 0),
      })),
    }))
    .filter((entry) => entry.locations.length > 0);
  const configs = new Map<string, Record<string, unknown>>();
  if (pending.length === 0) return configs;

  const batches = new Map<PhiTextBatchKey, string[]>();
  const positions = pending.map((entry) =>
    entry.locations.map(({ location, masked }) => {
      if (!entry.translate) return null;
      const key: PhiTextBatchKey = `${entry.batch}:${location.register}`;
      let texts = batches.get(key);
      if (!texts) {
        texts = [];
        batches.set(key, texts);
      }
      texts.push(masked.text);
      return { key, index: texts.length - 1 };
    }));

  const locale = runtime.locale.current;
  const answers = new Map<PhiTextBatchKey, string[]>(await Promise.all(
    [...batches].map(async ([key, texts]) => {
      const [store, register] = key.split(":") as ["global" | "site", PhiConfigTextRegister];
      const ctx = CTX_BY_REGISTER[register];
      const translated = store === "global"
        ? await trGlobalBulkForLocale(locale, texts, ctx)
        : await trBulkForLocale(locale, texts, ctx);
      return [key, translated] as const;
    }),
  ));

  pending.forEach((entry, entryIndex) => {
    configs.set(entry.subject.id, writePhiConfigTexts(
      entry.subject.config,
      entry.locations.map(({ location, masked }, index) => {
        const position = positions[entryIndex]![index];
        const translated = (position && answers.get(position.key)?.[position.index]?.trim()) || masked.text;
        return {
          path: location.path,
          text: resolvePhiTextPlaceholders(translated, masked.names, runtime, location.values ?? []),
        };
      }),
    ));
  });
  return configs;
}

export async function translatePhiCmsTreeWidgetTexts<TTree extends PhiResolvedCmsRenderableTree>(
  tree: TTree,
  registry: Pick<PhiCmsRuntimeRenderRegistry, "runtimeWidgetPluginsByType" | "previewWidgetPluginsByType">,
  runtime: PhiBlockRuntime,
): Promise<TTree> {
  const configs = await translatePhiWidgetConfigTexts(tree.contentWidgets.map((widget) => ({
    id: widget.id,
    flags: widget.flags,
    config: widget.config,
    definition: registry.runtimeWidgetPluginsByType.get(widget.widgetType)
      ?? registry.previewWidgetPluginsByType.get(widget.widgetType),
  })), runtime);
  if (configs.size === 0) return tree;
  return {
    ...tree,
    contentWidgets: tree.contentWidgets.map((widget) => {
      const config = configs.get(widget.id);
      return config ? { ...widget, config } : widget;
    }),
  };
}
