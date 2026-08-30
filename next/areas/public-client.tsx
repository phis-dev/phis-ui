"use client";

import {
  PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_PUBLIC_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_PUBLIC_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_PUBLIC_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/public";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";

export function PhiPublicRuntimeModuleClientBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PhiNextRuntimeModuleClientBoundary
      controllerManifest={PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST}
      calendarAdapterManifest={PHI_PUBLIC_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST}
      dataProviderManifest={PHI_PUBLIC_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST}
      renderManifest={PHI_PUBLIC_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST}
    >
      {children}
    </PhiNextRuntimeModuleClientBoundary>
  );
}
