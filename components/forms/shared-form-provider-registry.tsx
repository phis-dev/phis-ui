"use client";

import { lazy, Suspense, type ComponentType } from "react";

import {
  createPhiFormProviderRegistry,
  type PhiFormFieldProviderProps,
  type PhiFormFieldTypeProvider,
  type PhiFormValidationProvider,
} from "./form-provider-registry";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
  PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS,
} from "./form-provider-contract";
import type {
  PhiFormFieldTypeProviderDescriptor,
  PhiFormProviderKey,
  PhiFormValidationProviderDescriptor,
} from "../../types/form-descriptor";
import { PhiTextControl } from "../controls/phi-text-control";
import { PhiNumberControl } from "../controls/phi-number-control";
import { PhiSelectControl } from "../controls/phi-select-control";
import { PhiMultiSelectControl } from "../controls/phi-multi-select-control";
import { PhiCheckboxControl } from "../controls/phi-checkbox-control";
import { PhiCheckboxGroupControl } from "../controls/phi-checkbox-group-control";
import { PhiSwitchControl } from "../controls/phi-switch-control";
import { PhiSegmentedControl } from "../controls/phi-segmented-control";
import {
  PHI_STORAGE_SIZE_PRECISION,
  PHI_STORAGE_SIZE_UNIT_LABEL,
  phiBytesToStorageSize,
  phiStorageSizeToBytes,
} from "./storage-size";

/**
 * A field Control whose code loads when a field of its kind is first rendered.
 *
 * The kinds below are rare in a form and heavy to ship: the slider and the cascader, the date and time
 * picker, and the compound Table and Tree fields, which bring the Table and Tree Controls with an editor
 * for every column kind. Text, choice and toggle fields stay in the registry itself, because nearly every
 * form has them and a round trip per field would cost more than it saves.
 */
function lazyPhiFormFieldControl(
  load: () => Promise<ComponentType<PhiFormFieldProviderProps>>,
  /** How many control rows the field occupies once loaded, so the form keeps its height meanwhile. */
  placeholderRows = 1,
): ComponentType<PhiFormFieldProviderProps> {
  const LazyControl = lazy(async () => ({ default: await load() }));
  /*
   * Only shown where the browser renders the field before its chunk arrived -- a navigation without a
   * server render. On a server-rendered page React keeps the server HTML until the chunk is there.
   */
  const placeholder = (
    <div
      aria-busy="true"
      style={{
        blockSize: `calc(var(--ant-control-height) * ${placeholderRows} + var(--ant-padding-sm) * ${placeholderRows - 1})`,
        borderRadius: "var(--ant-border-radius)",
        background: "var(--ant-color-fill-quaternary)",
      }}
    />
  );
  return function PhiLazyFormFieldControl(props: PhiFormFieldProviderProps) {
    return (
      <Suspense fallback={placeholder}>
        <LazyControl {...props} />
      </Suspense>
    );
  };
}

const PhiLazySliderFormControl = lazyPhiFormFieldControl(() =>
  import("./extended-form-field-controls").then((module) => module.PhiSliderFormControl));
const PhiLazyCascaderFormControl = lazyPhiFormFieldControl(() =>
  import("./extended-form-field-controls").then((module) => module.PhiCascaderFormControl));
const PhiLazyDateTimeFormControl = lazyPhiFormFieldControl(() =>
  import("./datetime-form-control").then((module) => module.PhiDateTimeFormControl));
// Collection header, then the Table's or Tree's head and at least one row.
const PhiLazyCompoundTableFormControl = lazyPhiFormFieldControl(() =>
  import("./compound-form-controls").then((module) => module.PhiCompoundTableFormControl), 3);
const PhiLazyCompoundTreeFormControl = lazyPhiFormFieldControl(() =>
  import("./compound-form-controls").then((module) => module.PhiCompoundTreeFormControl), 3);

/**
 * What a field type is, named by its key, joined to how it renders.
 *
 * The two halves live apart on purpose: the descriptor says what a field type is and travels to the
 * server and the authoring catalogs, while the Control is browser code this file is the only holder
 * of. Joining them used to be a matter of counting -- `...DESCRIPTORS[10]` beside the number Control --
 * and a position is not a name. Inserting a field type in the middle of that list re-paired every
 * entry after it: a Control would be registered under its neighbour's key, one field type would be
 * missing and another duplicated, and nothing in the repository noticed. Typecheck could not: all
 * descriptors have the same shape and `key` is not a literal type. The contract validators walk
 * catalogs rather than this file, and the unit suite is Node-only by design, so it never imports it.
 *
 * Naming the key makes the pairing readable, and makes a wrong one a thrown error at module load
 * rather than a form that quietly renders the wrong control.
 * `scripts/validate-form-provider-registry.mjs` keeps the positional spelling from coming back.
 */
