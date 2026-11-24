export type PhiTranslationParamValue = string | number;

export type PhiTranslationParams =
  | Record<string, PhiTranslationParamValue>
  | PhiTranslationParamValue[]
  | PhiTranslationParamValue
  | 0
  | undefined;

/** `%1`, `%2`, … (one-based) and `{0}`, `{1}`, … (zero-based) name a position; `{key}` names a key. */
const INDEXED_TOKEN_PATTERN = /%(\d+)|\{(\d+)\}/g;
const NAMED_TOKEN_PATTERN = /\{([^{}]+)\}/g;

/**
 * Read in one pass rather than token by token, as `resolvePhiTextPlaceholders` reads: `%1` is the start
 * of `%10`, so replacing one token after another ate the tenth value's token with the first's, and a
 * value that itself contained `%2` was replaced again by the next step. A token nothing answers stays
 * as it is.
 */
export function formatPhiTranslation(input: string, params: PhiTranslationParams = 0) {
  if (!params) {
    return input;
  }

  const text = String(input);

  if (Array.isArray(params)) {
    return text.replace(INDEXED_TOKEN_PATTERN, (token, position: string | undefined, index: string | undefined) => {
      const at = position !== undefined ? Number(position) - 1 : Number(index);
      return at >= 0 && at < params.length ? String(params[at]) : token;
    });
  }

  if (typeof params === "object") {
    return text.replace(NAMED_TOKEN_PATTERN, (token, key: string) =>
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : token,
    );
  }

  return text.replace(INDEXED_TOKEN_PATTERN, (token, position: string | undefined, index: string | undefined) =>
    position === "1" || index === "0" ? String(params) : token,
  );
}

/** A plural category as CLDR names it and `Intl.PluralRules` answers it. */
export type PhiPluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * A text that says a count, one template per plural category (TRANSLATIONS.md, "Count labels").
 *
 * `other` is required and is what every category the label does not state reads. The source language is
 * English, which states `one` and `other`; a locale with more categories -- Polish `few` and `many`, Arabic
 * `zero` and `two` -- reads `other` for those until a label states them. Every template carries the count
 * as `%1`, the `one` template too: `one` is not the number 1 everywhere (French reads 0 as `one`, Russian
 * 21), so "1 page" written out would be wrong in the very locales the category exists for.
 */
export type PhiCountLabel = { readonly [C in Exclude<PhiPluralCategory, "other">]?: string } & {
  readonly other: string;
};

/** The categories in CLDR order, the order a count label's templates are read and translated in. */
export const PHI_PLURAL_CATEGORIES: readonly PhiPluralCategory[] = ["zero", "one", "two", "few", "many", "other"];

const pluralRulesByLocale = new Map<string, Intl.PluralRules>();
const countFormatByLocale = new Map<string, Intl.NumberFormat>();

function readPluralRules(locale: string) {
  let rules = pluralRulesByLocale.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesByLocale.set(locale, rules);
  }
  return rules;
}

function readCountFormat(locale: string) {
  let format = countFormatByLocale.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale);
    countFormatByLocale.set(locale, format);
  }
  return format;
}

/**
 * The count in words: the template of the category `count` falls in for `locale`, with the count as `%1`,
 * written as `locale` writes numbers. `locale` is the reader's -- the page's Intl locale
 * (`usePhiIntlLocale()` in a Client, the request locale on the server) -- never the browser's, so the
 * server's render and the hydrated page say the same words. A Provider answers the scalar count; which
 * words it takes is decided here and nowhere else.
 */
export function formatPhiCountLabel(label: PhiCountLabel, count: number, locale: string): string {
  const template = label[readPluralRules(locale).select(count)] ?? label.other;
  return formatPhiTranslation(template, [readCountFormat(locale).format(count)]);
}
