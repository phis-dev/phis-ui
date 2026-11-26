"use client";

import type { ComponentType } from "react";

import { PhiMultiSelectControl } from "../controls/phi-multi-select-control";
import { PhiSegmentedControl } from "../controls/phi-segmented-control";
import { PhiSelectControl } from "../controls/phi-select-control";
import type { PhiFormFieldProviderProps } from "./form-provider-registry";

/*
 * The choice fields, loaded only where one is rendered.
 *
 * They were held in the registry itself as fields nearly every form has, but the form a visitor meets
 * first is the sign-in, which has none: the Select alone brought the select and virtual-list code to
 * every Landing that offers a login. A form with a choice field pays one chunk when it renders.
 */

/*
 * `config.allowCustom`: a typed value beside the options -- a name that is either one already in use or
 * a new one (the CDN upload's Name). The select then takes what is typed, offering the options as it does.
 */
export const PhiSelectFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  id, field, value, onChange, options, placeholder, disabled, readOnly, onSearch, filterOptionsLocally, size,
  getPopupContainer,
}) => (
  <PhiSelectControl
    size={size}
    getPopupContainer={getPopupContainer}
    id={id}
    value={typeof value === "string" ? value : undefined}
    placeholder={placeholder}
    {...(field.config?.allowCustom === true ? { presentation: "autocomplete", allowCustom: true } as const : {})}
    allowClear={field.config?.allowClear === true}
    disabled={disabled}
    readOnly={readOnly}
    options={options ?? []}
    onSearch={onSearch}
    filterOptionsLocally={filterOptionsLocally}
    onChange={(nextValue) => onChange?.(nextValue)}
    style={{ width: "100%" }}
  />
);

export const PhiMultiSelectFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  id, field, value, onChange, options, placeholder, disabled, readOnly, size, getPopupContainer,
}) => (
  <PhiMultiSelectControl
    size={size}
    getPopupContainer={getPopupContainer}
    id={id}
    value={Array.isArray(value) ? value.map(String) : []}
    placeholder={placeholder}
    allowCustom={field.config?.allowCustom === true}
    disabled={disabled}
    readOnly={readOnly}
    options={options ?? []}
    style={{ width: "100%" }}
    onChange={(nextValue) => onChange?.(nextValue)}
  />
);

export const PhiSegmentedFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  value, onChange, options, disabled, readOnly, size,
}) => (
  <PhiSegmentedControl
    size={size}
    value={typeof value === "string" ? value : undefined}
    disabled={disabled}
    readOnly={readOnly}
    options={options ?? []}
    block
    onChange={(nextValue) => onChange?.(nextValue)}
  />
);
