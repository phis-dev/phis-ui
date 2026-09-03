import "server-only";

import { PHI_CANONICAL_SOURCE_LOCALE, normalizeLocale } from "../helpers/locale";
import { resolvePhiRuntimeConfig } from "../helpers/phis-runtime";
import {
  formatPhiTranslation,
  type PhiTranslationParams,
} from "../helpers/translation-format";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiTranslationFormat,
  trBulk as requestInternalTranslationBulk,
  tr as requestInternalTranslation,
} from "../gateway/tr";
import { getPhiRequestRuntime } from "./request-runtime";
import { resolvePhiRequestLocale } from "./request-locale";

export { PHI_TR_CTX_WEB_UI_LABEL };
export type { PhiTranslationParams } from "../helpers/translation-format";

function buildTranslatorOptions(locale: string, sourceLocale?: string) {
  const requestRuntime = getPhiRequestRuntime();
  const resolvedRuntime = resolvePhiRuntimeConfig({
    apiBaseUrl: requestRuntime.phis.apiBaseUrl,
    internalToken: requestRuntime.phis.internalToken,
    siteKey: requestRuntime.site.key,
  }, {
    context: "trForLocale",
    requireSiteKey: true,
  });

  return {
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    locale,
    siteKey: resolvedRuntime.siteKey as string,
    ...(sourceLocale?.trim() ? { sourceLocale: sourceLocale.trim() } : {}),
  };
}

function buildGlobalTranslatorOptions(locale: string) {
  const requestRuntime = getPhiRequestRuntime();
  const resolvedRuntime = resolvePhiRuntimeConfig({
    apiBaseUrl: requestRuntime.phis.apiBaseUrl,
    internalToken: requestRuntime.phis.internalToken,
  }, {
    context: "trGlobalForLocale",
  });

  return {
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    locale,
  };
}

export async function tr(
  msg: string,
  params: PhiTranslationParams = 0,
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
) {
  const locale = await resolvePhiRequestLocale();
  return trForLocale(locale, msg, params, ctx, format);
}

export async function trGlobal(
  msg: string,
  params: PhiTranslationParams = 0,
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
) {
  const locale = await resolvePhiRequestLocale();
  return trGlobalForLocale(locale, msg, params, ctx, format);
}

function normalizeMessages(msgs: string[]) {
  return msgs.map((msg) => msg.trim()).filter(Boolean);
}

export async function trForLocale(
  localeInput: string,
  msg: string,
  params: PhiTranslationParams = 0,
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
) {
  const normalizedMessage = msg.trim();
  if (!normalizedMessage) {
    return "";
  }

  const locale = normalizeLocale(localeInput);
  const options = buildTranslatorOptions(locale);
  try {
    const translated = await requestInternalTranslation(
      options,
      normalizedMessage,
      undefined,
      ctx ? String(ctx) : undefined,
      format,
    );
    return formatPhiTranslation(translated, params);
  } catch {
    return formatPhiTranslation(normalizedMessage, params);
  }
}

export async function trGlobalForLocale(
  localeInput: string,
  msg: string,
  params: PhiTranslationParams = 0,
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
) {
  const normalizedMessage = msg.trim();
  if (!normalizedMessage) {
    return "";
  }

  const locale = normalizeLocale(localeInput);
  const options = buildGlobalTranslatorOptions(locale);

  if (locale === normalizeLocale(PHI_CANONICAL_SOURCE_LOCALE)) {
    return formatPhiTranslation(normalizedMessage, params);
  }

  try {
    const translated = await requestInternalTranslation(
      options,
      normalizedMessage,
      undefined,
      ctx ? String(ctx) : undefined,
      format,
    );
    return formatPhiTranslation(translated, params);
  } catch {
    return formatPhiTranslation(normalizedMessage, params);
  }
}

export async function trBulk(
  msgs: string[],
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
  sourceLocale?: string,
) {
  const locale = await resolvePhiRequestLocale();
  return trBulkForLocale(locale, msgs, ctx, format, sourceLocale);
}

export async function trBulkForLocale(
  localeInput: string,
  msgs: string[],
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
  sourceLocale?: string,
) {
  const normalizedMessages = normalizeMessages(msgs);
  if (normalizedMessages.length === 0) {
    return [] as string[];
  }

  const locale = normalizeLocale(localeInput);
  const options = buildTranslatorOptions(locale, sourceLocale);
  try {
    return await requestInternalTranslationBulk(
      options,
      normalizedMessages,
      ctx ? String(ctx) : undefined,
      format,
    );
  } catch {
    return normalizedMessages;
  }
}

export async function trGlobalBulk(
  msgs: string[],
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
) {
  const locale = await resolvePhiRequestLocale();
  return trGlobalBulkForLocale(locale, msgs, ctx, format);
}

export async function trGlobalBulkForLocale(
  localeInput: string,
  msgs: string[],
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
) {
  const normalizedMessages = normalizeMessages(msgs);
  if (normalizedMessages.length === 0) {
    return [] as string[];
  }

  const locale = normalizeLocale(localeInput);
  const options = buildGlobalTranslatorOptions(locale);

  if (locale === normalizeLocale(PHI_CANONICAL_SOURCE_LOCALE)) {
    return normalizedMessages;
  }

  try {
    return await requestInternalTranslationBulk(
      options,
      normalizedMessages,
      ctx ? String(ctx) : undefined,
      format,
    );
  } catch {
    return normalizedMessages;
  }
}
