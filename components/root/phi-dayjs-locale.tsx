"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import dayjs from "dayjs";

type DayjsLocaleModule = {
  default?: unknown;
};

type PhiDayjsLocaleKey =
  | "ar"
  | "bg"
  | "cs"
  | "da"
  | "de"
  | "de-at"
  | "de-ch"
  | "el"
  | "en"
  | "en-gb"
  | "es"
  | "es-us"
  | "et"
  | "fi"
  | "fr"
  | "fr-ca"
  | "fr-ch"
  | "he"
  | "hu"
  | "id"
  | "it"
  | "ja"
  | "ko"
  | "lt"
  | "lv"
  | "nb"
  | "nl"
  | "pl"
  | "pt"
  | "pt-br"
  | "pt-pt"
  | "ro"
  | "ru"
  | "sk"
  | "sl"
  | "sv"
  | "th"
  | "tr"
  | "uk"
  | "vi"
  | "zh-cn"
  | "zh-hant"
  | "zh-tw";

type PhiDayjsLocaleResolution = {
  key: PhiDayjsLocaleKey;
  localeName: string;
};

const PHI_DAYJS_LOCALE_LOADERS: Record<PhiDayjsLocaleKey, () => Promise<DayjsLocaleModule>> = {
  ar: () => import("dayjs/locale/ar"),
  bg: () => import("dayjs/locale/bg"),
  cs: () => import("dayjs/locale/cs"),
  da: () => import("dayjs/locale/da"),
  de: () => import("dayjs/locale/de"),
  "de-at": () => import("dayjs/locale/de-at"),
  "de-ch": () => import("dayjs/locale/de-ch"),
  el: () => import("dayjs/locale/el"),
  en: () => import("dayjs/locale/en"),
  "en-gb": () => import("dayjs/locale/en-gb"),
  es: () => import("dayjs/locale/es"),
  "es-us": () => import("dayjs/locale/es-us"),
  et: () => import("dayjs/locale/et"),
  fi: () => import("dayjs/locale/fi"),
  fr: () => import("dayjs/locale/fr"),
  "fr-ca": () => import("dayjs/locale/fr-ca"),
  "fr-ch": () => import("dayjs/locale/fr-ch"),
  he: () => import("dayjs/locale/he"),
  hu: () => import("dayjs/locale/hu"),
  id: () => import("dayjs/locale/id"),
  it: () => import("dayjs/locale/it"),
  ja: () => import("dayjs/locale/ja"),
  ko: () => import("dayjs/locale/ko"),
  lt: () => import("dayjs/locale/lt"),
  lv: () => import("dayjs/locale/lv"),
  nb: () => import("dayjs/locale/nb"),
  nl: () => import("dayjs/locale/nl"),
  pl: () => import("dayjs/locale/pl"),
  pt: () => import("dayjs/locale/pt"),
  "pt-br": () => import("dayjs/locale/pt-br"),
  "pt-pt": () => import("dayjs/locale/pt"),
  ro: () => import("dayjs/locale/ro"),
  ru: () => import("dayjs/locale/ru"),
  sk: () => import("dayjs/locale/sk"),
  sl: () => import("dayjs/locale/sl"),
  sv: () => import("dayjs/locale/sv"),
  th: () => import("dayjs/locale/th"),
  tr: () => import("dayjs/locale/tr"),
  uk: () => import("dayjs/locale/uk"),
  vi: () => import("dayjs/locale/vi"),
  "zh-cn": () => import("dayjs/locale/zh-cn"),
  "zh-hant": () => import("dayjs/locale/zh-tw"),
  "zh-tw": () => import("dayjs/locale/zh-tw"),
};

function normalizeLocaleKey(input: string | null | undefined) {
  return input?.trim().replace(/_/g, "-").toLowerCase() ?? "";
}

const PHI_DAYJS_LOCALE_RESOLUTIONS = new Map<string, PhiDayjsLocaleResolution>();

function registerDayjsLocale(
  resolution: PhiDayjsLocaleResolution,
  aliases: readonly string[] = [],
) {
  for (const value of [resolution.key, resolution.localeName, ...aliases]) {
    const normalized = normalizeLocaleKey(value);
    if (normalized) {
      PHI_DAYJS_LOCALE_RESOLUTIONS.set(normalized, resolution);
    }
  }
}

