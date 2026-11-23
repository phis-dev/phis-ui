import { describe, expect, it } from "vitest";

import { isPhiConfigError } from "../widgets/config/strict-config-reader";
import {
  readPhiMoneyFieldAmount,
  readPhiMoneyFieldAmounts,
  readPhiMoneyFieldConfig,
  readPhiMoneyFieldCurrencyFieldKey,
  readPhiMoneyFieldLinkedCurrency,
  readPhiMoneyFieldOptionCurrencies,
  updatePhiMoneyFieldAmounts,
} from "./money-field";

function configError(config: Record<string, unknown> | undefined) {
  try {
    readPhiMoneyFieldConfig(config);
  } catch (error) {
    return isPhiConfigError(error) ? error.path : `not a config error: ${String(error)}`;
  }
  return "read without an error";
}

describe("the money field's config", () => {
  it("reads one currency or a list, with bounds in minor units as text", () => {
    expect(readPhiMoneyFieldConfig({ currency: "CHF", min: 0, max: 2_000_000 })).toEqual({ currency: "CHF", min: "0", max: "2000000" });
    expect(readPhiMoneyFieldConfig({ currencies: ["CHF", "EUR"] })).toEqual({ currencies: ["CHF", "EUR"] });
  });

  it("refuses a config it cannot read, naming the field", () => {
    expect(configError(undefined)).toBe("config.currency");
    expect(configError({ currency: "CHF", currencies: ["EUR"] })).toBe("config.currency");
    expect(configError({ currency: "chf" })).toBe("config.currency");
    expect(configError({ currency: 756 })).toBe("config.currency");
    expect(configError({ currencies: [] })).toBe("config.currencies");
    expect(configError({ currencies: ["CHF", "XYZ"] })).toBe("config.currencies[1]");
    expect(configError({ currencies: ["CHF", "CHF"] })).toBe("config.currencies");
    expect(configError({ currency: "CHF", min: 1.5 })).toBe("config.min");
    expect(configError({ currency: "CHF", min: -1 })).toBe("config.min");
    expect(configError({ currency: "CHF", min: "100" })).toBe("config.min");
    expect(configError({ currency: "CHF", min: 500, max: 100 })).toBe("config.max");
  });
});

describe("one amount in the currency another field holds", () => {
  it("reads currencyField alone, and refuses it beside any other source of the currency", () => {
    expect(readPhiMoneyFieldConfig({ currencyField: "currency", min: 0 })).toEqual({ currencyField: "currency", min: "0" });
    // An empty key is absent, as every empty text in a config is: then no currency is named at all.
    expect(configError({ currencyField: "" })).toBe("config.currency");
    expect(configError({ currencyField: 3 })).toBe("config.currencyField");
    expect(configError({ currencyField: "currency", currency: "CHF" })).toBe("config.currencyField");
    expect(configError({ currencyField: "currency", currencies: ["CHF"] })).toBe("config.currencyField");
    expect(() => readPhiMoneyFieldConfig({ currencyField: "currency" }, { hasOptionsProvider: true })).toThrow(/optionsProvider/);
  });

  it("is in the other field's currency, none while it names none, and throws for one a payment does not accept", () => {
    expect(readPhiMoneyFieldLinkedCurrency("currency", { currency: "GBP" })).toBe("GBP");
    expect(readPhiMoneyFieldLinkedCurrency("currency", { currency: "" })).toBeNull();
    expect(readPhiMoneyFieldLinkedCurrency("currency", {})).toBeNull();
    expect(readPhiMoneyFieldLinkedCurrency("currency", null)).toBeNull();
    expect(() => readPhiMoneyFieldLinkedCurrency("currency", { currency: "gbp" })).toThrow(/ISO 4217/);
  });

  it("names the field the Form watches for it, and none for a field with a currency of its own", () => {
    expect(readPhiMoneyFieldCurrencyFieldKey({ currencyField: "currency" })).toBe("currency");
    expect(readPhiMoneyFieldCurrencyFieldKey({ currency: "CHF" })).toBeNull();
    expect(readPhiMoneyFieldCurrencyFieldKey(undefined)).toBeNull();
  });
});

