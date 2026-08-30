"use client";

import { createPhiFormProviderRegistry } from "./form-provider-registry";
import {
  PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
  PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS,
} from "./form-provider-contract";
import { PhiTextControl } from "../controls/phi-text-control";
import { PhiNumberControl } from "../controls/phi-number-control";
import { PhiSliderControl } from "../controls/phi-slider-control";
import { PhiSelectControl } from "../controls/phi-select-control";
import { PhiMultiSelectControl } from "../controls/phi-multi-select-control";
import { PhiCheckboxControl } from "../controls/phi-checkbox-control";
import { PhiCheckboxGroupControl } from "../controls/phi-checkbox-group-control";
import { PhiSwitchControl } from "../controls/phi-switch-control";
import { PhiSegmentedControl } from "../controls/phi-segmented-control";
import { PhiCascaderControl } from "../controls/phi-cascader-control";
import { PhiCompoundTableFormControl, PhiCompoundTreeFormControl } from "./compound-form-controls";
import { PhiDateTimeFormControl } from "./datetime-form-control";

export const PHI_SHARED_FORM_PROVIDER_REGISTRY = createPhiFormProviderRegistry({
  fieldTypes: [
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[0],
      Control: ({ field, value, onChange, placeholder, disabled, readOnly }) => (
        <PhiTextControl
          value={typeof value === "string" ? value : ""}
          inputType={field.config?.inputType === "search" ? "search" : "text"}
          allowClear={field.config?.allowClear === true}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={field.autoComplete}
          minLength={typeof field.config?.minLength === "number" ? field.config.minLength : undefined}
          maxLength={typeof field.config?.maxLength === "number" ? field.config.maxLength : undefined}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[1],
      Control: ({ field, value, onChange, placeholder, disabled, readOnly }) => (
        <PhiTextControl
          value={typeof value === "string" ? value : ""}
          inputType="email"
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={field.autoComplete}
          minLength={typeof field.config?.minLength === "number" ? field.config.minLength : undefined}
          maxLength={typeof field.config?.maxLength === "number" ? field.config.maxLength : undefined}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[2],
      Control: ({ field, value, onChange, placeholder, disabled, readOnly }) => (
        <PhiTextControl
          presentation="password"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete={field.autoComplete}
          minLength={typeof field.config?.minLength === "number" ? field.config.minLength : undefined}
          maxLength={typeof field.config?.maxLength === "number" ? field.config.maxLength : undefined}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[3],
      Control: ({ field, value, onChange, placeholder, disabled, readOnly }) => (
        <PhiTextControl
          presentation="textarea"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete={field.autoComplete}
          minLength={typeof field.config?.minLength === "number" ? field.config.minLength : undefined}
          maxLength={typeof field.config?.maxLength === "number" ? field.config.maxLength : undefined}
          rows={typeof field.config?.rows === "number" ? field.config.rows : undefined}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[4],
      Control: ({ value, onChange }) => (
        <PhiTextControl
          presentation="hidden"
          value={typeof value === "string" ? value : ""}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
      valuePropName: "value",
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[5],
      Control: ({ checked, controlLabel, onChange, disabled }) => (
        <PhiCheckboxControl
          checked={checked}
          label={controlLabel}
          disabled={disabled}
          onChange={(nextChecked) => onChange?.(nextChecked)}
        />
      ),
      valuePropName: "checked",
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[6],
      Control: ({ value, onChange, options, placeholder, disabled, readOnly, onSearch, filterOptionsLocally }) => (
        <PhiSelectControl
          value={typeof value === "string" ? value : undefined}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          options={options ?? []}
          onSearch={onSearch}
          filterOptionsLocally={filterOptionsLocally}
          onChange={(nextValue) => onChange?.(nextValue)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[7],
      Control: ({ value, onChange, disabled }) => (
        <PhiTextControl
          presentation="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[8],
      Control: ({ field, value, onChange, placeholder, disabled, readOnly }) => (
        <PhiTextControl
          value={typeof value === "string" ? value : ""}
          inputType="url"
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={field.autoComplete}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[9],
      Control: ({ field, value, onChange, placeholder, disabled, readOnly }) => (
        <PhiTextControl
          value={typeof value === "string" ? value : ""}
          inputType="phone"
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={field.autoComplete}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[10],
      Control: ({ field, value, onChange, placeholder, disabled, readOnly }) => (
        <PhiNumberControl
          value={typeof value === "number" ? value : null}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          min={typeof field.config?.min === "number" ? field.config.min : undefined}
          max={typeof field.config?.max === "number" ? field.config.max : undefined}
          step={typeof field.config?.step === "number" ? field.config.step : undefined}
          precision={typeof field.config?.precision === "number" ? field.config.precision : undefined}
          style={{ width: "100%" }}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[11],
      Control: ({ field, value, onChange, disabled, readOnly }) => {
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
      },
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[12],
      Control: ({ value, onChange, options, placeholder, disabled, readOnly }) => (
        <PhiMultiSelectControl
          value={Array.isArray(value) ? value.map(String) : []}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          options={options ?? []}
          style={{ width: "100%" }}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[13],
      Control: ({ value, onChange, options, disabled, readOnly }) => (
        <PhiCheckboxGroupControl
          value={Array.isArray(value) ? value.map(String) : []}
          disabled={disabled}
          readOnly={readOnly}
          options={options ?? []}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[14],
      Control: ({ checked, onChange, disabled, readOnly }) => (
        <PhiSwitchControl
          checked={checked}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(nextChecked) => onChange?.(nextChecked)}
        />
      ),
      valuePropName: "checked",
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[15],
      Control: ({ value, onChange, options, disabled, readOnly }) => (
        <PhiSegmentedControl
          value={typeof value === "string" ? value : undefined}
          disabled={disabled}
          readOnly={readOnly}
          options={options ?? []}
          block
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[16],
      Control: ({ field, value, onChange, options, placeholder, disabled, readOnly }) => (
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
      ),
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[17],
      Control: PhiCompoundTableFormControl,
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[18],
      Control: PhiCompoundTreeFormControl,
    },
    {
      ...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[19],
      Control: PhiDateTimeFormControl,
    },
  ],
  validationRules: [
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[0],
      createRule: ({ message }) => ({ required: true, message }),
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[1],
      createRule: ({ message }) => ({ type: "email", message }),
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[2],
      createRule: ({ rule, message }) => {
        const min = typeof rule.config?.min === "number" ? rule.config.min : 0;
        return { type: "string", min, message };
      },
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[3],
      createRule: ({ rule, message }) => {
        const min = typeof rule.config?.min === "number" ? Math.max(1, Math.trunc(rule.config.min)) : 1;
        return {
          async validator(_, value) {
            const letterCount = String(value ?? "").match(/\p{L}/gu)?.length ?? 0;
            if (!value || letterCount >= min) {
              return;
            }
            throw new Error(message ?? `Value must contain at least ${min} letters.`);
          },
        };
      },
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[4],
      createRule: ({ rule, message }) => {
        const max = typeof rule.config?.max === "number" ? rule.config.max : Number.MAX_SAFE_INTEGER;
        return { type: "string", max, message };
      },
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[5],
      createRule: ({ rule, message }) => {
        const length = typeof rule.config?.length === "number" ? rule.config.length : 0;
        return { type: "string", len: length, message };
      },
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[6],
      createRule: ({ rule, message }) => {
        const field = typeof rule.config?.field === "string" ? rule.config.field : "";
        if (!message) {
          throw new Error("Matches-field validation requires a translated message.");
        }
        return ({ getFieldValue }) => ({
          async validator(_, value) {
            if (!field || value === getFieldValue(field)) {
              return;
            }
            throw new Error(message);
          },
        });
      },
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[7],
      createRule: ({ message }) => ({ type: "url", message }),
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[8],
      createRule: ({ message }) => {
        if (!message) {
          throw new Error(
            "Telephone validation requires a translated message because the active Ant Design locales do not provide one.",
          );
        }
        return { type: "tel", message };
      },
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[9],
      createRule: ({ rule, message }) => {
        const source =
          typeof rule.config?.source === "string" ? rule.config.source : "";
        const flags =
          typeof rule.config?.flags === "string" ? rule.config.flags : "";
        if (!source || source.length > 512) {
          throw new Error("Pattern source must contain between 1 and 512 characters.");
        }
        if (!/^[imsu]*$/.test(flags) || new Set(flags).size !== flags.length) {
          throw new Error("Pattern flags may contain each of i, m, s, and u at most once.");
        }
        return { pattern: new RegExp(source, flags), message };
      },
    },
    {
      ...PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS[10],
      createRule: ({ rule, message }) => ({
        async validator(_, value) {
          if (value === undefined || value === null || value === "") return;
          const numericValue = Number(value);
          const min = typeof rule.config?.min === "number" ? rule.config.min : undefined;
          const max = typeof rule.config?.max === "number" ? rule.config.max : undefined;
          const step = typeof rule.config?.step === "number" && rule.config.step > 0 ? rule.config.step : undefined;
          const precision = typeof rule.config?.precision === "number" ? Math.max(0, Math.trunc(rule.config.precision)) : undefined;
          const integer = rule.config?.integer === true;
          const decimalPlaces = String(numericValue).split(".")[1]?.length ?? 0;
          const stepBase = min ?? 0;
          const stepMatches = step === undefined || Math.abs((numericValue - stepBase) / step - Math.round((numericValue - stepBase) / step)) < 1e-9;
          if (!Number.isFinite(numericValue) || (min !== undefined && numericValue < min) ||
            (max !== undefined && numericValue > max) || (integer && !Number.isInteger(numericValue)) ||
            (precision !== undefined && decimalPlaces > precision) || !stepMatches) {
            throw new Error(message ?? "Value does not satisfy the numeric constraints.");
          }
        },
      }),
    },
  ],
});
