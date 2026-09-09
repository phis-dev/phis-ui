"use client";

import {
  PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/builder";
import { PHI_BUILDER_TARGET_RUNTIME_MODULE_AUTHORING_CLIENT_MANIFEST } from "../../plugins/runtime-modules/client-manifests/builder-authoring";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";
import {
  extendWithPhiSiteModuleClientManifests,
  readAllPhiSiteModuleAuthoringClientContributions,
} from "../../plugins/runtime-modules/site-module-client-manifests";
import {
  PHI_NO_SITE_MODULE_CLIENT_CONTRIBUTIONS,
  type PhiSiteModuleClientContributions,
} from "../../plugins/runtime-modules/site-modules-client";
import {
  PHI_NO_SITE_MODULE_AUTHORING_CONTRIBUTIONS,
  type PhiSiteModuleAuthoringContributions,
} from "../../plugins/runtime-modules/site-modules-authoring-client";
import { extendPhiRuntimeModuleAuthoringClientManifest } from "../../plugins/runtime-modules/authoring-contributions-client";

/**
 * The Area's Client boundary, given what this Site installed.
 *
 * Built once from the projection rather than looked up per render, and handed the first-party
 * manifests extended with the Site's own Modules. A Site that installed none gets them unchanged.
 *
 * The Builder is the only Area host that takes a second projection. Authoring contributions arrive
 * from their own generated file, so that the file carrying Builder implementations is imported here
 * and nowhere else -- see `site-modules-authoring-client.tsx`.
 */
export function createPhiBuilderRuntimeModuleClientBoundary(
  siteModules: PhiSiteModuleClientContributions = PHI_NO_SITE_MODULE_CLIENT_CONTRIBUTIONS,
  siteModuleAuthoring: PhiSiteModuleAuthoringContributions = PHI_NO_SITE_MODULE_AUTHORING_CONTRIBUTIONS,
) {
  const manifests = extendWithPhiSiteModuleClientManifests(siteModules, "builder", {
    controller: PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
    render: PHI_BUILDER_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
    dataProvider: PHI_BUILDER_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
    calendarAdapter: PHI_BUILDER_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  });
  // The Builder authors every Area, so it receives the complete installed Authoring union.
  const authoringManifest = extendPhiRuntimeModuleAuthoringClientManifest(
    PHI_BUILDER_TARGET_RUNTIME_MODULE_AUTHORING_CLIENT_MANIFEST,
    readAllPhiSiteModuleAuthoringClientContributions(siteModuleAuthoring),
  );

  return function PhiBuilderRuntimeModuleClientBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <PhiNextRuntimeModuleClientBoundary
        authoringManifest={authoringManifest}
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

export const PhiBuilderRuntimeModuleClientBoundary = createPhiBuilderRuntimeModuleClientBoundary();
