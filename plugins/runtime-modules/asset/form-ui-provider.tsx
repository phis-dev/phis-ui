"use client";

import type { ReactNode } from "react";

import { lazyPhiFormFieldControl } from "../../../components/forms/lazy-form-field-control";
import { createPhiFormProviderRegistry, PhiFormProviderRegistryProvider } from "../../../components/forms/form-provider-registry";
import {
  PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR,
  PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR,
  PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR,
} from "./form-providers";

// Loaded when a `media-asset` field first renders: the picker and the Media library binding stay out of
// every other Form.
const PhiLazyMediaAssetFormControl = lazyPhiFormFieldControl(() =>
  import("./media-asset-form-control").then((module) => module.PhiMediaAssetFormControl));
// Loaded when a `media-assets` field first renders, on the same terms.
const PhiLazyMediaAssetsFormControl = lazyPhiFormFieldControl(() =>
  import("./media-assets-form-control").then((module) => module.PhiMediaAssetsFormControl));

// Exported for the field size contract (`plugins/runtime-modules/form-field-size.test.tsx`), which renders every field.
export const PHI_ASSET_FORM_PROVIDER_REGISTRY = createPhiFormProviderRegistry({
  fieldTypes: [
    {
      ...PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR,
      Control: () => null,
    },
    {
      ...PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR,
      Control: PhiLazyMediaAssetFormControl,
    },
    {
      ...PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR,
      Control: PhiLazyMediaAssetsFormControl,
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
