"use client";

import {
  PHI_EDITOR_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_EDITOR_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_EDITOR_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_EDITOR_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/editor";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";

export function PhiEditorRuntimeModuleClientBoundary({ children }: { children: React.ReactNode }) {
  return (
    <PhiNextRuntimeModuleClientBoundary
      controllerManifest={PHI_EDITOR_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST}
      calendarAdapterManifest={PHI_EDITOR_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST}
      dataProviderManifest={PHI_EDITOR_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST}
      renderManifest={PHI_EDITOR_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST}
    >
      {children}
    </PhiNextRuntimeModuleClientBoundary>
  );
}
