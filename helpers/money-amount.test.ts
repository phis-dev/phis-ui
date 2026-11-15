import { describe, expect, it } from "vitest";

import {
  comparePhiMinorAmounts,
  formatPhiMajorAmount,
  parsePhiLocaleAmount,
  phiMajorToMinorAmount,
  readPhiCurrencyExponent,
  readPhiMoneyValue,
  resolvePhiCurrencyAffix,
} from "./money-amount";
import { formatPhisMoney, phisMinorToMajorAmount } from "@phis/contracts/payments";

describe("money amounts", () => {
  it("knows each currency's exponent from the payment contract, not a fixed hundred", () => {
    expect(readPhiCurrencyExponent("CHF")).toBe(2);
    expect(readPhiCurrencyExponent("JPY")).toBe(0);
    expect(readPhiCurrencyExponent("BHD")).toBe(3);
    expect(readPhiCurrencyExponent("XYZ")).toBeUndefined();
    expect(readPhiCurrencyExponent("toString")).toBeUndefined();
  });

  it("turns minor units into major ones on the digits", () => {
    expect(phisMinorToMajorAmount("1990", 2)).toBe("19.90");
    expect(phisMinorToMajorAmount("5", 2)).toBe("0.05");
    expect(phisMinorToMajorAmount("0", 2)).toBe("0.00");
    expect(phisMinorToMajorAmount("1990", 0)).toBe("1990");
    expect(phisMinorToMajorAmount("12345", 3)).toBe("12.345");
  });

  it("turns major units into minor ones without a float in between", () => {
    // 12.35 * 100 is 1234.9999999999998 in a float.
    expect(phiMajorToMinorAmount("12.35", 2)).toBe("1235");
    expect(phiMajorToMinorAmount("0.07", 2)).toBe("7");
    expect(phiMajorToMinorAmount("19.9", 2)).toBe("1990");
    expect(phiMajorToMinorAmount("19.", 2)).toBe("1900");
    expect(phiMajorToMinorAmount(".5", 2)).toBe("50");
    expect(phiMajorToMinorAmount("007", 2)).toBe("700");
    expect(phiMajorToMinorAmount("1990", 0)).toBe("1990");
    expect(phiMajorToMinorAmount("90071992547409.93", 2)).toBe("9007199254740993");
  });

  it("rounds a longer fraction half up, as the Control does when the field is left", () => {
    expect(phiMajorToMinorAmount("12.345", 2)).toBe("1235");
    expect(phiMajorToMinorAmount("12.344", 2)).toBe("1234");
    expect(phiMajorToMinorAmount("0.5", 0)).toBe("1");
  });

  it("reads no amount from what states none or one the contract cannot carry", () => {
    for (const text of ["", ".", "-1", "1e3", "1.2.3", "abc", "99999999999999999"]) {
      expect(phiMajorToMinorAmount(text, 2)).toBeNull();
    }
  });

  it("compares minor amounts beyond a float's integers", () => {
    expect(comparePhiMinorAmounts("9007199254740993", "9007199254740992")).toBe(1);
    expect(comparePhiMinorAmounts("5", "5")).toBe(0);
    expect(comparePhiMinorAmounts("5", "50")).toBe(-1);
  });

  it("writes the number the way the locale does, with the currency's places", () => {
    expect(formatPhiMajorAmount("1234.5", "en", 2)).toBe("1,234.50");
    expect(formatPhiMajorAmount("1234.5", "de-DE", 2)).toBe("1.234,50");
    // The Swiss group mark differs between ICU versions (’ or '); it is the locale's, whichever.
    expect(formatPhiMajorAmount("1234.5", "de-CH", 2)).toBe(new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2 }).format(1234.5));
    expect(formatPhiMajorAmount("1234", "en", 0)).toBe("1,234");
    expect(formatPhiMajorAmount("90071992547409.93", "en", 2)).toBe("90,071,992,547,409.93");
    expect(formatPhiMajorAmount("x", "en", 2)).toBe("x");
  });

  it("reads back what was typed in the locale's way", () => {
    expect(parsePhiLocaleAmount("1,234.50", "en")).toBe("1234.50");
    expect(parsePhiLocaleAmount("1.234,50", "de-DE")).toBe("1234.50");
    expect(parsePhiLocaleAmount("1’234.50", "de-CH")).toBe("1234.50");
    expect(parsePhiLocaleAmount("1'234.50", "de-CH")).toBe("1234.50");
    // A point where the locale does not group with one is a decimal point.
    expect(parsePhiLocaleAmount("12.50", "fr-CH")).toBe("12.50");
    expect(parsePhiLocaleAmount("12,50", "fr-CH")).toBe("12.50");
    expect(parsePhiLocaleAmount(formatPhiMajorAmount("1234.5", "fr-CH", 2), "fr-CH")).toBe("1234.50");
  });

  it("puts the currency's code where the locale puts the currency", () => {
    expect(resolvePhiCurrencyAffix("en", "CHF")).toEqual({ placement: "prefix", text: "CHF" });
    expect(resolvePhiCurrencyAffix("de-DE", "EUR")).toEqual({ placement: "suffix", text: "EUR" });
  });

  /*
   * `formatPhisMoney` is the contract's (`@phis/contracts/payments`, which has no test runner of its
   * own); it is tested here, beside the conversions it shares its digits with.
   */
  it("shows money with the currency's own number of places, as the locale writes it", () => {
    const expected = (locale: string, currency: string, amount: number, places: number) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: places, maximumFractionDigits: places }).format(amount);
    expect(formatPhisMoney({ currency: "CHF", minor: "1990" }, "de-CH")).toBe(expected("de-CH", "CHF", 19.9, 2));
    expect(formatPhisMoney({ currency: "EUR", minor: "1850" }, "de-DE")).toBe(expected("de-DE", "EUR", 18.5, 2));
    expect(formatPhisMoney({ currency: "USD", minor: "5" }, "en-US")).toBe("$0.05");
    expect(formatPhisMoney({ currency: "JPY", minor: "1990" }, "en-US")).toBe("¥1,990");
    expect(formatPhisMoney({ currency: "BHD", minor: "12345" }, "en-US")).toBe(expected("en-US", "BHD", 12.345, 3));
  });

  it("shows the largest amount the contract carries without a float's drift", () => {
    expect(formatPhisMoney({ currency: "USD", minor: "9999999999999999" }, "en-US")).toBe("$99,999,999,999,999.99");
    expect(formatPhisMoney({ currency: "USD", minor: "9007199254740993" }, "en-US")).toBe("$90,071,992,547,409.93");
  });

  it("reads a Provider's amount as the contract's money, minor as text or as a safe integer", () => {
    expect(readPhiMoneyValue({ currency: "CHF", minor: "1990" })).toEqual({ currency: "CHF", minor: "1990" });
    expect(readPhiMoneyValue({ currency: "CHF", minor: 1990 })).toEqual({ currency: "CHF", minor: "1990" });
    expect(readPhiMoneyValue({ currency: "CHF", minor: 19.9 })).toBeNull();
    expect(readPhiMoneyValue({ currency: "CHF", minor: -1 })).toBeNull();
    expect(readPhiMoneyValue({ currency: "CHF", minor: 2 ** 53 })).toBeNull();
    expect(readPhiMoneyValue({ currency: "XYZ", minor: "1990" })).toBeNull();
    expect(readPhiMoneyValue({ CHF: "1990" })).toBeNull();
    expect(readPhiMoneyValue("CHF 19.90")).toBeNull();
  });

  it("refuses what is not a payment's money", () => {
    expect(() => formatPhisMoney({ currency: "XYZ", minor: "100" }, "en")).toThrow(RangeError);
    expect(() => formatPhisMoney({ currency: "toString", minor: "100" }, "en")).toThrow(RangeError);
    expect(() => formatPhisMoney({ currency: "CHF", minor: "-100" }, "en")).toThrow(RangeError);
    expect(() => formatPhisMoney({ currency: "CHF", minor: "19.90" }, "en")).toThrow(RangeError);
    expect(() => formatPhisMoney({ currency: "CHF", minor: "0100" }, "en")).toThrow(RangeError);
  });
});
