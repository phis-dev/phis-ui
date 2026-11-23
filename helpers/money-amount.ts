import { PHIS_PAYMENT_CURRENCY_EXPONENTS, phisMinorToMajorAmount, type PhisPaymentMoney } from "@phis/contracts/payments";

/*
 * An amount of money as the contract keeps it and as a person reads it.
 *
 * The contract keeps minor units as a canonical integer string (`PhisPaymentMoney.minor`: `"1990"` for
 * 19.90 francs), and a person reads major units written the way their language writes numbers. Between
 * the two lies a power of ten that is the currency's (`PHIS_PAYMENT_CURRENCY_EXPONENTS`: two for the
 * franc, none for the yen, three for the dinar) -- never a fixed hundred.
 *
 * Every conversion here is done on the digits. `12.35 * 100` is `1234.9999999999998` in a float, and a
 * price rounded down by one Rappen on every save is not a rounding error anybody notices until the
 * books do not add up. So a major amount is split at its point, the fraction padded to the exponent,
 * and the digits joined; nothing is multiplied. The way back, and showing an amount as money, are the
 * contract's (`phisMinorToMajorAmount`, `formatPhisMoney` in `@phis/contracts/payments`), so that a
 * Table, a record and a shop write the same amount the same way.
 */

/** A minor amount as phis-server accepts one (`requirePhisPaymentMinor`): no sign, no leading zero, 16 digits at most. */
const PHI_MINOR_AMOUNT_PATTERN = /^(0|[1-9][0-9]{0,15})$/u;

/** The largest minor amount the contract carries. */
export const PHI_MINOR_AMOUNT_MAX = "9999999999999999";

const PHI_MAJOR_AMOUNT_PATTERN = /^([0-9]*)(?:\.([0-9]*))?$/u;

/** The currency's exponent, or `undefined` for a code that is not an ISO 4217 currency a payment accepts. */
export function readPhiCurrencyExponent(currency: string): number | undefined {
  return Object.hasOwn(PHIS_PAYMENT_CURRENCY_EXPONENTS, currency) ? PHIS_PAYMENT_CURRENCY_EXPONENTS[currency] : undefined;
}

export function isPhiMinorAmount(value: unknown): value is string {
  return typeof value === "string" && PHI_MINOR_AMOUNT_PATTERN.test(value);
}

/**
 * A value a Provider handed over as an amount of money, or `null` where it is none: `{ currency, minor }`
 * with a currency a payment accepts and `minor` as the contract writes it or as a safe non-negative
 * integer, which is how a row out of JSON often carries it. The answer is always the contract's shape.
 */
export function readPhiMoneyValue(value: unknown): PhisPaymentMoney | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { currency, minor } = value as Record<string, unknown>;
  if (typeof currency !== "string" || readPhiCurrencyExponent(currency) === undefined) return null;
  const text = typeof minor === "number" && Number.isSafeInteger(minor) && minor >= 0 ? String(minor) : minor;
  return isPhiMinorAmount(text) ? { currency, minor: text } : null;
}

/**
 * The amounts a value handed over as money holds, in its order, or `null` where it is none: one amount as
 * `readPhiMoneyValue` reads it, or a price list as the `money` Form field holds one -- minor units per
 * currency code (`{ CHF: "1990", GBP: "1590" }`), each a currency a payment accepts. A list with no entry,
 * or with one entry that is not an amount, is none: half a price list drawn would read as the whole.
 */
export function readPhiMoneyValues(value: unknown): readonly PhisPaymentMoney[] | null {
  const one = readPhiMoneyValue(value);
  if (one) return [one];
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const amounts = Object.entries(value).map(([currency, minor]) => readPhiMoneyValue({ currency, minor }));
  return amounts.length > 0 && amounts.every((amount) => amount !== null) ? amounts as PhisPaymentMoney[] : null;
}

