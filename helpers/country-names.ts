import { PHI_ISO_3166_ALPHA2_CODES, type PhiCountryCode } from "../constants/countries";

export type PhiCountryOption = { value: PhiCountryCode; label: string };

/**
 * Every ISO 3166-1 country as an option named in the reader's language (`Intl.DisplayNames`, type
 * `region`), sorted as that language sorts. A code the runtime has no name for is shown as the code.
 * The locale is the page's (`usePhiIntlLocale`), never the browser's, so the server and the browser draw
 * the same list.
 */
export function listPhiCountryOptions(locale: string): PhiCountryOption[] {
  const names = new Intl.DisplayNames([locale], { type: "region", fallback: "code" });
  const collator = new Intl.Collator(locale);
  return PHI_ISO_3166_ALPHA2_CODES
    .map((code) => ({ value: code, label: names.of(code) ?? code }))
    .sort((left, right) => collator.compare(left.label, right.label));
}
