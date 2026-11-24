"use client";

import { useId } from "react";
import type { PhisSiteAddressInput } from "@phis/contracts/users";

import {
  PHI_ADDRESS_PART_MAX_LENGTHS,
  PHI_ADDRESS_REQUIRED_PARTS,
  writePhiAddressFieldPart,
  type PhiAddressPart,
} from "../../helpers/address-field";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiCountrySelectControl } from "./phi-country-select-control";
import { PhiTextControl } from "./phi-text-control";

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

/* Two parts share a row where they are short: postal code beside city, region beside country. */
const ROWS: readonly (readonly PhiAddressPart[])[] = [
  ["name"],
  ["companyName"],
  ["line1"],
  ["line2"],
  ["postalCode", "city"],
  ["region", "country"],
];

/**
 * One postal address in the shape Core writes (`PhisSiteAddressInput`): name, company, two street lines,
 * postal code and city, region and the country -- chosen with `PhiCountrySelectControl`. Each part has its
 * label above it and its sentence under it when it is wrong; required parts carry the marker. The value is
 * the whole address, an empty optional part `null`.
 */
export function PhiAddressControl({
  id,
  value,
  labels,
  errors,
  disabled,
  readOnly,
  onChange,
  onPartBlur,
}: PhiAddressControlProps) {
  const { token } = usePhiConfig();
  const ownId = useId();
  const partId = (part: PhiAddressPart) => (part === "name" && id ? id : `${ownId}-${part}`);
  const write = (part: PhiAddressPart, next: string | null) => onChange?.(writePhiAddressFieldPart(value, part, next));

  const renderPart = (part: PhiAddressPart) => {
    const required = (PHI_ADDRESS_REQUIRED_PARTS as readonly PhiAddressPart[]).includes(part);
    const error = errors?.[part];
    return (
      <div key={part} style={{ display: "flex", flexDirection: "column", gap: token.paddingXXS, minWidth: 0 }}>
        <label htmlFor={partId(part)} style={{ color: token.colorTextHeading, fontSize: token.fontSizeSM }}>
          {required ? <span aria-hidden style={{ color: token.colorError, marginInlineEnd: "0.25em" }}>*</span> : null}
          {labels[part]}
        </label>
        {part === "country" ? (
          <PhiCountrySelectControl
            id={partId(part)}
            value={value.country}
            disabled={disabled}
            readOnly={readOnly}
            onBlur={() => onPartBlur?.(part)}
            onChange={(next) => write(part, next)}
          />
        ) : (
          <PhiTextControl
            id={partId(part)}
            value={value[part] ?? ""}
            disabled={disabled}
            readOnly={readOnly}
            autoComplete={AUTOCOMPLETE[part]}
            maxLength={PHI_ADDRESS_PART_MAX_LENGTHS[part]}
            onBlur={() => onPartBlur?.(part)}
            onChange={(next) => write(part, next)}
          />
        )}
        {error ? (
          <span role="alert" style={{ color: token.colorError, fontSize: token.fontSizeSM }}>{error}</span>
        ) : null}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: token.paddingSM, width: "100%", minWidth: 0 }}>
      {ROWS.map((row) => row.length === 1 ? renderPart(row[0]!) : (
        <div
          key={row.join("-")}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: token.paddingSM }}
        >
          {row.map(renderPart)}
        </div>
      ))}
    </div>
  );
}
