"use client";

import type { ComponentType } from "react";

import { isPhiCmsAreaKey, type PhiCmsAreaKey } from "../../constants/cms-areas";
import { PhiLinkTargetControl } from "../widgets/client/shared/phi-link-target-control";
import { usePhiPageReferenceOptions } from "../widgets/client/shared/use-page-reference-options";
import type { PhiFormFieldProviderProps } from "./form-provider-registry";
import { PHI_FORM_LINK_TARGET_LABEL_KEYS } from "./form-provider-contract";

const DEFAULT_LABELS = {
  none: "None",
  page: "Page",
  external: "Address",
  pagePlaceholder: "Select a Page",
  externalPlaceholder: "https://example.com",
  newTab: "Open in a new tab",
  pagesUnavailable: "The Pages could not be loaded.",
} as const;

/**
 * The `link-target` field: one link, to a Page of an Area or to an address elsewhere (`FORMS.md`).
 *
 * `config.area` names the Area whose Pages are offered and is written into every Page target, because a
 * Form usually stands somewhere else than the link leads -- an Editor Form linking a Public Page. The
 * value is the `PhiLinkTarget` itself, or `null` for no link, so a save that removes one says so.
 */
export const PhiLinkTargetFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  field,
  value,
  labels,
  disabled,
  readOnly,
  onChange,
}) => {
  const area: PhiCmsAreaKey = isPhiCmsAreaKey(field.config?.area) ? field.config.area : "public";
  const { options, failed } = usePhiPageReferenceOptions(area, "phi-form");

  const read = (key: string, fallback: string) => labels?.[key]?.trim() || fallback;
  const controlLabels = {
    none: read(PHI_FORM_LINK_TARGET_LABEL_KEYS.none, DEFAULT_LABELS.none),
    page: read(PHI_FORM_LINK_TARGET_LABEL_KEYS.page, DEFAULT_LABELS.page),
    external: read(PHI_FORM_LINK_TARGET_LABEL_KEYS.external, DEFAULT_LABELS.external),
    // The refusal stands where the Pages would, rather than an empty list that looks like a Site without any.
    pagePlaceholder: failed
      ? read(PHI_FORM_LINK_TARGET_LABEL_KEYS.pagesUnavailable, DEFAULT_LABELS.pagesUnavailable)
      : read(PHI_FORM_LINK_TARGET_LABEL_KEYS.pagePlaceholder, DEFAULT_LABELS.pagePlaceholder),
    externalPlaceholder: read(PHI_FORM_LINK_TARGET_LABEL_KEYS.externalPlaceholder, DEFAULT_LABELS.externalPlaceholder),
    newTab: read(PHI_FORM_LINK_TARGET_LABEL_KEYS.newTab, DEFAULT_LABELS.newTab),
  };

  return (
    <PhiLinkTargetControl
      value={value}
      options={options}
      labels={controlLabels}
      area={area}
      disabled={disabled || readOnly}
      onChange={onChange ? (next) => onChange(next ?? null) : undefined}
    />
  );
};
