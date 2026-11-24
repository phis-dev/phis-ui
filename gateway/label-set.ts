import "server-only";

import {
  createGlobalTranslator,
  PHI_TR_CTX_WEB_UI_MESSAGE,
  type PhiGlobalTranslatorOptions,
} from "./tr";
import {
  PHI_CANONICAL_SOURCE_LOCALE,
  isPhiLocaleReadableAsSource,
  resolvePhiTranslationLocale,
} from "../helpers/locale";
import {
  PHI_PLURAL_CATEGORIES,
  type PhiCountLabel,
  type PhiPluralCategory,
} from "../helpers/translation-format";
import type { PhiRuntimeModuleDefinition } from "../types/cms-plugins";
import { resolvePhiRuntimeModuleSourceLocale } from "../types/runtime-module-locale";

/**
 * One label, and optionally the register it is written in.
 *
 * A plain string takes the set's own `ctx`. An entry that names its own says: this one is not what the
 * rest of the set is. A table's column titles are labels; "Adjust the table filters and try again." is
 * a sentence, and a translator told it were a Web UI label shortens it into a caption. The register is
 * part of a translation's identity, so the same English text under two registers keeps two answers.
 */
export type PhiLabelSetEntry = string | { text: string; ctx: string } | PhiLabelSetCountEntry;

/**
 * A label that says a count: one template per plural category, `other` required (TRANSLATIONS.md,
 * "Count labels"). It reads back as a `PhiCountLabel` and is formatted with `formatPhiCountLabel`, never
 * by a Widget's own `count === 1` branch. `ctx` names its register as a `{ text, ctx }` entry does;
 * absent, it takes the set's.
 */
export type PhiLabelSetCountEntry = { count: PhiCountLabel; ctx?: string };

export type PhiLabelSetLabels = Record<string, PhiLabelSetEntry>;

/**
 * One label that is a sentence rather than a caption, in a set that is otherwise captions.
 *
 * Written out at every call site the register would bury the label it marks, so this says the same
 * thing in the width of the text itself. Any other register is still written as the plain object.
 */
export function definePhiMessageLabel(text: string): PhiLabelSetEntry {
  return { text, ctx: PHI_TR_CTX_WEB_UI_MESSAGE };
}

/** A count label, `{ one: "%1 page", other: "%1 pages" }`, in the set's register unless `ctx` names another. */
export function definePhiCountLabel(count: PhiCountLabel, ctx?: string): PhiLabelSetCountEntry {
  return ctx === undefined ? { count } : { count, ctx };
}

/** What a set reads as once translated: the same keys, plain text, and a count label for a count label. */
export type PhiLabelSetTexts<TLabels extends PhiLabelSetLabels> = {
  [K in keyof TLabels]: TLabels[K] extends PhiLabelSetCountEntry ? PhiCountLabel : string;
};

export type PhiLabelSetDefinition<TLabels extends PhiLabelSetLabels> = {
  key: string;
  /** The register the set is written in, and the one every plain-string label takes. */
  ctx: string;
  sourceLocale?: string;
  labels: TLabels;
};

/** One text the set sends: a label, or one category of a count label. */
type LabelSetUnit = { key: string; category: PhiPluralCategory | null; text: string; ctx: string };

/**
 * The register a count label's category is translated in: the label's own, saying which form it is. The
 * category belongs to the translation's identity because English often writes two forms alike -- "%1
 * configured" is `one` and `other` both -- where a translator's language does not; under the bare register
 * they would be one message with one answer. It also tells the translator which form to write.
 */
function readCountCategoryContext(ctx: string, category: PhiPluralCategory) {
  return `${ctx}, plural category ${category}`;
}

