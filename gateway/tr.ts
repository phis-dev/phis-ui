import "server-only";

import { normalizeLocale } from "../helpers/locale";
import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import { formatPhiTranslation } from "../helpers/translation-format";

export const PHI_TR_CTX_WEB_UI_LABEL = "Web UI label" as const;

/**
 * The register for a Module's own prose rather than for a control that carries it. A description is a
 * sentence written by whoever wrote the Module, so a translator has to keep it a sentence; told it were
 * a Web UI label it would shorten it into one. Titles stay under the label context, because a Module
 * title is a noun phrase and behaves like every other label on the page.
 */
export const PHI_TR_CTX_MODULE_DESCRIPTION = "Module description" as const;

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

type TranslationResponse = {
  translation?: string;
};

type TranslationBatchResponse = {
  translations?: string[];
};

function logTranslationFallback(error: unknown, meta: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(JSON.stringify({
    level: "warn",
    service: "ui",
    event: "translation.fallback",
    message: "Translation request failed. Falling back to source text.",
    error: message,
    meta,
  }));
}

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
    extra: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "phis-ui/1.0",
    },
  });
}

function isSourceLocale(options: PhiGlobalTranslatorOptions | PhiSiteTranslatorOptions) {
  return options.sourceLocale != null && normalizeLocale(options.locale) === normalizeLocale(options.sourceLocale);
}

async function requestTranslation(
  options: PhiGlobalTranslatorOptions | PhiSiteTranslatorOptions,
  payload: Record<string, unknown>,
) {
  const response = await fetch(buildApiUrl(options.apiBaseUrl, "/api/v1/tr"), {
    method: "POST",
    headers: buildTranslatorHeaders(options),
    body: JSON.stringify(payload),
    cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
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

  try {
    const response = await requestTranslation(options, {
      locale,
      ...(sourceLocale ? { sourceLocale } : {}),
      msg: normalizedMessage,
      ...(context ? { ctx: context } : {}),
      ...(format !== "text" ? { format } : {}),
    });

    const payload = (await response.json()) as TranslationResponse;
    return formatPhiTranslation(payload.translation ?? normalizedMessage, params);
  } catch (error) {
    logTranslationFallback(error, {
      locale,
      sourceLocale: sourceLocale ?? null,
      ctx: context ?? null,
      format,
      siteKey: "siteKey" in options ? options.siteKey : null,
      msg: normalizedMessage.slice(0, 120),
    });
    return formatPhiTranslation(normalizedMessage, params);
  }
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

  try {
    const response = await requestTranslation(options, {
      locale,
      ...(sourceLocale ? { sourceLocale } : {}),
      msgs: normalizedMessages,
      ...(context ? { ctx: context } : {}),
      ...(format !== "text" ? { format } : {}),
    });

    const payload = (await response.json()) as TranslationBatchResponse;
    const translations = Array.isArray(payload.translations) ? payload.translations : [];
    if (translations.length !== normalizedMessages.length) {
      throw new Error("Translation batch length mismatch.");
    }

    return translations.map((translation, index) => translation || normalizedMessages[index] || "");
  } catch (error) {
    logTranslationFallback(error, {
      locale,
      sourceLocale: sourceLocale ?? null,
      ctx: context ?? null,
      format,
      siteKey: "siteKey" in options ? options.siteKey : null,
      msgCount: normalizedMessages.length,
    });
    return normalizedMessages;
  }
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
