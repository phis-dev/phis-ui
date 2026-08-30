import { PHI_ASSET_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/asset/ids";
import type { PhiFormFieldTypeProviderDescriptor } from "../../types/form-descriptor";
import { createPhiSharedFormProviderKey } from "../forms/form-provider-contract";

export const PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_KEY = createPhiSharedFormProviderKey(
  "field",
  "asset-focal-rect",
);

export const PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR = {
  key: PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_KEY,
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  title: "Asset focal rectangle",
  description: "Edits one transient focal rectangle as an atomic Form value.",
  valueType: "json",
  presentation: "hidden",
} satisfies PhiFormFieldTypeProviderDescriptor;
