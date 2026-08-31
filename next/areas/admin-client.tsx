"use client";

import {
  PHI_ADMIN_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_ADMIN_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_ADMIN_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_ADMIN_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/admin";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";
import { phiSiteModuleClientManifests } from "../../plugins/runtime-modules/site-module-client-manifests";

/**
 * The first-party manifests plus whatever this Site installed, composed once rather than per
 * render. An installation without Modules of its own gets the first-party manifests unchanged.
 */
const PHI_ADMIN_CLIENT_MANIFESTS = phiSiteModuleClientManifests("admin", {
  controller: PHI_ADMIN_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  render: PHI_ADMIN_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
  dataProvider: PHI_ADMIN_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  calendarAdapter: PHI_ADMIN_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
});

export function PhiAdminRuntimeModuleClientBoundary({ children }: { children: React.ReactNode }) {
  return (
    <PhiNextRuntimeModuleClientBoundary
      controllerManifest={PHI_ADMIN_CLIENT_MANIFESTS.controller}
      calendarAdapterManifest={PHI_ADMIN_CLIENT_MANIFESTS.calendarAdapter}
      dataProviderManifest={PHI_ADMIN_CLIENT_MANIFESTS.dataProvider}
      renderManifest={PHI_ADMIN_CLIENT_MANIFESTS.render}
    >
      {children}
    </PhiNextRuntimeModuleClientBoundary>
  );
}
