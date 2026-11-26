"use client";

import type { ComponentType } from "react";

import { PhiColorFieldControl } from "../controls/phi-color-field-control";
import { readPhiColorFieldValue } from "./color-field";
import type { PhiFormFieldProviderProps } from "./form-provider-registry";

/**
 * The `color` field: one colour, chosen with the colour field the Builder's Inspector uses
 * (`PhiColorFieldControl`) -- its swatch, the Site's palette and Theme swatches, and the Theme roles they
 * store. The value is the Inspector field's (`readPhiColorFieldValue`), `null` for none; `config.allowClear`
 * lets it be emptied. Loaded only where one is rendered: the picker is code no other field needs.
 */
export const PhiColorFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  field, value, onChange, label, disabled, readOnly, size, getPopupContainer,
}) => (
  <PhiColorFieldControl
    size={size}
    ariaLabel={label}
    value={readPhiColorFieldValue(value)}
    disabled={disabled || readOnly}
    allowClear={field.config?.allowClear === true}
    storeThemeRoles
    getPopupContainer={getPopupContainer}
    onValueChange={(next) => onChange?.(next ?? null)}
  />
);
