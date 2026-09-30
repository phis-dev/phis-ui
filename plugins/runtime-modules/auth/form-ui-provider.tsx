"use client";

import type { ReactNode } from "react";

import { PHI_AUTH_FORM_PROVIDER_REGISTRY } from "./form-provider-registry";
import { PhiFormProviderRegistryProvider } from "../../../components/forms/form-provider-registry";

export function PhiAuthFormUiProvider({ children }: { children: ReactNode }) {
  return (
    <PhiFormProviderRegistryProvider registry={PHI_AUTH_FORM_PROVIDER_REGISTRY}>
      {children}
    </PhiFormProviderRegistryProvider>
  );
}
