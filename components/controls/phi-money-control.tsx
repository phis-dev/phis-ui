"use client";

import type { CSSProperties, FocusEventHandler } from "react";
import { InputNumber } from "antd";
import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import { PHI_LAYOUT } from "../../theme/phi-tokens";
import {
  comparePhiMinorAmounts,
  formatPhiMajorAmount,
  parsePhiLocaleAmount,
  phiMajorToMinorAmount,
  PHI_MINOR_AMOUNT_MAX,
  readPhiCurrencyExponent,
  resolvePhiCurrencyAffix,
} from "../../helpers/money-amount";
import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";
import { phisMinorToMajorAmount } from "@phis/contracts/payments";

export type PhiMoneyControlProps = {
  /** The DOM id of the input, so a `<label for>` outside the control can name it. */
  id?: string;
  /** The amount in minor units, a canonical integer string (`PhisPaymentMoney.minor`); `null` for none. */
  value?: string | null;
  /** The ISO 4217 code the amount is in; it decides how many places the number has. */
  currency: string;
  /** The page's locale, for how the number is written (`usePhiIntlLocale`). */
  locale: string;
  /** The least and the most the amount may be, in minor units. Nothing below zero is an amount. */
  min?: string;
  max?: string;
  label?: string;
  /** The field's accessible name where it shows no `label`. */
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: PhiControlSize;
  variant?: PhiControlVariant;
  style?: CSSProperties;
  onChange?: (minor: string | null) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

/**
 * An amount of money: minor units in and out, major units on screen, the currency beside the number.
 *
 * The number is held as a decimal string (`stringMode`), never as a float, and converted on its digits
 * (`helpers/money-amount.ts`). It is written the way the page's locale writes numbers once the field is
 * left, and while somebody types it shows exactly what they typed -- reformatting under the caret moves
 * it. Leaving the field rounds to the currency's places and brings the amount into `min`..`max`.
 *
 * The currency is its ISO code, on the side the locale puts it ("CHF 12.50", "12,50 EUR"), and it is
 * shown with an empty field too: unlike a unit, it says what is being asked for before there is an
 * answer.
 */
export function PhiMoneyControl({
  id,
  value,
  currency,
  locale,
  min,
  max,
  label,
  ariaLabel,
  placeholder,
  disabled,
  readOnly,
  size,
  variant,
  style,
  onChange,
  onBlur,
}: PhiMoneyControlProps) {
  const { labelId, labelledBy } = usePhiControlLabel(label);
  const exponent = readPhiCurrencyExponent(currency);
  if (exponent === undefined) {
    throw new Error(`PhiMoneyControl: "${currency}" is not an ISO 4217 currency a payment accepts.`);
  }
  const ceiling = max !== undefined && comparePhiMinorAmounts(max, PHI_MINOR_AMOUNT_MAX) < 0 ? max : PHI_MINOR_AMOUNT_MAX;
  const affix = resolvePhiCurrencyAffix(locale, currency);
  const control = (
    <InputNumber<string>
      id={id}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
      stringMode
      value={value == null ? null : phisMinorToMajorAmount(value, exponent)}
      min={phisMinorToMajorAmount(min ?? "0", exponent)}
      max={phisMinorToMajorAmount(ceiling, exponent)}
      step="1"
      precision={exponent}
      formatter={(next, info) => {
        if (info.userTyping) return info.input;
        return next == null || next === "" ? "" : formatPhiMajorAmount(next, locale, exponent);
      }}
      parser={(text) => parsePhiLocaleAmount(text ?? "", locale)}
      prefix={affix.placement === "prefix" ? affix.text : undefined}
      suffix={affix.placement === "suffix" ? affix.text : undefined}
      placeholder={placeholder}
      disabled={disabled || (!onChange && !readOnly)}
      readOnly={readOnly}
      size={size}
      variant={variant}
      style={{ maxWidth: PHI_LAYOUT.numberControlMax, ...style }}
      onChange={(next) => onChange?.(next == null || next === "" ? null : phiMajorToMinorAmount(next, exponent))}
      onBlur={onBlur}
    />
  );
  return <PhiLabeledControl label={label} labelId={labelId} fill={style?.width === "100%"}>{control}</PhiLabeledControl>;
}