function readLabelSetUnits(key: string, entry: PhiLabelSetEntry, setContext: string): LabelSetUnit[] {
  if (typeof entry === "string") {
    return [{ key, category: null, text: entry, ctx: setContext }];
  }
  if ("count" in entry) {
    const ctx = entry.ctx ?? setContext;
    return PHI_PLURAL_CATEGORIES.flatMap((category) => {
      const text = entry.count[category];
      return text === undefined
        ? []
        : [{ key, category, text, ctx: readCountCategoryContext(ctx, category) }];
    });
  }
  return [{ key, category: null, text: entry.text, ctx: entry.ctx }];
}

/** The units read back into the set's shape: a label's text, or a count label's categories. */
function assembleLabelSetTexts<TLabels extends PhiLabelSetLabels>(
  units: LabelSetUnit[],
  readText: (unit: LabelSetUnit, index: number) => string,
): PhiLabelSetTexts<TLabels> {
  const labels: Record<string, string | Record<string, string>> = {};
  units.forEach((unit, index) => {
    const text = readText(unit, index);
    if (unit.category === null) {
      labels[unit.key] = text;
      return;
    }
    const count = (labels[unit.key] ?? {}) as Record<string, string>;
    count[unit.category] = text;
    labels[unit.key] = count;
  });
  return labels as PhiLabelSetTexts<TLabels>;
}

export function definePhiLabelSet<TLabels extends PhiLabelSetLabels>(
  definition: PhiLabelSetDefinition<TLabels>,
) {
  return definition;
}

export function definePhiRuntimeModuleLabelSet<TLabels extends PhiLabelSetLabels>(
  moduleDefinition: Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">,
  definition: Omit<PhiLabelSetDefinition<TLabels>, "sourceLocale">,
) {
  return definePhiLabelSet({
    ...definition,
    key: `module:${moduleDefinition.moduleId}:${definition.key}`,
    sourceLocale: resolvePhiRuntimeModuleSourceLocale(moduleDefinition),
  });
}

/**
 * The set's texts in the requested locale. Not cached as a set: each translation is kept per message by
 * helpers/translation-cache.ts, which expires and is cleared on an edit. A set kept whole would hold an
 * edited label, or the source text of a failed request, until the process restarts.
 */
export async function getPhiLabelSet<TLabels extends PhiLabelSetLabels>(
  options: PhiGlobalTranslatorOptions,
  definition: PhiLabelSetDefinition<TLabels>,
): Promise<PhiLabelSetTexts<TLabels>> {
  const sourceLocale = resolvePhiTranslationLocale(
    definition.sourceLocale ?? options.sourceLocale ?? PHI_CANONICAL_SOURCE_LOCALE,
  );
  const targetLocale = resolvePhiTranslationLocale(options.locale);
  const units = Object.entries(definition.labels)
    .flatMap(([key, value]) => readLabelSetUnits(key, value, definition.ctx));
  if (isPhiLocaleReadableAsSource(targetLocale, sourceLocale)) {
    return assembleLabelSetTexts<TLabels>(units, (unit) => unit.text);
  }

  /*
   * One request per register rather than one per label: a set is nearly all one register, so this is
   * the same single batch it always was plus one more for the handful of entries that are a sentence
   * rather than a caption, and one per plural category a count label states. The batches run together,
   * and each keeps its own translation identity; each answer goes back to its unit by position.
   */
  const unitsByContext = new Map<string, number[]>();
  units.forEach((unit, index) => {
    const group = unitsByContext.get(unit.ctx) ?? [];
    group.push(index);
    unitsByContext.set(unit.ctx, group);
  });

  const translator = createGlobalTranslator({ ...options, sourceLocale });
  const translatedByUnit: (string | undefined)[] = [];
  await Promise.all([...unitsByContext].map(async ([context, group]) => {
    const translated = await translator.trBulk(group.map((index) => units[index]!.text), context);
    if (translated.length !== group.length) {
      throw new Error(`Label set length mismatch for "${definition.key}".`);
    }
    group.forEach((unitIndex, index) => {
      translatedByUnit[unitIndex] = translated[index];
    });
  }));

  return assembleLabelSetTexts<TLabels>(units, (unit, index) => translatedByUnit[index] ?? unit.text);
}
