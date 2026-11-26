"use client";

import { useId } from "react";
import type { PhisSiteAddressInput } from "@phis/contracts/users";

import {
  PHI_ADDRESS_PARTS,
  PHI_ADDRESS_PART_MAX_LENGTHS,
  PHI_ADDRESS_REQUIRED_PARTS,
  writePhiAddressFieldPart,
  type PhiAddressPart,
} from "../../helpers/address-field";
import { PhiFormFieldPart, PhiFormFieldParts } from "../forms/form-field-row";
import { PhiCountrySelectControl } from "./phi-country-select-control";
import { PhiTextControl } from "./phi-text-control";
import type { PhiControlSize } from "../../types/control";

export type PhiAddressControlLabels = Record<PhiAddressPart, string>;

export type PhiAddressControlProps = {
  /** The id of the first part's input, so a label outside the control can name it. */
  id?: string;
  value: PhisSiteAddressInput;
  labels: PhiAddressControlLabels;
  /** A sentence per part that is wrong, shown under it. */
  errors?: Partial<Record<PhiAddressPart, string>>;
  disabled?: boolean;
  readOnly?: boolean;
  /** The size every part's input is drawn in; its Form's (`PhiFormFieldProviderProps.size`). */
  size?: PhiControlSize;
  onChange?: (next: PhisSiteAddressInput) => void;
  /** A part was left, so whoever validates may now say what is wrong with it. */
  onPartBlur?: (part: PhiAddressPart) => void;
};

const AUTOCOMPLETE: Record<Exclude<PhiAddressPart, "country">, string> = {
  name: "name",
  companyName: "organization",
  line1: "address-line1",
  line2: "address-line2",
  postalCode: "postal-code",
  city: "address-level2",
  region: "address-level1",
};

/**
 * One postal address in the shape Core writes (`PhisSiteAddressInput`): name, company, two street lines,
 * postal code, city, region and the country -- chosen with `PhiCountrySelectControl`. Each part is a row of
 * the Form's own template, drawn by `PhiFormFieldPart` (`components/forms/form-field-row.tsx`): its label
 * in the label column, beside the input or above it exactly where a field of its own would stand, its
 * sentence under the input when it is wrong; required parts carry the marker. The control draws no label
 * layout of its own -- with the labels on top it stood stacked in a dialog whose other fields had them
 * beside. The value is the whole address, an empty optional part `null`.
 */
export function PhiAddressControl({
  id,
  value,
  labels,
  errors,
  disabled,
  readOnly,
  size,
  onChange,
  onPartBlur,
}: PhiAddressControlProps) {
  const ownId = useId();
  const partId = (part: PhiAddressPart) => (part === "name" && id ? id : `${ownId}-${part}`);
  const write = (part: PhiAddressPart, next: string | null) => onChange?.(writePhiAddressFieldPart(value, part, next));

  return (
    <PhiFormFieldParts>
      {PHI_ADDRESS_PARTS.map((part) => (
        <PhiFormFieldPart
          key={part}
          htmlFor={partId(part)}
          label={labels[part]}
          required={(PHI_ADDRESS_REQUIRED_PARTS as readonly PhiAddressPart[]).includes(part)}
          error={errors?.[part]}
        >
          {part === "country" ? (
            <PhiCountrySelectControl
              id={partId(part)}
              size={size}
              value={value.country}
              disabled={disabled}
              readOnly={readOnly}
              onBlur={() => onPartBlur?.(part)}
              onChange={(next) => write(part, next)}
            />
          ) : (
            <PhiTextControl
              id={partId(part)}
              size={size}
              value={value[part] ?? ""}
              disabled={disabled}
              readOnly={readOnly}
              autoComplete={AUTOCOMPLETE[part]}
              maxLength={PHI_ADDRESS_PART_MAX_LENGTHS[part]}
              onBlur={() => onPartBlur?.(part)}
              onChange={(next) => write(part, next)}
            />
          )}
        </PhiFormFieldPart>
      ))}
    </PhiFormFieldParts>
  );
}
