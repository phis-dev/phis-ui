"use client";

import { useEffect, useState, type ComponentType } from "react";

import { isPhiCmsAreaKey, type PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiTreeOption } from "../../types/tree";
import type { PhiPageReferenceSelection } from "../widgets/client/shared/phi-page-reference-picker";
import { PhiLinkTargetControl } from "../widgets/client/shared/phi-link-target-control";
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

type PageOptions = PhiTreeOption<PhiPageReferenceSelection>[];

/*
 * One request per Area for as long as the page lives: the create and the edit dialog offer the same
 * Pages, and a list that changed meanwhile is a Page somebody published while this one was being written.
 * A failed request is forgotten, so the next dialog asks again.
 */
const pageOptionsByArea = new Map<PhiCmsAreaKey, Promise<PageOptions>>();

function loadPageOptions(area: PhiCmsAreaKey): Promise<PageOptions> {
  const cached = pageOptionsByArea.get(area);
  if (cached) return cached;
  const request = (async () => {
    const response = await fetch(`/api/site/page-references?area=${encodeURIComponent(area)}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    const payload = (await response.json().catch(() => null)) as { options?: unknown } | null;
    if (!response.ok || !Array.isArray(payload?.options)) {
      throw new Error(`Page references for "${area}" answered ${response.status}.`);
    }
    return payload.options as PageOptions;
  })();
  pageOptionsByArea.set(area, request);
  request.catch(() => pageOptionsByArea.delete(area));
  return request;
}

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
  const [options, setOptions] = useState<PageOptions>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    loadPageOptions(area).then(
      (next) => {
        if (current) {
          setOptions(next);
          setFailed(false);
        }
      },
      (error: unknown) => {
        console.warn("[phi-form] Page references could not be loaded.", { area, error });
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [area]);

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