registerDayjsLocale({ key: "ar", localeName: "ar" });
registerDayjsLocale({ key: "bg", localeName: "bg" });
registerDayjsLocale({ key: "cs", localeName: "cs" });
registerDayjsLocale({ key: "da", localeName: "da" });
registerDayjsLocale({ key: "de", localeName: "de" }, ["de-de"]);
registerDayjsLocale({ key: "de-at", localeName: "de-at" });
registerDayjsLocale({ key: "de-ch", localeName: "de-ch" });
registerDayjsLocale({ key: "el", localeName: "el" });
registerDayjsLocale({ key: "en", localeName: "en" }, ["en-us"]);
registerDayjsLocale({ key: "en-gb", localeName: "en-gb" });
registerDayjsLocale({ key: "es", localeName: "es" }, ["es-es", "es-419"]);
registerDayjsLocale({ key: "es-us", localeName: "es-us" });
registerDayjsLocale({ key: "et", localeName: "et" });
registerDayjsLocale({ key: "fi", localeName: "fi" });
registerDayjsLocale({ key: "fr", localeName: "fr" });
registerDayjsLocale({ key: "fr-ca", localeName: "fr-ca" });
registerDayjsLocale({ key: "fr-ch", localeName: "fr-ch" });
registerDayjsLocale({ key: "he", localeName: "he" });
registerDayjsLocale({ key: "hu", localeName: "hu" });
registerDayjsLocale({ key: "id", localeName: "id" });
registerDayjsLocale({ key: "it", localeName: "it" });
registerDayjsLocale({ key: "ja", localeName: "ja" });
registerDayjsLocale({ key: "ko", localeName: "ko" });
registerDayjsLocale({ key: "lt", localeName: "lt" });
registerDayjsLocale({ key: "lv", localeName: "lv" });
registerDayjsLocale({ key: "nb", localeName: "nb" }, ["no", "no-no", "nb-no"]);
registerDayjsLocale({ key: "nl", localeName: "nl" });
registerDayjsLocale({ key: "pl", localeName: "pl" });
registerDayjsLocale({ key: "pt", localeName: "pt" }, ["pt-pt"]);
registerDayjsLocale({ key: "pt-br", localeName: "pt-br" });
registerDayjsLocale({ key: "ro", localeName: "ro" });
registerDayjsLocale({ key: "ru", localeName: "ru" });
registerDayjsLocale({ key: "sk", localeName: "sk" });
registerDayjsLocale({ key: "sl", localeName: "sl" });
registerDayjsLocale({ key: "sv", localeName: "sv" });
registerDayjsLocale({ key: "th", localeName: "th" });
registerDayjsLocale({ key: "tr", localeName: "tr" });
registerDayjsLocale({ key: "uk", localeName: "uk" });
registerDayjsLocale({ key: "vi", localeName: "vi" });
registerDayjsLocale({ key: "zh-cn", localeName: "zh-cn" }, ["zh", "zh-hans", "zh-cn"]);
registerDayjsLocale({ key: "zh-tw", localeName: "zh-tw" }, ["zh-hant", "zh-hk"]);

export function resolvePhiDayjsLocale(locale: string | null | undefined): PhiDayjsLocaleResolution {
  const normalized = normalizeLocaleKey(locale);
  if (!normalized) {
    return { key: "en", localeName: "en" };
  }

  const exact = PHI_DAYJS_LOCALE_RESOLUTIONS.get(normalized);
  if (exact) {
    return exact;
  }

  const base = normalized.split("-")[0];
  return PHI_DAYJS_LOCALE_RESOLUTIONS.get(base) ?? { key: "en", localeName: "en" };
}

export function PhiDayjsLocale({ locale, children }: { locale?: string | null; children: ReactNode }) {
  useEffect(() => {
    let active = true;

    async function applyLocale() {
      const resolved = resolvePhiDayjsLocale(locale);
      const loader = PHI_DAYJS_LOCALE_LOADERS[resolved.key] ?? PHI_DAYJS_LOCALE_LOADERS.en;
      await loader();
      if (active) {
        dayjs.locale(resolved.localeName);
      }
    }

    void applyLocale();

    return () => {
      active = false;
    };
  }, [locale]);

  return children;
}
