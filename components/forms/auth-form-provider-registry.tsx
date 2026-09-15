"use client";

import { PhiCheckboxControl } from "../controls/phi-checkbox-control";
import { PhiLink } from "../navigation/phi-link";
import {
  PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
} from "./form-provider-contract";
import { resolvePhiFormText } from "./form-descriptor-contract";
import { createPhiFormProviderRegistry } from "./form-provider-registry";
import type { PhiFormTextDescriptor } from "../../types/form-descriptor";

function readText(value: unknown): PhiFormTextDescriptor | null {
  return value && typeof value === "object" && "kind" in value
    ? value as PhiFormTextDescriptor
    : null;
}

export const PHI_AUTH_FORM_PROVIDER_REGISTRY = createPhiFormProviderRegistry({
  fieldTypes: [{
    ...PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[0],
    valuePropName: "checked",
    /*
     * One sentence with one link in it, and the link's place inside the sentence is the translator's
     * to decide -- which is why the wording is a single label with a `%1` marker rather than a
     * before/after pair. The target comes from the Widget's config, because it is the placement that
     * knows which Area's terms these are and in which language's path they live.
     */
    Control: ({ field, checked, onChange, disabled, labels, formConfig }) => {
      const text = readText(field.config?.text);
      const linkLabel = readText(field.config?.linkLabel);
      const href = readText(field.config?.href);
      const sentence = text ? resolvePhiFormText(text, labels, formConfig) : "%1";
      const resolvedLinkLabel = linkLabel
        ? resolvePhiFormText(linkLabel, labels, formConfig)
        : "Terms & Conditions";
      const resolvedHref = href
        ? resolvePhiFormText(href, labels, formConfig)
        : "/terms-and-conditions";
      const [before, after] = sentence.split("%1");

      return (
        <PhiCheckboxControl
          checked={checked}
          disabled={disabled}
          label={(
            <span>
              {before}
              <PhiLink href={resolvedHref}>{resolvedLinkLabel}</PhiLink>
              {after ?? ""}
            </span>
          )}
          onChange={(nextChecked) => onChange?.(nextChecked)}
        />
      );
    },
  }],
});
