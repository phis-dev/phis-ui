import "server-only";

import { isPhiLocaleReadableAsSource } from "../helpers/locale";
import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import { formatPhiTranslation } from "../helpers/translation-format";
import {
  buildPhiTranslationCacheKey,
  readPhiTranslationCache,
  readPhiTranslationCacheGeneration,
  writePhiTranslationCache,
} from "../helpers/translation-cache";

export const PHI_TR_CTX_WEB_UI_LABEL = "Web UI label" as const;

/**
 * The register for a Module's own prose rather than for a control that carries it. A description is a
 * sentence written by whoever wrote the Module, so a translator has to keep it a sentence; told it were
 * a Web UI label it would shorten it into one. Titles stay under the label context, because a Module
 * title is a noun phrase and behaves like every other label on the page.
 */
export const PHI_TR_CTX_MODULE_DESCRIPTION = "Module description" as const;

/**
 * The register for the sentences a UI says rather than the words it labels: an empty state, a failure,
 * a count read back to the operator. Told these were Web UI labels a translator clips them into button
 * captions -- "Adjust the table filters and try again." comes back as "Adjust filters". Anything that
 * ends in a full stop, or would if it were written out, belongs here; the words on a control stay under
 * the label context.
 */
export const PHI_TR_CTX_WEB_UI_MESSAGE = "Web UI message" as const;

export type PhiTranslateParams = Array<string | number>;
export type PhiTranslationFormat = "text" | "html";

export type PhiGlobalTranslatorOptions = {
  apiBaseUrl: string;
  internalToken: string;
  locale: string;
  sourceLocale?: string | null;
};

export type PhiSiteTranslatorOptions = PhiGlobalTranslatorOptions & {
  siteKey: string;
};

/**
 * `provisional`: at least one answer is source text standing in for a failure on Core's side. Handed on
 * to the caller, never kept -- the cache has no expiry that would end it.
 */
type TranslationResponse = {
  translation?: string;
  provisional?: boolean;
};

type TranslationBatchResponse = {
  translations?: string[];
  provisional?: boolean;
};

function assertGlobalTranslatorOptions({
  apiBaseUrl,
  internalToken,
  locale,
}: PhiGlobalTranslatorOptions) {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for translator.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for translator.");
  }
  if (!locale.trim()) {
    throw new Error("Missing locale for translator.");
  }
}

function assertSiteTranslatorOptions(options: PhiSiteTranslatorOptions) {
  assertGlobalTranslatorOptions(options);
  if (!options.siteKey.trim()) {
    throw new Error("Missing siteKey for site translator.");
  }
}

function buildTranslatorHeaders(
  options: PhiGlobalTranslatorOptions | PhiSiteTranslatorOptions,
) {
  return buildApiHeaders({
    token: options.internalToken,
    includeToken: true,
    includeSiteKey: "siteKey" in options && Boolean(options.siteKey.trim()),
    siteKey: "siteKey" in options ? options.siteKey : "",
    gateway: true,
    jsonBody: true,
  });
}

/**
 * The cache key for one message under one translator.
 *
 * A Site translator and a global one may hold the same message under different translations, so the
 * Site key is part of the identity rather than an attribute of it.
 */
function buildTranslationKey(
  options: PhiGlobalTranslatorOptions | PhiSiteTranslatorOptions,
  input: { locale: string; sourceLocale: string | undefined; ctx: string | undefined; format: PhiTranslationFormat; msg: string },
) {
  return buildPhiTranslationCacheKey({
    scope: "siteKey" in options ? options.siteKey.trim() : "",
    sourceLocale: input.sourceLocale ?? "",
    targetLocale: input.locale,
    ctx: input.ctx ?? "",
    format: input.format,
    msg: input.msg,
  });
}

function isSourceLocale(options: PhiGlobalTranslatorOptions | PhiSiteTranslatorOptions) {
  return options.sourceLocale != null && isPhiLocaleReadableAsSource(options.locale, options.sourceLocale);
}

