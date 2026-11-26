"use client";

import { useEffect, type ComponentType } from "react";

import { PhiCascaderControl } from "../controls/phi-cascader-control";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiMoneyControl } from "../controls/phi-money-control";
import { PhiNumberControl } from "../controls/phi-number-control";
import { PhiSliderControl } from "../controls/phi-slider-control";
import type { PhiFormFieldProviderProps } from "./form-provider-registry";
import { resolvePhiFormText } from "./form-descriptor-contract";
import {
  readPhiMoneyFieldAmount,
  readPhiMoneyFieldAmounts,
  readPhiMoneyFieldConfig,
  readPhiMoneyFieldLinkedCurrency,
  readPhiMoneyFieldOptionCurrencies,
  updatePhiMoneyFieldAmounts,
} from "./money-field";
import { usePhiIntlLocale } from "../root/phi-intl-locale";
import {
  PHI_STORAGE_SIZE_UNIT_LABEL,
  phiBytesToStorageSize,
  phiStorageSizeToBytes,
} from "./storage-size";

/**
 * The unit beside a number, which is the value's and not the field's name ("days", not "Window (days)").
 *
 * A symbol nobody translates -- `ms`, `px` -- is written as a string. A word is a label reference
 * (`{ kind: "label", key, fallback }`) and is read from the Form's labels like the field's own label,
 * so "days" is "Tage" where the Form is German.
 */
function readPhiNumberFieldPrefix(prefix: unknown, labels: PhiFormFieldProviderProps["labels"]) {
  if (typeof prefix === "string") return prefix;
  const text = prefix as { kind?: unknown; key?: unknown; fallback?: unknown } | null | undefined;
  if (text?.kind === "label" && typeof text.key === "string" && typeof text.fallback === "string") {
    return resolvePhiFormText({ kind: "label", key: text.key, fallback: text.fallback }, labels);
  }
  return undefined;
}

/*
 * Field kinds most forms never have, loaded only where one is rendered: the slider, the cascader and
 * the number and money fields.
 *
 * The shared registry is imported by every Form Widget, and a Contact form paid for the slider and the
 * cascader -- and through the compound controls for the Table and Tree Controls with every editor --
 * without a field of either kind. The registry points here through a lazy Control instead.
 */

/*
 * The slider's rail and handle have one size in Ant Design; a small Form draws the number beside it small.
 */
export const PhiSliderFormControl: ComponentType<PhiFormFieldProviderProps> = ({ field, value, onChange, disabled, readOnly, size }) => {
  const numericValue = typeof value === "number" ? value : undefined;
  const min = typeof field.config?.min === "number" ? field.config.min : undefined;
  const max = typeof field.config?.max === "number" ? field.config.max : undefined;
  const step = typeof field.config?.step === "number" ? field.config.step : undefined;
  const slider = (
    <PhiSliderControl
      value={numericValue}
      min={min}
      max={max}
      step={step}
      dots={field.config?.dots === true}
      included={field.config?.included !== false}
      reverse={field.config?.reverse === true}
      tooltipMode={
        field.config?.tooltipMode === "always" || field.config?.tooltipMode === "hidden"
          ? field.config.tooltipMode
          : "auto"
      }
      tooltipSuffix={typeof field.config?.tooltipSuffix === "string" ? field.config.tooltipSuffix : undefined}
      disabled={disabled}
      readOnly={readOnly}
      style={{ width: "100%" }}
      onChange={(nextValue) => onChange?.(nextValue)}
    />
  );
  return field.config?.showInput === true ? (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(96px, 1fr) minmax(0, 2fr)", gap: "var(--phi-padding-sm)", alignItems: "center", minWidth: 0 }}>
      <PhiNumberControl
        size={size}
        value={numericValue ?? null}
        min={min}
        max={max}
        step={step}
        precision={typeof field.config?.precision === "number" ? field.config.precision : undefined}
        disabled={disabled}
        readOnly={readOnly}
        style={{ width: "100%" }}
        onChange={(nextValue) => onChange?.(nextValue)}
      />
      {slider}
    </div>
  ) : slider;
};

export const PhiCascaderFormControl: ComponentType<PhiFormFieldProviderProps> = ({ field, value, onChange, options, placeholder, disabled, readOnly, size }) => (
  <PhiCascaderControl
    size={size}
    value={typeof value === "string" ? value : undefined}
    placeholder={placeholder}
    disabled={disabled}
    readOnly={readOnly}
    options={options ?? []}
    allowRoot={field.config?.allowRoot !== false}
    allowClear={field.config?.allowClear === true}
    separator={typeof field.config?.separator === "string" ? field.config.separator : "/"}
    rootValue={typeof field.config?.rootValue === "string" ? field.config.rootValue : "/"}
    normalize={field.config?.normalize === "path" ? "path" : "raw"}
    onChange={(nextValue) => onChange?.(nextValue)}
  />
);

