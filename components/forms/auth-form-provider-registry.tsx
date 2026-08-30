"use client";

import { PhiCheckboxControl } from "../controls/phi-checkbox-control";
import { PhiLink } from "../navigation/phi-link";
import {
  PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
} from "./form-provider-contract";
import { createPhiFormProviderRegistry } from "./form-provider-registry";

export const PHI_AUTH_FORM_PROVIDER_REGISTRY = createPhiFormProviderRegistry({
  fieldTypes: [{
    ...PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[0],
    valuePropName: "checked",
    Control: ({ field, checked, onChange, disabled }) => {
      const before = typeof field.config?.before === "string" ? field.config.before : "";
      const linkLabel = typeof field.config?.linkLabel === "string"
        ? field.config.linkLabel
        : "Terms & Conditions";
      const after = typeof field.config?.after === "string" ? field.config.after : "";
      const href = typeof field.config?.href === "string" ? field.config.href : "/terms-and-conditions";

      return (
        <PhiCheckboxControl
          checked={checked}
          disabled={disabled}
          label={(
            <span>
              {before}
              <PhiLink href={href}>{linkLabel}</PhiLink>
              {after}
            </span>
          )}
          onChange={(nextChecked) => onChange?.(nextChecked)}
        />
      );
    },
  }],
});
