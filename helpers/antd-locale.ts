import type { Locale } from "antd/es/locale";

type AntdLocaleModule = {
  default: Locale;
};

type PhiAntdLocaleKey =
  | "ar_EG"
  | "bg_BG"
  | "cs_CZ"
  | "da_DK"
  | "de_DE"
  | "el_GR"
  | "en_GB"
  | "en_US"
  | "es_ES"
  | "es_US"
  | "et_EE"
  | "fi_FI"
  | "fr_FR"
  | "he_IL"
  | "hu_HU"
  | "id_ID"
  | "it_IT"
  | "ja_JP"
  | "ko_KR"
  | "lt_LT"
  | "lv_LV"
  | "nb_NO"
  | "nl_NL"
  | "pl_PL"
  | "pt_BR"
  | "pt_PT"
  | "ro_RO"
  | "ru_RU"
  | "sk_SK"
  | "sl_SI"
  | "sv_SE"
  | "th_TH"
  | "tr_TR"
  | "uk_UA"
  | "vi_VN"
  | "zh_CN"
  | "zh_TW";

function normalizeLocaleKey(input: string | null | undefined) {
  return input?.trim().replace(/_/g, "-").toLowerCase() ?? "";
}

const PHI_ANTD_LOCALE_KEY_BY_LOCALE = new Map<string, PhiAntdLocaleKey>();

function registerAntdLocaleKey(key: PhiAntdLocaleKey, locales: readonly string[]) {
  for (const locale of locales) {
    const normalized = normalizeLocaleKey(locale);
    if (normalized) {
      PHI_ANTD_LOCALE_KEY_BY_LOCALE.set(normalized, key);
    }
  }
}

registerAntdLocaleKey("ar_EG", ["ar"]);
registerAntdLocaleKey("bg_BG", ["bg"]);
registerAntdLocaleKey("cs_CZ", ["cs"]);
registerAntdLocaleKey("da_DK", ["da"]);
registerAntdLocaleKey("de_DE", ["de", "de-de", "de-at", "de-ch"]);
registerAntdLocaleKey("el_GR", ["el"]);
registerAntdLocaleKey("en_GB", ["en", "en-gb"]);
registerAntdLocaleKey("en_US", ["en-us"]);
registerAntdLocaleKey("es_ES", ["es", "es-es"]);
registerAntdLocaleKey("es_US", ["es-419"]);
registerAntdLocaleKey("et_EE", ["et"]);
registerAntdLocaleKey("fi_FI", ["fi"]);
registerAntdLocaleKey("fr_FR", ["fr", "fr-fr", "fr-ch", "fr-be", "fr-ca"]);
registerAntdLocaleKey("he_IL", ["he", "he-il"]);
registerAntdLocaleKey("hu_HU", ["hu"]);
registerAntdLocaleKey("id_ID", ["id"]);
registerAntdLocaleKey("it_IT", ["it"]);
registerAntdLocaleKey("ja_JP", ["ja", "ja-jp"]);
registerAntdLocaleKey("ko_KR", ["ko", "ko-kr"]);
registerAntdLocaleKey("lt_LT", ["lt"]);
registerAntdLocaleKey("lv_LV", ["lv"]);
registerAntdLocaleKey("nb_NO", ["nb", "no", "nb-no", "no-no"]);
registerAntdLocaleKey("nl_NL", ["nl"]);
registerAntdLocaleKey("pl_PL", ["pl"]);
registerAntdLocaleKey("pt_BR", ["pt-br"]);
registerAntdLocaleKey("pt_PT", ["pt", "pt-pt"]);
registerAntdLocaleKey("ro_RO", ["ro"]);
registerAntdLocaleKey("ru_RU", ["ru"]);
registerAntdLocaleKey("sk_SK", ["sk"]);
registerAntdLocaleKey("sl_SI", ["sl"]);
registerAntdLocaleKey("sv_SE", ["sv"]);
registerAntdLocaleKey("th_TH", ["th"]);
registerAntdLocaleKey("tr_TR", ["tr"]);
registerAntdLocaleKey("uk_UA", ["uk"]);
registerAntdLocaleKey("vi_VN", ["vi"]);
registerAntdLocaleKey("zh_CN", ["zh", "zh-hans", "zh-cn"]);
registerAntdLocaleKey("zh_TW", ["zh-hant", "zh-tw", "zh-hk"]);

const PHI_ANTD_LOCALE_LOADERS: Record<PhiAntdLocaleKey, () => Promise<AntdLocaleModule>> = {
  ar_EG: () => import("antd/locale/ar_EG"),
  bg_BG: () => import("antd/locale/bg_BG"),
  cs_CZ: () => import("antd/locale/cs_CZ"),
  da_DK: () => import("antd/locale/da_DK"),
  de_DE: () => import("antd/locale/de_DE"),
  el_GR: () => import("antd/locale/el_GR"),
  en_GB: () => import("antd/locale/en_GB"),
  en_US: () => import("antd/locale/en_US"),
  es_ES: () => import("antd/locale/es_ES"),
  es_US: () => import("antd/locale/es_US"),
  et_EE: () => import("antd/locale/et_EE"),
  fi_FI: () => import("antd/locale/fi_FI"),
  fr_FR: () => import("antd/locale/fr_FR"),
  he_IL: () => import("antd/locale/he_IL"),
  hu_HU: () => import("antd/locale/hu_HU"),
  id_ID: () => import("antd/locale/id_ID"),
  it_IT: () => import("antd/locale/it_IT"),
  ja_JP: () => import("antd/locale/ja_JP"),
  ko_KR: () => import("antd/locale/ko_KR"),
  lt_LT: () => import("antd/locale/lt_LT"),
  lv_LV: () => import("antd/locale/lv_LV"),
  nb_NO: () => import("antd/locale/nb_NO"),
  nl_NL: () => import("antd/locale/nl_NL"),
  pl_PL: () => import("antd/locale/pl_PL"),
  pt_BR: () => import("antd/locale/pt_BR"),
  pt_PT: () => import("antd/locale/pt_PT"),
  ro_RO: () => import("antd/locale/ro_RO"),
  ru_RU: () => import("antd/locale/ru_RU"),
  sk_SK: () => import("antd/locale/sk_SK"),
  sl_SI: () => import("antd/locale/sl_SI"),
  sv_SE: () => import("antd/locale/sv_SE"),
  th_TH: () => import("antd/locale/th_TH"),
  tr_TR: () => import("antd/locale/tr_TR"),
  uk_UA: () => import("antd/locale/uk_UA"),
  vi_VN: () => import("antd/locale/vi_VN"),
  zh_CN: () => import("antd/locale/zh_CN"),
  zh_TW: () => import("antd/locale/zh_TW"),
};

export function resolvePhiAntdLocaleKey(locale: string | null | undefined): PhiAntdLocaleKey {
  const normalized = normalizeLocaleKey(locale);
  return PHI_ANTD_LOCALE_KEY_BY_LOCALE.get(normalized) ?? "en_GB";
}

export async function loadPhiAntdLocale(locale: string | null | undefined): Promise<Locale> {
  const key = resolvePhiAntdLocaleKey(locale);
  const loader = PHI_ANTD_LOCALE_LOADERS[key] ?? PHI_ANTD_LOCALE_LOADERS.en_GB;
  const localeModule = await loader();
  return localeModule.default;
}