/** `-1`, `0` or `1` as `left` is less than, equal to or more than `right`; both minor amounts. */
export function comparePhiMinorAmounts(left: string, right: string): number {
  const difference = BigInt(left) - BigInt(right);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

/**
 * A major amount written with a point (`"19.9"`, `"19."`, `".5"`) as the minor amount it states, or
 * `null` where it states none or one the contract cannot carry.
 *
 * A fraction longer than the currency has is rounded half up on its digits, the way the Control rounds
 * it when the field is left: `"12.345"` francs are `"1235"` Rappen.
 */
export function phiMajorToMinorAmount(major: string, exponent: number): string | null {
  const match = PHI_MAJOR_AMOUNT_PATTERN.exec(major.trim());
  if (!match) return null;
  const whole = match[1] ?? "";
  const fraction = match[2] ?? "";
  if (whole === "" && fraction === "") return null;
  const kept = fraction.slice(0, exponent).padEnd(exponent, "0");
  const roundsUp = fraction.length > exponent && fraction.charCodeAt(exponent) >= "5".charCodeAt(0);
  const minor = (BigInt(`${whole}${kept}` || "0") + (roundsUp ? 1n : 0n)).toString();
  return PHI_MINOR_AMOUNT_PATTERN.test(minor) ? minor : null;
}

type PhiAmountSymbols = { decimal: string; group: string };

const symbolsByLocale = new Map<string, PhiAmountSymbols>();

/** The locale's decimal and group separators, in Latin digits so that what is typed can be read back. */
function readPhiAmountSymbols(locale: string): PhiAmountSymbols {
  const cached = symbolsByLocale.get(locale);
  if (cached) return cached;
  const parts = new Intl.NumberFormat(locale, { numberingSystem: "latn" }).formatToParts(1234567.5);
  const symbols = {
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
    group: parts.find((part) => part.type === "group")?.value ?? "",
  };
  symbolsByLocale.set(locale, symbols);
  return symbols;
}

/**
 * A major amount (`"1234.5"`) written the way the locale writes it, with as many places as the currency
 * has: `1’234.50` in de-CH, `1.234,50` in de-DE, `1,234.50` in en.
 *
 * The whole part is formatted as a `bigint`, so no digit passes through a float; the fraction is the
 * amount's own digits behind the locale's separator. What is not a major amount is returned as it came.
 */
export function formatPhiMajorAmount(major: string, locale: string, exponent: number): string {
  const minor = phiMajorToMinorAmount(major, exponent);
  if (minor === null) return major;
  const [whole = "0", fraction = ""] = phisMinorToMajorAmount(minor, exponent).split(".");
  const formattedWhole = new Intl.NumberFormat(locale, { numberingSystem: "latn", maximumFractionDigits: 0 }).format(BigInt(whole));
  return exponent === 0 ? formattedWhole : `${formattedWhole}${readPhiAmountSymbols(locale).decimal}${fraction}`;
}

/**
 * What somebody typed, in the locale's way of writing numbers, as a major amount with a point.
 *
 * Group separators and spaces are dropped. The decimal separator is the locale's, and the point or the
 * comma is read as one too wherever the locale does not group with it: somebody in fr-CH who types
 * `12.50` means twelve and a half, while in de-DE `1.250` is one thousand two hundred and fifty, as it
 * would be written there. The result may still not be a number -- `"1.2.3"` -- and the Control then
 * keeps the last amount it could read.
 */
export function parsePhiLocaleAmount(text: string, locale: string): string {
  const { decimal, group } = readPhiAmountSymbols(locale);
  let result = "";
  for (const character of text) {
    if (character >= "0" && character <= "9") {
      result += character;
    } else if (character === decimal || ((character === "." || character === ",") && character !== group)) {
      result += ".";
    }
  }
  return result;
}

/**
 * Where the currency stands beside the number in the locale, and as what: its ISO code, which no
 * reader confuses with another currency's the way `$` is confused, and which nobody translates.
 */
export function resolvePhiCurrencyAffix(locale: string, currency: string): { placement: "prefix" | "suffix"; text: string } {
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code" }).formatToParts(1);
  const currencyIndex = parts.findIndex((part) => part.type === "currency");
  const numberIndex = parts.findIndex((part) => part.type === "integer");
  return {
    placement: currencyIndex !== -1 && numberIndex !== -1 && currencyIndex > numberIndex ? "suffix" : "prefix",
    text: parts[currencyIndex]?.value.trim() || currency,
  };
}
