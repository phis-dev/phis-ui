"use client";

import dynamic from "next/dynamic";

import type { PhiRuntimeModuleUiProviderClientDefinition } from "../../../components/runtime/runtime-module-ui-provider-client-manifest";
import { PHI_BILLING_RUNTIME_MODULE_ID } from "./ids";

/** The Billing Module's Form field registry (its next-number field), loaded where a node of the Module renders. */
export const PHI_BILLING_RUNTIME_MODULE_UI_PROVIDER_CLIENT_DEFINITION = {
  moduleId: PHI_BILLING_RUNTIME_MODULE_ID,
  Provider: dynamic(() => import("./form-ui-provider").then((module) => module.PhiBillingFormUiProvider)),
} satisfies PhiRuntimeModuleUiProviderClientDefinition;
