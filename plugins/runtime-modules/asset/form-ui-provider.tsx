"use client";

import type { ReactNode } from "react";

import { createPhiFormProviderRegistry, PhiFormProviderRegistryProvider } from "../../../components/forms/form-provider-registry";
import { PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR } from "./form-providers";

const PHI_ASSET_FORM_PROVIDER_REGISTRY = createPhiFormProviderRegistry({
  fieldTypes: [{
    ...PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR,
    Control: () => null,
  }],
});

export function PhiAssetFormUiProvider({ children }: { children: ReactNode }) {
  return (
    <PhiFormProviderRegistryProvider registry={PHI_ASSET_FORM_PROVIDER_REGISTRY}>
      {children}
    </PhiFormProviderRegistryProvider>
  );
}
