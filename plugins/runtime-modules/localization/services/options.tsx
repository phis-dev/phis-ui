"use client";

import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";

function readOptions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const locales = (value as Record<string, unknown>).platformLocales;
  return Array.isArray(locales) ? locales.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const record = entry as Record<string, unknown>;
    return typeof record.code === "string"
      ? [{ value: record.code, label: typeof record.label === "string" ? `${record.label} (${record.code})` : record.code }]
      : [];
  }) : [];
}

function readSiteLocaleOptions(value: unknown, localeKey: "availableLocales" | "targetLocales" = "availableLocales") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { options: [] };
  const record = value as Record<string, unknown>;
  const site = record.site && typeof record.site === "object" && !Array.isArray(record.site)
    ? record.site as Record<string, unknown>
    : {};
  const locales = Array.isArray(site[localeKey]) ? site[localeKey] : [];
  return {
    options: locales.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const locale = entry as Record<string, unknown>;
      return typeof locale.code === "string"
        ? [{ value: locale.code, label: typeof locale.label === "string" ? `${locale.label} (${locale.code})` : locale.code }]
        : [];
    }),
    value: typeof record.selectedLocale === "string" ? record.selectedLocale : undefined,
  };
}

function readContextOptions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { options: [] };
  const contexts = (value as Record<string, unknown>).contexts;
  return {
    options: [{ value: "all", label: "All" }, ...(Array.isArray(contexts) ? contexts.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const context = entry as Record<string, unknown>;
      return typeof context.context === "string" && context.context.trim() !== ""
        ? [{
            value: context.context,
            label: typeof context.count === "number" ? `${context.context} (${context.count})` : context.context,
          }]
        : [];
    }) : [])],
    value: "all",
  };
}

async function loadPlatformLocales() {
  const response = await fetch("/api/site/admin/locales?page=1&pageSize=1", {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Failed to load available locales.");
  return payload;
}

function resolveAdminSiteLocales(context: PhiControlOptionsProviderContext) {
  return readSiteLocaleOptions(context.asyncData, "targetLocales");
}

function resolvePlatformLocales(context: PhiControlOptionsProviderContext) {
  return { options: readOptions(context.asyncData) };
}

export const PhiLocalizationPlatformLocalesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.platformLocales,
  load: loadPlatformLocales,
  resolveLoadKey: () => "platform-locales",
  resolve: resolvePlatformLocales,
});

export const PhiLocalizationAdminSiteLocalesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.adminSiteLocales,
  load: loadPlatformLocales,
  resolveLoadKey: () => "admin-site-locales",
  resolve: resolveAdminSiteLocales,
});

async function loadEditorWorkspace() {
  const response = await fetch("/api/site/editor/translations?page=1&pageSize=1", {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Failed to load translation workspace options.");
  return payload;
}

export const PhiLocalizationSiteLocalesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.siteLocales,
  load: loadEditorWorkspace,
  resolveLoadKey: () => "editor-workspace",
  resolve: (context) => readSiteLocaleOptions(context.asyncData),
});

export const PhiLocalizationTranslationContextsOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.translationContexts,
  load: loadEditorWorkspace,
  resolveLoadKey: () => "editor-workspace",
  resolve: (context) => readContextOptions(context.asyncData),
});