function phiSharedFieldType(
  key: PhiFormProviderKey,
  provider: Omit<PhiFormFieldTypeProvider, keyof PhiFormFieldTypeProviderDescriptor>,
): PhiFormFieldTypeProvider {
  const descriptor = PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS.find((entry) => entry.key === key);
  if (!descriptor) throw new Error(`No shared form field type descriptor for "${key}".`);
  return { ...descriptor, ...provider };
}

/** The same pairing for a validation rule, whose descriptor list had drifted from its keys too. */
function phiSharedValidationRule(
  key: PhiFormProviderKey,
  provider: Omit<PhiFormValidationProvider, keyof PhiFormValidationProviderDescriptor>,
): PhiFormValidationProvider {
  const descriptor = PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS.find((entry) => entry.key === key);
  if (!descriptor) throw new Error(`No shared form validation provider descriptor for "${key}".`);
  return { ...descriptor, ...provider };
}

export const PHI_SHARED_FORM_PROVIDER_REGISTRY = createPhiFormProviderRegistry({
  fieldTypes: [
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.text, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.email, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.password, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.textarea, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.hidden, {
      Control: ({ value, onChange }) => (
        <PhiTextControl
          presentation="hidden"
          value={typeof value === "string" ? value : ""}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
      valuePropName: "value",
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.checkbox, {
      Control: ({ checked, controlLabel, onChange, disabled }) => (
        <PhiCheckboxControl
          checked={checked}
          label={controlLabel}
          disabled={disabled}
          onChange={(nextChecked) => onChange?.(nextChecked)}
        />
      ),
      valuePropName: "checked",
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.select, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.honeypot, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.url, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.tel, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.number, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.slider, {
      Control: PhiLazySliderFormControl,
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.checkboxGroup, {
      Control: ({ value, onChange, options, disabled, readOnly }) => (
        <PhiCheckboxGroupControl
          value={Array.isArray(value) ? value.map(String) : []}
          disabled={disabled}
          readOnly={readOnly}
          options={options ?? []}
          onChange={(nextValue) => onChange?.(nextValue)}
        />
      ),
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.switch, {
      Control: ({ checked, controlLabel, onChange, disabled, readOnly }) => (
        <PhiSwitchControl
          checked={checked}
          label={controlLabel}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(nextChecked) => onChange?.(nextChecked)}
        />
      ),
      valuePropName: "checked",
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.segmented, {
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
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.cascader, {
      Control: PhiLazyCascaderFormControl,
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.table, {
      Control: PhiLazyCompoundTableFormControl,
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.tree, {
      Control: PhiLazyCompoundTreeFormControl,
    }),
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.datetime, {
      Control: PhiLazyDateTimeFormControl,
    }),
    /*
     * The field holds bytes and shows megabytes, so both conversions sit on this one Control: the
     * value a form carries is bytes before it reaches here and bytes again the moment it leaves,
     * and no submit handler, validator or API payload learns that a unit was ever involved.
     */
    phiSharedFieldType(PHI_FORM_FIELD_PROVIDER_KEYS.storageSize, {
      Control: ({ value, onChange, placeholder, disabled, readOnly }) => (
        <PhiNumberControl
          value={phiBytesToStorageSize(value)}
          prefix={PHI_STORAGE_SIZE_UNIT_LABEL}
          min={0}
          step={1}
          precision={PHI_STORAGE_SIZE_PRECISION}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          style={{ width: "100%" }}
          onChange={(nextValue) => onChange?.(phiStorageSizeToBytes(nextValue))}
        />
      ),
    }),
  ],
  validationRules: [
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.required, {
      createRule: ({ message }) => ({ required: true, message }),
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.email, {
      createRule: ({ message }) => ({ type: "email", message }),
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.minLength, {
      createRule: ({ rule, message }) => {
        const min = typeof rule.config?.min === "number" ? rule.config.min : 0;
        return { type: "string", min, message };
      },
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.minLetters, {
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
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.maxLength, {
      createRule: ({ rule, message }) => {
        const max = typeof rule.config?.max === "number" ? rule.config.max : Number.MAX_SAFE_INTEGER;
        return { type: "string", max, message };
      },
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.exactLength, {
      createRule: ({ rule, message }) => {
        const length = typeof rule.config?.length === "number" ? rule.config.length : 0;
        return { type: "string", len: length, message };
      },
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.matchesField, {
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
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.url, {
      createRule: ({ message }) => ({ type: "url", message }),
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.tel, {
      createRule: ({ message }) => {
        if (!message) {
          throw new Error(
            "Telephone validation requires a translated message because the active Ant Design locales do not provide one.",
          );
        }
        return { type: "tel", message };
      },
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.pattern, {
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
    }),
    phiSharedValidationRule(PHI_FORM_VALIDATION_PROVIDER_KEYS.number, {
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
    }),
  ],
});