async function requestTranslation(
  options: PhiGlobalTranslatorOptions | PhiSiteTranslatorOptions,
  payload: Record<string, unknown>,
) {
  const response = await fetch(buildApiUrl(options.apiBaseUrl, "/api/v1/tr"), {
    method: "POST",
    headers: buildTranslatorHeaders(options),
    body: JSON.stringify(payload),
    // Kept by helpers/translation-cache.ts instead, which the change markers empty: Next's data cache
    // would outlive every edit.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to translate message (${response.status}).`);
  }

  return response;
}

export async function tr(
  options: PhiGlobalTranslatorOptions | PhiSiteTranslatorOptions,
  msg: string,
  params?: PhiTranslateParams,
  ctx?: string,
  format: PhiTranslationFormat = "text",
) {
  if ("siteKey" in options) {
    assertSiteTranslatorOptions(options);
  } else {
    assertGlobalTranslatorOptions(options);
  }

  const normalizedMessage = msg.trim();
  if (!normalizedMessage) {
    return "";
  }

  const locale = options.locale.trim().toLowerCase();
  const sourceLocale = options.sourceLocale?.trim();
  const context = ctx?.trim() ? ctx.trim() : undefined;

  if (isSourceLocale(options)) {
    return formatPhiTranslation(normalizedMessage, params);
  }

  // The cache holds the translation, never the formatted result: `params` belong to the call site.
  const cacheKey = buildTranslationKey(options, {
    locale,
    sourceLocale,
    ctx: context,
    format,
    msg: normalizedMessage,
  });
  const cached = readPhiTranslationCache(cacheKey);
  if (cached != null) {
    return formatPhiTranslation(cached, params);
  }

  // phis-server already answers a provider failure with the source text, marked provisional; what reaches
  // this side as an error is the server failing, and that is not a translation to stand in for.
  const generation = readPhiTranslationCacheGeneration();
  const response = await requestTranslation(options, {
    locale,
    ...(sourceLocale ? { sourceLocale } : {}),
    msg: normalizedMessage,
    ...(context ? { ctx: context } : {}),
    ...(format !== "text" ? { format } : {}),
  });

  const payload = (await response.json()) as TranslationResponse;
  if (typeof payload.translation !== "string") {
    throw new Error("Translation response carries no translation.");
  }
  if (payload.provisional !== true) {
    writePhiTranslationCache(cacheKey, payload.translation, generation);
  }
  return formatPhiTranslation(payload.translation, params);
}

export async function trBulk(
  options: PhiGlobalTranslatorOptions | PhiSiteTranslatorOptions,
  msgs: string[],
  ctx?: string,
  format: PhiTranslationFormat = "text",
) {
  if ("siteKey" in options) {
    assertSiteTranslatorOptions(options);
  } else {
    assertGlobalTranslatorOptions(options);
  }

  const normalizedMessages = msgs.map((msg) => msg.trim()).filter(Boolean);
  if (normalizedMessages.length === 0) {
    return [] as string[];
  }

  const locale = options.locale.trim().toLowerCase();
  const sourceLocale = options.sourceLocale?.trim();
  const context = ctx?.trim() ? ctx.trim() : undefined;

  if (isSourceLocale(options)) {
    return normalizedMessages;
  }

  const cacheKeys = normalizedMessages.map((msg) =>
    buildTranslationKey(options, { locale, sourceLocale, ctx: context, format, msg }),
  );
  const resolved = cacheKeys.map((key) => readPhiTranslationCache(key));

  /*
   * A batch repeats the same message often -- a Navigation surface and the Overlay that mirrors it, an
   * Area whose header and sidebar share entries -- so what is missing is asked for once per distinct
   * message and the answer is spread back over every position that wanted it.
   */
  const pending: string[] = [];
  const pendingIndexByKey = new Map<string, number>();
  for (const [index, value] of resolved.entries()) {
    const key = cacheKeys[index];
    if (value != null || key == null || pendingIndexByKey.has(key)) {
      continue;
    }
    pendingIndexByKey.set(key, pending.length);
    pending.push(normalizedMessages[index] ?? "");
  }

  if (pending.length === 0) {
    return normalizedMessages.map((msg, index) => resolved[index] ?? msg);
  }

  const generation = readPhiTranslationCacheGeneration();
  const response = await requestTranslation(options, {
    locale,
    ...(sourceLocale ? { sourceLocale } : {}),
    msgs: pending,
    ...(context ? { ctx: context } : {}),
    ...(format !== "text" ? { format } : {}),
  });

  const payload = (await response.json()) as TranslationBatchResponse;
  const translations = payload.translations;
  if (
    !Array.isArray(translations) ||
    translations.length !== pending.length ||
    translations.some((translation) => typeof translation !== "string")
  ) {
    throw new Error("Translation batch does not answer every message it was asked.");
  }

  if (payload.provisional !== true) {
    for (const [key, pendingIndex] of pendingIndexByKey) {
      writePhiTranslationCache(key, translations[pendingIndex]!, generation);
    }
  }

  return normalizedMessages.map((_msg, index) => {
    const hit = resolved[index];
    if (hit != null) {
      return hit;
    }
    return translations[pendingIndexByKey.get(cacheKeys[index]!)!]!;
  });
}

export function createGlobalTranslator(options: PhiGlobalTranslatorOptions) {
  return {
    tr: (
      msg: string,
      params?: PhiTranslateParams,
      ctx?: string,
      format?: PhiTranslationFormat,
    ) => tr(options, msg, params, ctx, format),
    trBulk: (msgs: string[], ctx?: string, format?: PhiTranslationFormat) =>
      trBulk(options, msgs, ctx, format),
  };
}

export function createSiteTranslator(options: PhiSiteTranslatorOptions) {
  return {
    tr: (
      msg: string,
      params?: PhiTranslateParams,
      ctx?: string,
      format?: PhiTranslationFormat,
    ) => tr(options, msg, params, ctx, format),
    trBulk: (msgs: string[], ctx?: string, format?: PhiTranslationFormat) =>
      trBulk(options, msgs, ctx, format),
  };
}