export const PhiNumberFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  id, field, value, onChange, placeholder, disabled, readOnly, labels, size,
}) => (
  <PhiNumberControl
    id={id}
    size={size}
    value={typeof value === "number" ? value : null}
    disabled={disabled}
    readOnly={readOnly}
    placeholder={placeholder}
    min={typeof field.config?.min === "number" ? field.config.min : undefined}
    max={typeof field.config?.max === "number" ? field.config.max : undefined}
    step={typeof field.config?.step === "number" ? field.config.step : undefined}
    precision={typeof field.config?.precision === "number" ? field.config.precision : undefined}
    prefix={readPhiNumberFieldPrefix(field.config?.prefix, labels)}
    style={{ width: "100%" }}
    onChange={(nextValue) => onChange?.(nextValue)}
  />
);

/*
 * The field holds bytes and shows megabytes, so both conversions sit on this one Control: the value a
 * form carries is bytes before it reaches here and bytes again the moment it leaves, and no submit
 * handler, validator or API payload learns that a unit was ever involved.
 */
export const PhiStorageSizeFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  id, value, onChange, placeholder, disabled, readOnly, size,
}) => {
  const megabytes = phiBytesToStorageSize(value);
  return (
    <PhiNumberControl
      id={id}
      size={size}
      value={megabytes}
      /*
       * A unit belongs to a value, so an empty field has none: the field says what it means by being
       * empty -- "Unlimited", or whatever its placeholder states -- and a lone "MB" in front of that
       * reads like the start of an answer nobody gave.
       */
      prefix={megabytes == null ? undefined : PHI_STORAGE_SIZE_UNIT_LABEL}
      min={0}
      step={1}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      style={{ width: "100%" }}
      onChange={(nextValue) => onChange?.(phiStorageSizeToBytes(nextValue))}
    />
  );
};

/*
 * The field holds minor units and shows major ones, as the storage size holds bytes and shows megabytes:
 * the conversion is the Control's, on the digits (`helpers/money-amount.ts`), and a handler reads the
 * contract's money and nothing else. The shapes and the config are `money-field.ts`.
 */
export const PhiMoneyFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  id, field, value, onChange, label, placeholder, disabled, readOnly, options, formValues, size,
}) => {
  const locale = usePhiIntlLocale();
  const config = readPhiMoneyFieldConfig(field.config, { hasOptionsProvider: field.optionsProvider !== undefined });
  const { currencies, currenciesFromOptions, currencyField, min, max } = config;
  const currency = currencyField === undefined ? config.currency : readPhiMoneyFieldLinkedCurrency(currencyField, formValues);
  /*
   * An amount the value holds in another currency than the one its field now names was entered for the
   * old one: it is no price in the new one, so it is shown empty and cleared, as a dependent choice is
   * when its parent changes. Only a `currencyField` amount can get there; a fixed currency that does not
   * match is a record that does not fit the Form and throws below.
   */
  const stale = currencyField !== undefined && value != null
    && !(typeof value === "object" && (value as { currency?: unknown }).currency === currency);
  useEffect(() => {
    if (stale) onChange?.(null);
  }, [onChange, stale]);
  if (currencyField !== undefined && currency === null) return null;
  if (currency !== undefined && currency !== null) {
    return (
      <PhiMoneyControl
        id={id}
        size={size}
        value={stale ? null : readPhiMoneyFieldAmount(value, currency)?.minor ?? null}
        currency={currency}
        locale={locale}
        min={min}
        max={max}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        style={{ width: "100%" }}
        onChange={(minor) => onChange?.(minor === null ? null : { currency, minor })}
      />
    );
  }
  const list = currenciesFromOptions ? readPhiMoneyFieldOptionCurrencies(options, value) : currencies ?? [];
  const amounts = readPhiMoneyFieldAmounts(value, list);
  return (
    <PhiFlexControl vertical gap="small">
      {list.map((entry, index) => (
        <PhiMoneyControl
          key={entry}
          // The field's label names the first input; each one after it is named by the label and its currency.
          id={index === 0 ? id : undefined}
          size={size}
          ariaLabel={index === 0 ? undefined : [label, entry].filter(Boolean).join(" ")}
          value={amounts?.[entry] ?? null}
          currency={entry}
          locale={locale}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          style={{ width: "100%" }}
          onChange={(minor) => onChange?.(updatePhiMoneyFieldAmounts(amounts, list, entry, minor))}
        />
      ))}
    </PhiFlexControl>
  );
};
