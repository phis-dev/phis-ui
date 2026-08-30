"use client";

import {
  PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/builder";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";
import { PHI_BUILDER_TARGET_RUNTIME_MODULE_AUTHORING_CLIENT_MANIFEST } from "../../plugins/runtime-modules/client-manifests/builder-authoring";

export function PhiBuilderRuntimeModuleClientBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PhiNextRuntimeModuleClientBoundary
      authoringManifest={PHI_BUILDER_TARGET_RUNTIME_MODULE_AUTHORING_CLIENT_MANIFEST}
      calendarAdapterManifest={PHI_BUILDER_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST}
      controllerManifest={PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST}
      dataProviderManifest={PHI_BUILDER_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST}
      renderManifest={PHI_BUILDER_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST}
    >
      {children}
    </PhiNextRuntimeModuleClientBoundary>
  );
}
