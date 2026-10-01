"use client";

import type { ComponentType } from "react";

import { PhiCascaderControl } from "../controls/phi-cascader-control";
import { PhiNumberControl } from "../controls/phi-number-control";
import { PhiSliderControl } from "../controls/phi-slider-control";
import type { PhiFormFieldProviderProps } from "./form-provider-registry";
import {
  PHI_STORAGE_SIZE_UNIT_LABEL,
  phiBytesToStorageSize,
  phiStorageSizeToBytes,
} from "./storage-size";

/*
 * Field kinds most forms never have, loaded only where one is rendered: the slider, the cascader and
 * the number fields.
 *
 * The shared registry is imported by every Form Widget, and a Contact form paid for the slider and the
 * cascader -- and through the compound controls for the Table and Tree Controls with every editor --
 * without a field of either kind. The registry points here through a lazy Control instead.
 */

export const PhiSliderFormControl: ComponentType<PhiFormFieldProviderProps> = ({ field, value, onChange, disabled, readOnly }) => {
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
    <div style={{ display: "grid", gridTemplateColumns: "minmax(96px, 1fr) minmax(0, 2fr)", gap: "var(--ant-padding-sm)", alignItems: "center", minWidth: 0 }}>
      <PhiNumberControl
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

export const PhiCascaderFormControl: ComponentType<PhiFormFieldProviderProps> = ({ field, value, onChange, options, placeholder, disabled, readOnly }) => (
  <PhiCascaderControl
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
  id, field, value, onChange, placeholder, disabled, readOnly,
}) => (
  <PhiNumberControl
    id={id}
    value={typeof value === "number" ? value : null}
    disabled={disabled}
    readOnly={readOnly}
    placeholder={placeholder}
    min={typeof field.config?.min === "number" ? field.config.min : undefined}
    max={typeof field.config?.max === "number" ? field.config.max : undefined}
    step={typeof field.config?.step === "number" ? field.config.step : undefined}
    precision={typeof field.config?.precision === "number" ? field.config.precision : undefined}
    prefix={typeof field.config?.prefix === "string" ? field.config.prefix : undefined}
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
  id, value, onChange, placeholder, disabled, readOnly,
}) => {
  const size = phiBytesToStorageSize(value);
  return (
    <PhiNumberControl
      id={id}
      value={size}
      /*
       * A unit belongs to a value, so an empty field has none: the field says what it means by being
       * empty -- "Unlimited", or whatever its placeholder states -- and a lone "MB" in front of that
       * reads like the start of an answer nobody gave.
       */
      prefix={size == null ? undefined : PHI_STORAGE_SIZE_UNIT_LABEL}
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
