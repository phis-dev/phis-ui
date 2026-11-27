"use client";

import type { ReactNode } from "react";

import { lazyPhiFormFieldControl } from "../../../components/forms/lazy-form-field-control";
import { createPhiFormProviderRegistry, PhiFormProviderRegistryProvider } from "../../../components/forms/form-provider-registry";
import { PHI_BILLING_NEXT_NUMBER_FORM_PROVIDER_DESCRIPTOR } from "./form-providers";

const PhiLazyBillingNextNumberFormControl = lazyPhiFormFieldControl(() =>
  import("./next-number-form-control").then((module) => module.PhiBillingNextNumberFormControl));

// Exported for the field size contract (`plugins/runtime-modules/form-field-size.test.tsx`), which renders every field.
export const PHI_BILLING_FORM_PROVIDER_REGISTRY = createPhiFormProviderRegistry({
  fieldTypes: [
    {
      ...PHI_BILLING_NEXT_NUMBER_FORM_PROVIDER_DESCRIPTOR,
      Control: PhiLazyBillingNextNumberFormControl,
    },
  ],
});

export function PhiBillingFormUiProvider({ children }: { children: ReactNode }) {
  return (
    <PhiFormProviderRegistryProvider registry={PHI_BILLING_FORM_PROVIDER_REGISTRY}>
      {children}
    </PhiFormProviderRegistryProvider>
  );
}
