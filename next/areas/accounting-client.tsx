"use client";

import {
  PHI_ACCOUNTING_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_ACCOUNTING_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_ACCOUNTING_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_ACCOUNTING_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/accounting";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";
import { phiSiteModuleClientManifests } from "../../plugins/runtime-modules/site-module-client-manifests";

/**
 * The first-party manifests plus whatever this Site installed, composed once rather than per
 * render. An installation without Modules of its own gets the first-party manifests unchanged.
 */
const PHI_ACCOUNTING_CLIENT_MANIFESTS = phiSiteModuleClientManifests("accounting", {
  controller: PHI_ACCOUNTING_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  render: PHI_ACCOUNTING_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
  dataProvider: PHI_ACCOUNTING_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  calendarAdapter: PHI_ACCOUNTING_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
});

export function PhiAccountingRuntimeModuleClientBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PhiNextRuntimeModuleClientBoundary
      controllerManifest={PHI_ACCOUNTING_CLIENT_MANIFESTS.controller}
      calendarAdapterManifest={PHI_ACCOUNTING_CLIENT_MANIFESTS.calendarAdapter}
      dataProviderManifest={PHI_ACCOUNTING_CLIENT_MANIFESTS.dataProvider}
      renderManifest={PHI_ACCOUNTING_CLIENT_MANIFESTS.render}
    >
      {children}
    </PhiNextRuntimeModuleClientBoundary>
  );
}