describe("a price list whose currencies come from the field's options", () => {
  it("reads neither currency nor currencies on a field with an optionsProvider, and refuses either", () => {
    expect(readPhiMoneyFieldConfig({ min: 0 }, { hasOptionsProvider: true })).toEqual({ currenciesFromOptions: true, min: "0" });
    expect(readPhiMoneyFieldConfig(undefined, { hasOptionsProvider: true })).toEqual({ currenciesFromOptions: true });
    expect(() => readPhiMoneyFieldConfig({ currency: "CHF" }, { hasOptionsProvider: true })).toThrow(/optionsProvider/);
    expect(() => readPhiMoneyFieldConfig({ currencies: ["CHF"] }, { hasOptionsProvider: true })).toThrow(/optionsProvider/);
  });

  it("lists the options' currencies in their order, then those only the value still holds", () => {
    const options = [{ value: "GBP" }, { value: "CHF" }, { value: "GBP" }];
    expect(readPhiMoneyFieldOptionCurrencies(options, null)).toEqual(["GBP", "CHF"]);
    expect(readPhiMoneyFieldOptionCurrencies(options, { EUR: "900", CHF: "900" })).toEqual(["GBP", "CHF", "EUR"]);
    expect(readPhiMoneyFieldOptionCurrencies(undefined, { EUR: "900" })).toEqual(["EUR"]);
    expect(readPhiMoneyFieldOptionCurrencies([], null)).toEqual([]);
  });

  it("refuses an option that is not a currency a payment accepts", () => {
    expect(() => readPhiMoneyFieldOptionCurrencies([{ value: "chf" }], null)).toThrow(/ISO 4217/);
    expect(() => readPhiMoneyFieldOptionCurrencies([{ value: 756 }], null)).toThrow(/ISO 4217/);
  });
});

describe("the money field's value", () => {
  it("is the contract's money for one currency, or null", () => {
    expect(readPhiMoneyFieldAmount({ currency: "CHF", minor: "1990" }, "CHF")).toEqual({ currency: "CHF", minor: "1990" });
    expect(readPhiMoneyFieldAmount(null, "CHF")).toBeNull();
    expect(readPhiMoneyFieldAmount(undefined, "CHF")).toBeNull();
  });

  it("refuses a value that does not fit rather than overwriting it with nothing", () => {
    expect(() => readPhiMoneyFieldAmount({ currency: "EUR", minor: "1990" }, "CHF")).toThrow(/CHF/);
    expect(() => readPhiMoneyFieldAmount({ currency: "CHF", minor: 1990 }, "CHF")).toThrow();
    expect(() => readPhiMoneyFieldAmount(19.9, "CHF")).toThrow();
    expect(() => readPhiMoneyFieldAmounts({ CHF: "1990", USD: "100" }, ["CHF", "EUR"])).toThrow();
    expect(() => readPhiMoneyFieldAmounts({ CHF: "01" }, ["CHF"])).toThrow();
  });

  it("is a price list for several, holding only the currencies with an amount", () => {
    expect(readPhiMoneyFieldAmounts({ CHF: "1990" }, ["CHF", "EUR"])).toEqual({ CHF: "1990" });
    expect(readPhiMoneyFieldAmounts({}, ["CHF", "EUR"])).toBeNull();
    expect(updatePhiMoneyFieldAmounts({ CHF: "1990" }, ["CHF", "EUR"], "EUR", "1850")).toEqual({ CHF: "1990", EUR: "1850" });
    expect(updatePhiMoneyFieldAmounts({ CHF: "1990", EUR: "1850" }, ["CHF", "EUR"], "CHF", null)).toEqual({ EUR: "1850" });
    // With none left the field holds no value, so `required` means "at least one amount".
    expect(updatePhiMoneyFieldAmounts({ CHF: "1990" }, ["CHF", "EUR"], "CHF", null)).toBeNull();
    expect(updatePhiMoneyFieldAmounts(null, ["CHF", "EUR"], "CHF", "0")).toEqual({ CHF: "0" });
  });
});
