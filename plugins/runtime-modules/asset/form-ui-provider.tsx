"use client";

import type { ReactNode } from "react";

import { lazyPhiFormFieldControl } from "../../../components/forms/lazy-form-field-control";
import { createPhiFormProviderRegistry, PhiFormProviderRegistryProvider } from "../../../components/forms/form-provider-registry";
import {
  PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR,
  PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR,
} from "./form-providers";

// Loaded when a `media-asset` field first renders: the picker and the Media library binding stay out of
// every other Form.
const PhiLazyMediaAssetFormControl = lazyPhiFormFieldControl(() =>
  import("./media-asset-form-control").then((module) => module.PhiMediaAssetFormControl));

const PHI_ASSET_FORM_PROVIDER_REGISTRY = createPhiFormProviderRegistry({
  fieldTypes: [
    {
      ...PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR,
      Control: () => null,
    },
    {
      ...PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR,
      Control: PhiLazyMediaAssetFormControl,
    },
  ],
});

export function PhiAssetFormUiProvider({ children }: { children: ReactNode }) {
  return (
    <PhiFormProviderRegistryProvider registry={PHI_ASSET_FORM_PROVIDER_REGISTRY}>
      {children}
    </PhiFormProviderRegistryProvider>
  );
}
