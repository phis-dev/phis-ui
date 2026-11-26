"use client";

import { useMemo, type CSSProperties } from "react";

import { listPhiCountryOptions } from "../../helpers/country-names";
import { usePhiIntlLocale } from "../root/phi-intl-locale";
import type { PhiControlSize } from "../../types/control";
import { PhiSelectControl } from "./phi-select-control";

export type PhiCountrySelectControlProps = {
  id?: string;
  /** An ISO 3166-1 alpha-2 code, uppercase; anything else shows as no choice. */
  value?: string | null;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  readOnly?: boolean;
  allowClear?: boolean;
  size?: PhiControlSize;
  /** Where the list is mounted; the document's end where left out. */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  style?: CSSProperties;
  onBlur?: () => void;
  onChange: (code: string | null) => void;
};

/**
 * A country chosen from ISO 3166-1, by name in the page's language: the Select Control with every code
 * of `PHI_ISO_3166_ALPHA2_CODES` named through `Intl.DisplayNames` and sorted as the language sorts,
 * searchable by name and by code. What it holds is the code.
 */
export function PhiCountrySelectControl({
  id,
  value,
  placeholder,
  ariaLabel,
  disabled,
  readOnly,
  allowClear,
  size,
  getPopupContainer,
  style,
  onBlur,
  onChange,
}: PhiCountrySelectControlProps) {
  const locale = usePhiIntlLocale();
  const options = useMemo(() => listPhiCountryOptions(locale), [locale]);
  return (
    <PhiSelectControl<string>
      id={id}
      value={value && options.some((option) => option.value === value) ? value : undefined}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      disabled={disabled}
      readOnly={readOnly}
      allowClear={allowClear}
      size={size}
      getPopupContainer={getPopupContainer}
      options={options}
      style={style ?? { width: "100%" }}
      onBlur={onBlur}
      onChange={(next) => onChange(typeof next === "string" && next ? next : null)}
    />
  );
}
