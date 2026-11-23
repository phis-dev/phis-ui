import type { PhisPaymentMoney } from "@phis/contracts/payments";

import { isPhiRecord } from "../../helpers/is-record";
import {
  comparePhiMinorAmounts,
  isPhiMinorAmount,
  PHI_MINOR_AMOUNT_MAX,
  readPhiCurrencyExponent,
} from "../../helpers/money-amount";
import { createPhiConfigReader, type PhiConfigReader } from "../widgets/config/strict-config-reader";

export { readPhiMoneyFieldCurrencyFieldKey } from "./money-field-currency-key";

/*
 * The `money` field: an amount in minor units, shown and typed in major units beside its currency.
 *
 * Two shapes, chosen by the config and never mixed:
 *
 * - `currency: "CHF"` -- one amount, whose value is the contract's money (`PhisPaymentMoney`,
 *   `{ currency: "CHF", minor: "1990" }`), so a handler that passes it on to a payment passes it as it
 *   came and one that stores it knows the currency without a second field;
 * - `currencies: ["CHF", "EUR"]` -- one amount per currency, whose value is a price list keyed by code
 *   (`{ CHF: "1990", EUR: "1850" }`), each entry converted by the same rules. A currency left empty is
 *   absent from the list; the list is not padded with zeros, because no price and a price of nothing are
 *   different answers.
 * - `currencyField: "currency"` -- one amount, as for `currency`, in the currency another field of the
 *   same Form holds: a destination's shipping in the destination's currency, a promotion's amount in
 *   its. Until that field names a currency there is nothing to type; when it names another, an amount
 *   entered for the old one is cleared, because it was never a price in the new one.
 * - neither, on a field with an `optionsProvider` -- the same price list, its currencies the values of
 *   the options the Provider answers, in its order: for a list the Form cannot know when it is written,
 *   such as the currencies a Shop's destinations name. A currency the value holds and the options no
 *   longer name is still shown after them, so a price nobody offers any more can be seen and cleared
 *   instead of being dropped on the next save.
 *
 * With nothing entered the field holds `null` in either shape, so the `required` rule means "an
 * amount" -- or, for a list, "at least one" -- as it does for every other field. Whether empty is
 * allowed is that rule, not a setting of its own.
 */

export type PhiMoneyFieldConfig = {
  /** The one currency of a single amount, or absent for a list. */
  currency?: string;
  /** The currencies of a list, in the order they are shown; absent for a single amount and for a list from the options. */
  currencies?: readonly string[];
  /** A price list whose currencies are the options' values: the field has an `optionsProvider` and neither of the two. */
  currenciesFromOptions?: true;
  /** The key of the Form field whose value is the one amount's currency, in place of `currency`. */
  currencyField?: string;
  /** The least and the most an amount may be, in minor units; every entry of a list is held to them. */
  min?: string;
  max?: string;
};

/** A price list as the field holds it: minor units per currency code. */
export type PhiMoneyFieldAmounts = Readonly<Record<string, string>>;

function readCurrency(reader: PhiConfigReader, key: string, value: unknown) {
  return typeof value === "string" && readPhiCurrencyExponent(value) !== undefined
    ? value
    : reader.fail(key, "an ISO 4217 currency code a payment accepts", value);
}

function readMinorBound(reader: PhiConfigReader, key: string) {
  const value = reader.integer(key);
  if (value === undefined) return undefined;
  const minor = String(value);
  return value >= 0 && isPhiMinorAmount(minor) ? minor : reader.fail(key, `a whole number of minor units from 0 to ${PHI_MINOR_AMOUNT_MAX}`);
}

/**
 * The field's config, read strictly (`strict-config-reader.ts`): a value present and wrong is a
 * `PhiConfigError` naming the field, never a default put in its place. `hasOptionsProvider` says whether
 * the field names an `optionsProvider`; with one, neither `currency` nor `currencies` may be set, because
 * a list given twice would leave open which one counts.
 */
