import "server-only";

import {
  PHI_CANONICAL_SOURCE_LOCALE,
  isPhiLocaleReadableAsSource,
  resolvePhiTranslationLocale,
} from "../helpers/locale";
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
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import { PHI_TEXT_SOURCE_PRESET, type PhiTextSource } from "../helpers/text-source";
import type { PhiBlockRuntime } from "../types";

export { PHI_TR_CTX_WEB_UI_LABEL };
export type { PhiTranslationParams } from "../helpers/translation-format";

/**
 * The part of a runtime a Site's translation needs: whose store answers. A caller that holds the
 * runtime hands it over; one that does not is read from the request scope, which a render has and a
 * background run (the search index) may not.
 */
export type PhiTranslationRuntime = Pick<PhiBlockRuntime, "site">;

function buildTranslatorOptions(locale: string, sourceLocale?: string, runtime?: PhiTranslationRuntime) {
  const requestRuntime = runtime ?? getPhiRequestRuntime();
  const resolvedRuntime = resolvePhiRuntimeConfig({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
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
  const resolvedRuntime = resolvePhiRuntimeConfig({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
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

/**
 * A text Widget's own words in the render's locale, from the store their source names.
 *
 * `textSource: "preset"` is a Preset's sentence and the platform's, so the global store answers it;
 * anything else an author wrote and the Site's store does (`helpers/text-source.ts`). The locale is the
 * render's where there is one: a static render has no request to read it from.
 */
export async function trWidgetText(
  locale: string | undefined,
  msg: string,
  textSource: PhiTextSource | undefined,
) {
  if (textSource === PHI_TEXT_SOURCE_PRESET) {
    return locale ? trGlobalForLocale(locale, msg) : trGlobal(msg);
  }
  return locale ? trForLocale(locale, msg) : tr(msg);
}

/**
 * Trimmed, one per message and in order: an empty message stays in its place, and `trBulk` answers it
 * with an empty text, so every answer lines up with the message it belongs to.
 */
function normalizeMessages(msgs: string[]) {
  return msgs.map((msg) => msg.trim());
}

export async function trForLocale(
  localeInput: string,
  msg: string,
  params: PhiTranslationParams = 0,
  ctx: string | number = 0,
  format: PhiTranslationFormat = "text",
  /** The language `msg` is written in, when it is not the Site's own -- a Module's text. */
  sourceLocale?: string,
  /** The runtime the caller holds; without it the request's is read. */
  runtime?: PhiTranslationRuntime,
) {
  const normalizedMessage = msg.trim();
  if (!normalizedMessage) {
    return "";
  }

  const locale = resolvePhiTranslationLocale(localeInput);
  const options = buildTranslatorOptions(locale, sourceLocale, runtime);
  const translated = await requestInternalTranslation(
    options,
    normalizedMessage,
    undefined,
    ctx ? String(ctx) : undefined,
    format,
  );
  return formatPhiTranslation(translated, params);
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

  const locale = resolvePhiTranslationLocale(localeInput);
  const options = buildGlobalTranslatorOptions(locale);

  if (isPhiLocaleReadableAsSource(locale, PHI_CANONICAL_SOURCE_LOCALE)) {
    return formatPhiTranslation(normalizedMessage, params);
  }

  const translated = await requestInternalTranslation(
    options,
    normalizedMessage,
    undefined,
    ctx ? String(ctx) : undefined,
    format,
  );
  return formatPhiTranslation(translated, params);
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
  /** The runtime the caller holds; without it the request's is read. */
  runtime?: PhiTranslationRuntime,
) {
  const normalizedMessages = normalizeMessages(msgs);
  if (!normalizedMessages.some(Boolean)) {
    return normalizedMessages;
  }

  const locale = resolvePhiTranslationLocale(localeInput);
  const options = buildTranslatorOptions(locale, sourceLocale, runtime);
  return requestInternalTranslationBulk(
    options,
    normalizedMessages,
    ctx ? String(ctx) : undefined,
    format,
  );
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
  if (!normalizedMessages.some(Boolean)) {
    return normalizedMessages;
  }

  const locale = resolvePhiTranslationLocale(localeInput);
  const options = buildGlobalTranslatorOptions(locale);

  if (isPhiLocaleReadableAsSource(locale, PHI_CANONICAL_SOURCE_LOCALE)) {
    return normalizedMessages;
  }

  return requestInternalTranslationBulk(
    options,
    normalizedMessages,
    ctx ? String(ctx) : undefined,
    format,
  );
}
