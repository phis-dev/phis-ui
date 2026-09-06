import "server-only";

import {
  createGlobalTranslator,
  PHI_TR_CTX_WEB_UI_MESSAGE,
  type PhiGlobalTranslatorOptions,
} from "./tr";
import { PHI_CANONICAL_SOURCE_LOCALE, normalizeLocale } from "../helpers/locale";
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
export type PhiLabelSetEntry = string | { text: string; ctx: string };

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

/** What a set reads as once translated: the same keys, all of them plain text. */
export type PhiLabelSetTexts<TLabels extends PhiLabelSetLabels> = { [K in keyof TLabels]: string };

export type PhiLabelSetDefinition<TLabels extends PhiLabelSetLabels> = {
  key: string;
  /** The register the set is written in, and the one every plain-string label takes. */
  ctx: string;
  sourceLocale?: string;
  labels: TLabels;
};

function readLabelSetEntry(entry: PhiLabelSetEntry, setContext: string) {
  return typeof entry === "string"
    ? { text: entry, ctx: setContext }
    : { text: entry.text, ctx: entry.ctx };
}

const LABEL_SET_CACHE = new Map<string, Record<string, string>>();

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
 * A fingerprint of what the set actually holds. Without it the cache key describes only where a set came
 * from, so a process that cached one before a label was added keeps serving the old object and the new
 * keys read as `undefined` -- a control renders with no label and blank options, which is what a stale
 * dev process did to the Background Travel switch. A deployed process starts fresh and never sees it,
 * but the key should say what is in the set, not just which set it is.
 */
function hashLabelSetShape(labels: PhiLabelSetLabels) {
  let hash = 0x811c9dc5;
  for (const [key, value] of Object.entries(labels)) {
    const entry = typeof value === "string" ? { text: value, ctx: "" } : value;
    for (const text of [key, entry.text, entry.ctx, "\u001f"]) {
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
    }
  }
  return (hash >>> 0).toString(36);
}

function getLabelSetCacheKey(
  targetLocale: string,
  sourceLocale: string,
  setKey: string,
  shape: string,
) {
  return `${normalizeLocale(sourceLocale)}:${normalizeLocale(targetLocale)}:${setKey}:${shape}`;
}

export function clearPhiLabelSetCache(options?: { locale?: string; setKey?: string }) {
  const locale = options?.locale?.trim().toLowerCase() ?? "";
  const setKey = options?.setKey?.trim() ?? "";

  if (!locale && !setKey) {
    LABEL_SET_CACHE.clear();
    return;
  }

  for (const key of LABEL_SET_CACHE.keys()) {
    const matchesLocale = !locale || key.includes(`:${normalizeLocale(locale)}:`);
    // The shape fingerprint follows the set key, so an exact suffix no longer identifies a set.
    const matchesSetKey = !setKey || key.includes(`:${setKey}:`);

    if (matchesLocale && matchesSetKey) {
      LABEL_SET_CACHE.delete(key);
    }
  }
}

export async function getPhiLabelSet<TLabels extends PhiLabelSetLabels>(
  options: PhiGlobalTranslatorOptions,
  definition: PhiLabelSetDefinition<TLabels>,
): Promise<PhiLabelSetTexts<TLabels>> {
  const sourceLocale = normalizeLocale(definition.sourceLocale ?? options.sourceLocale ?? PHI_CANONICAL_SOURCE_LOCALE);
  const targetLocale = normalizeLocale(options.locale);
  const cacheKey = getLabelSetCacheKey(
    targetLocale,
    sourceLocale,
    definition.key,
    hashLabelSetShape(definition.labels),
  );
  const cached = LABEL_SET_CACHE.get(cacheKey);
  if (cached) {
    return cached as PhiLabelSetTexts<TLabels>;
  }

  const entries = Object.entries(definition.labels)
    .map(([key, value]) => [key, readLabelSetEntry(value, definition.ctx)] as const);
  if (sourceLocale === targetLocale) {
    const labels = Object.fromEntries(
      entries.map(([key, entry]) => [key, entry.text]),
    ) as PhiLabelSetTexts<TLabels>;
    LABEL_SET_CACHE.set(cacheKey, labels);
    return labels;
  }

  /*
   * One request per register rather than one per label: a set is nearly all one register, so this is
   * the same single batch it always was plus one more for the handful of entries that are a sentence
   * rather than a caption. The batches run together, and each keeps its own translation identity.
   */
  const entriesByContext = new Map<string, { key: string; text: string }[]>();
  for (const [key, entry] of entries) {
    const group = entriesByContext.get(entry.ctx) ?? [];
    group.push({ key, text: entry.text });
    entriesByContext.set(entry.ctx, group);
  }

  const translator = createGlobalTranslator({ ...options, sourceLocale });
  const translatedByKey = new Map<string, string>();
  await Promise.all([...entriesByContext].map(async ([context, group]) => {
    const translated = await translator.trBulk(group.map((entry) => entry.text), context);
    if (translated.length !== group.length) {
      throw new Error(`Label set length mismatch for "${definition.key}".`);
    }
    group.forEach((entry, index) => {
      translatedByKey.set(entry.key, translated[index] ?? entry.text);
    });
  }));

  const labels = Object.fromEntries(
    entries.map(([key, entry]) => [key, translatedByKey.get(key) ?? entry.text]),
  ) as PhiLabelSetTexts<TLabels>;
  LABEL_SET_CACHE.set(cacheKey, labels);
  return labels;
}