export function readPhiMoneyFieldConfig(
  config: Readonly<Record<string, unknown>> | undefined,
  { hasOptionsProvider = false }: { hasOptionsProvider?: boolean } = {},
): PhiMoneyFieldConfig {
  const reader = createPhiConfigReader(config ?? {}, "config");
  const hasCurrency = reader.has("currency");
  const hasCurrencies = reader.has("currencies");
  const hasCurrencyField = reader.has("currencyField");
  const set = [hasCurrency, hasCurrencies, hasCurrencyField, hasOptionsProvider].filter(Boolean).length;
  if (set !== 1) {
    const key = hasOptionsProvider
      ? (hasCurrency ? "currency" : hasCurrencies ? "currencies" : "currencyField")
      : hasCurrencyField && (hasCurrency || hasCurrencies) ? "currencyField" : "currency";
    return reader.fail(
      key,
      "exactly one of `currency` (one amount), `currencyField` (one amount in the currency another field holds), `currencies` (one amount per currency) or an `optionsProvider` naming the currencies",
      config?.[key],
    );
  }
  const min = readMinorBound(reader, "min");
  const max = readMinorBound(reader, "max");
  if (min !== undefined && max !== undefined && comparePhiMinorAmounts(min, max) > 0) {
    reader.fail("max", `at least the minimum ${min}`);
  }
  const bounds = { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
  if (hasOptionsProvider) return { currenciesFromOptions: true, ...bounds };
  if (hasCurrencyField) {
    const currencyField = reader.string("currencyField");
    return currencyField ? { currencyField, ...bounds } : reader.fail("currencyField", "the key of another field of the Form", currencyField);
  }
  if (hasCurrency) {
    return { currency: readCurrency(reader, "currency", reader.string("currency")), ...bounds };
  }
  const currencies = reader.stringList("currencies") ?? [];
  if (currencies.length === 0) reader.fail("currencies", "at least one currency");
  currencies.forEach((currency, index) => readCurrency(reader, `currencies[${index}]`, currency));
  if (new Set(currencies).size !== currencies.length) reader.fail("currencies", "each currency once");
  return { currencies, ...bounds };
}

/**
 * The currencies of a list from the options: each option's value an ISO 4217 code a payment accepts, in
 * the Provider's order, then every currency the value holds that the options leave out. An option that
 * is not such a code throws -- the Provider answered something that is not a currency, and guessing past
 * it would show a price under the wrong name.
 */
export function readPhiMoneyFieldOptionCurrencies(
  options: readonly { value: unknown }[] | undefined,
  value: unknown,
): readonly string[] {
  const currencies: string[] = [];
  for (const option of options ?? []) {
    const code = option.value;
    if (typeof code !== "string" || readPhiCurrencyExponent(code) === undefined) {
      throw new Error(`A money field's options name ${describe(code)}; each option's value is an ISO 4217 currency code a payment accepts.`);
    }
    if (!currencies.includes(code)) currencies.push(code);
  }
  if (isPhiRecord(value)) {
    for (const code of Object.keys(value)) {
      if (!currencies.includes(code) && readPhiCurrencyExponent(code) !== undefined) currencies.push(code);
    }
  }
  return currencies;
}

/**
 * The currency a `currencyField` amount is in: the other field's value, `null` while it names none. A
 * value that is a code a payment does not accept throws, as a config naming one does.
 */
export function readPhiMoneyFieldLinkedCurrency(currencyField: string, values: Readonly<Record<string, unknown>> | null | undefined): string | null {
  const code = values?.[currencyField];
  if (code === undefined || code === null || code === "") return null;
  if (typeof code === "string" && readPhiCurrencyExponent(code) !== undefined) return code;
  throw new Error(`A money field takes its currency from "${currencyField}", which holds ${describe(code)}; it holds an ISO 4217 currency code a payment accepts.`);
}

function describe(value: unknown) {
  return JSON.stringify(value) ?? String(value);
}

/**
 * The value a single-amount field was given, or `null` for none. Anything else -- another currency, an
 * amount that is not a canonical minor string -- is a record that does not fit the Form, and saying so
 * is the only answer that does not overwrite it with nothing on the next save.
 */
export function readPhiMoneyFieldAmount(value: unknown, currency: string): PhisPaymentMoney | null {
  if (value === undefined || value === null) return null;
  if (isPhiRecord(value) && value.currency === currency && isPhiMinorAmount(value.minor)) {
    return { currency, minor: value.minor };
  }
  throw new Error(`A money field in ${currency} was given ${describe(value)}; it holds { currency: "${currency}", minor: "<digits>" } or null.`);
}

/** The value a price-list field was given, or `null` for none; the same refusal for a value that does not fit. */
export function readPhiMoneyFieldAmounts(value: unknown, currencies: readonly string[]): PhiMoneyFieldAmounts | null {
  if (value === undefined || value === null) return null;
  if (isPhiRecord(value) && Object.entries(value).every(([currency, minor]) => currencies.includes(currency) && isPhiMinorAmount(minor))) {
    return Object.keys(value).length === 0 ? null : value as PhiMoneyFieldAmounts;
  }
  throw new Error(`A money field in ${currencies.join(", ")} was given ${describe(value)}; it holds minor units per currency or null.`);
}

/** A list with one entry changed: an empty one is removed, and a list left with none is `null`. */
export function updatePhiMoneyFieldAmounts(
  amounts: PhiMoneyFieldAmounts | null,
  currencies: readonly string[],
  currency: string,
  minor: string | null,
): PhiMoneyFieldAmounts | null {
  const next: Record<string, string> = {};
  for (const entry of currencies) {
    const amount = entry === currency ? minor : amounts?.[entry];
    if (amount != null) next[entry] = amount;
  }
  return Object.keys(next).length === 0 ? null : next;
}
