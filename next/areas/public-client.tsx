"use client";

import {
  PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_PUBLIC_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_PUBLIC_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_PUBLIC_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/public";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";
import { phiSiteModuleClientManifests } from "../../plugins/runtime-modules/site-module-client-manifests";

/**
 * The first-party manifests plus whatever this Site installed, composed once rather than per
 * render. An installation without Modules of its own gets the first-party manifests unchanged.
 */
const PHI_PUBLIC_CLIENT_MANIFESTS = phiSiteModuleClientManifests("public", {
  controller: PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  render: PHI_PUBLIC_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
  dataProvider: PHI_PUBLIC_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  calendarAdapter: PHI_PUBLIC_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
});

export function PhiPublicRuntimeModuleClientBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PhiNextRuntimeModuleClientBoundary
      controllerManifest={PHI_PUBLIC_CLIENT_MANIFESTS.controller}
      calendarAdapterManifest={PHI_PUBLIC_CLIENT_MANIFESTS.calendarAdapter}
      dataProviderManifest={PHI_PUBLIC_CLIENT_MANIFESTS.dataProvider}
      renderManifest={PHI_PUBLIC_CLIENT_MANIFESTS.render}
    >
      {children}
    </PhiNextRuntimeModuleClientBoundary>
  );
}
