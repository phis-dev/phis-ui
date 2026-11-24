"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";

import { PhiAddressControl } from "../controls/phi-address-control";
import { PhiCheckboxGroupControl } from "../controls/phi-checkbox-group-control";
import { PhiCountrySelectControl } from "../controls/phi-country-select-control";
import {
  PHI_ADDRESS_PARTS,
  findPhiAddressProblems,
  readPhiAddressFieldValue,
  type PhiAddressPart,
  type PhiAddressProblem,
} from "../../helpers/address-field";
import { readPhiFlagsFieldConfig, readPhiFlagsFieldValue, writePhiFlagsFieldValue } from "./flags-field";
import type { PhiFormFieldProviderProps } from "./form-provider-registry";
import { readPhiFormAddressLabels, type PhiFormAddressLabels } from "./structured-field-labels";

/*
 * The fields whose value has a shape of its own -- a country code, an address, a bit-flag number --
 * loaded only where one is rendered.
 */

export const PhiCountryFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  id, field, value, onChange, placeholder, disabled, readOnly,
}) => (
  <PhiCountrySelectControl
    id={id}
    value={typeof value === "string" ? value : null}
    placeholder={placeholder}
    allowClear={field.config?.allowClear === true}
    disabled={disabled}
    readOnly={readOnly}
    onChange={(code) => onChange?.(code ?? undefined)}
  />
);

function describeProblem(problem: PhiAddressProblem, labels: PhiFormAddressLabels) {
  if (problem.kind === "tooLong") {
    return labels.tooLong.replace("%1", labels[problem.part]).replace("%2", String(problem.max));
  }
  switch (problem.part) {
    case "name": return labels.nameRequired;
    case "line1": return labels.line1Required;
    case "city": return labels.cityRequired;
    default: return labels.countryRequired;
  }
}

/**
 * One address, `PhisSiteAddressInput`, as one value. Each part is held to what Core takes -- the four
 * required parts, the column widths, a country of the list -- and while one is not, the field holds the
 * Form's submit with the first sentence (`formContext.holdSubmit`); a part says what is wrong with it once
 * it has been left.
 */
export const PhiAddressFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  id, field, value, onChange, labels, disabled, readOnly, formContext,
}) => {
  const address = readPhiAddressFieldValue(value);
  const words = useMemo(() => readPhiFormAddressLabels(labels), [labels]);
  const problems = findPhiAddressProblems(address);
  const [left, setLeft] = useState<ReadonlySet<PhiAddressPart>>(() => new Set());
  const hold = problems[0] ? describeProblem(problems[0], words) : null;
  const holdSubmit = formContext?.holdSubmit;

  useEffect(() => {
    holdSubmit?.(field.key, hold);
  }, [field.key, hold, holdSubmit]);
  useEffect(() => () => holdSubmit?.(field.key, null), [field.key, holdSubmit]);

  const errors: Partial<Record<PhiAddressPart, string>> = {};
  for (const problem of problems) {
    if (left.has(problem.part) && !errors[problem.part]) errors[problem.part] = describeProblem(problem, words);
  }

  return (
    <PhiAddressControl
      id={id}
      value={address}
      labels={Object.fromEntries(PHI_ADDRESS_PARTS.map((part) => [part, words[part]])) as Record<PhiAddressPart, string>}
      errors={errors}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(next) => onChange?.(next)}
      onPartBlur={(part) => setLeft((current) => (current.has(part) ? current : new Set([...current, part])))}
    />
  );
};

/** Several yes-or-no answers as one bit-flag number (`flags-field.ts`). */
export const PhiFlagsFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  field, value, onChange, options, disabled, readOnly,
}) => {
  const offered = useMemo(() => options ?? [], [options]);
  const config = useMemo(() => readPhiFlagsFieldConfig(field.config, offered), [field.config, offered]);
  const mask = readPhiFlagsFieldValue(value);
  const checked = offered.filter((option) => (mask & (config.bits.get(option.value) ?? 0)) !== 0).map((option) => option.value);
  return (
    <PhiCheckboxGroupControl
      vertical
      value={checked}
      disabled={disabled}
      readOnly={readOnly}
      options={offered.map((option) => {
        const needed = config.requires.get(config.bits.get(option.value) ?? 0);
        return needed !== undefined && (mask & needed) === 0 ? { ...option, disabled: true } : option;
      })}
      onChange={(next) => onChange?.(writePhiFlagsFieldValue(config, mask, next))}
    />
  );
};
