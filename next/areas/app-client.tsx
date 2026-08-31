"use client";

import {
  PHI_APP_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_APP_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_APP_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_APP_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/app";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";
import {
  extendWithPhiSiteModuleClientManifests,
} from "../../plugins/runtime-modules/site-module-client-manifests";
import {
  PHI_NO_SITE_MODULE_CLIENT_CONTRIBUTIONS,
  type PhiSiteModuleClientContributions,
} from "../../plugins/runtime-modules/site-modules-client";

/**
 * The Area's Client boundary, given what this Site installed.
 *
 * Built once from the projection rather than looked up per render, and handed the first-party
 * manifests extended with the Site's own Modules. A Site that installed none gets them unchanged.
 */
export function createPhiAppRuntimeModuleClientBoundary(
  siteModules: PhiSiteModuleClientContributions = PHI_NO_SITE_MODULE_CLIENT_CONTRIBUTIONS,
) {
  const manifests = extendWithPhiSiteModuleClientManifests(siteModules, "app", {
    controller: PHI_APP_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
    render: PHI_APP_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
    dataProvider: PHI_APP_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
    calendarAdapter: PHI_APP_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  });

  return function PhiAppRuntimeModuleClientBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <PhiNextRuntimeModuleClientBoundary
        calendarAdapterManifest={manifests.calendarAdapter}
        controllerManifest={manifests.controller}
        dataProviderManifest={manifests.dataProvider}
        renderManifest={manifests.render}
      >
        {children}
      </PhiNextRuntimeModuleClientBoundary>
    );
  };
}

export const PhiAppRuntimeModuleClientBoundary = createPhiAppRuntimeModuleClientBoundary();
