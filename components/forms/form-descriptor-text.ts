import { PHI_FORM_VALIDATION_PROVIDER_KEYS } from "./form-provider-contract";

/**
 * The two words every Module's Form descriptor writes a hundred times: a translated label, and the
 * `required` rule carrying one. Fourteen Modules each declared these two lines for themselves.
 */
export function phiFormLabel(key: string, fallback: string) {
  return { kind: "label", key, fallback } as const;
}

export function phiFormRequired(key: string, fallback: string) {
  return [{
    providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
    message: phiFormLabel(key, fallback),
  }] as const;
}
