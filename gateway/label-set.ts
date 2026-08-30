import "server-only";

import {
  createGlobalTranslator,
  type PhiGlobalTranslatorOptions,
} from "./tr";
import { DEFAULT_LOCALE, normalizeLocale } from "../helpers/locale";
import type { PhiRuntimeModuleDefinition } from "../types/cms-plugins";
import { resolvePhiRuntimeModuleSourceLocale } from "../types/runtime-module-locale";

export type PhiLabelSetDefinition<TLabels extends Record<string, string>> = {
  key: string;
  ctx: string;
  sourceLocale?: string;
  labels: TLabels;
};

const LABEL_SET_CACHE = new Map<string, Record<string, string>>();

export function definePhiLabelSet<TLabels extends Record<string, string>>(
  definition: PhiLabelSetDefinition<TLabels>,
) {
  return definition;
}

export function definePhiRuntimeModuleLabelSet<TLabels extends Record<string, string>>(
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
function hashLabelSetShape(labels: Record<string, string>) {
  let hash = 0x811c9dc5;
  for (const [key, value] of Object.entries(labels)) {
    for (const text of [key, value, "\u001f"]) {
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

export async function getPhiLabelSet<TLabels extends Record<string, string>>(
  options: PhiGlobalTranslatorOptions,
  definition: PhiLabelSetDefinition<TLabels>,
) {
  const sourceLocale = normalizeLocale(definition.sourceLocale ?? options.sourceLocale ?? DEFAULT_LOCALE);
  const targetLocale = normalizeLocale(options.locale);
  const cacheKey = getLabelSetCacheKey(
    targetLocale,
    sourceLocale,
    definition.key,
    hashLabelSetShape(definition.labels),
  );
  const cached = LABEL_SET_CACHE.get(cacheKey);
  if (cached) {
    return cached as TLabels;
  }

  const entries = Object.entries(definition.labels);
  if (sourceLocale === targetLocale) {
    const labels = Object.fromEntries(entries) as TLabels;
    LABEL_SET_CACHE.set(cacheKey, labels);
    return labels;
  }

  const translator = createGlobalTranslator({ ...options, sourceLocale });
  const translated = await translator.trBulk(
    entries.map(([, value]) => value),
    definition.ctx,
  );
  if (translated.length !== entries.length) {
    throw new Error(`Label set length mismatch for "${definition.key}".`);
  }

  const labels = Object.fromEntries(
    entries.map(([key, fallback], index) => [key, translated[index] ?? fallback]),
  ) as TLabels;
  LABEL_SET_CACHE.set(cacheKey, labels);
  return labels;
}
