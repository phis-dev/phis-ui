"use client";

import {
  PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  PHI_BUILDER_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
} from "../../plugins/runtime-modules/client-manifests/builder";
import { PhiNextRuntimeModuleClientBoundary } from "../runtime-module-client-boundary";
import {
  phiSiteModuleAuthoringClientManifest,
  phiSiteModuleClientManifests,
} from "../../plugins/runtime-modules/site-module-client-manifests";
import { PHI_BUILDER_TARGET_RUNTIME_MODULE_AUTHORING_CLIENT_MANIFEST } from "../../plugins/runtime-modules/client-manifests/builder-authoring";

/**
 * The first-party manifests plus whatever this Site installed, composed once rather than per
 * render. An installation without Modules of its own gets the first-party manifests unchanged.
 */
/**
 * The Builder authors every Area's Modules, so it receives the Site's complete Authoring union rather
 * than one Area's slice.
 */
const PHI_BUILDER_AUTHORING_CLIENT_MANIFEST = phiSiteModuleAuthoringClientManifest(
  PHI_BUILDER_TARGET_RUNTIME_MODULE_AUTHORING_CLIENT_MANIFEST,
);

const PHI_BUILDER_CLIENT_MANIFESTS = phiSiteModuleClientManifests("builder", {
  controller: PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_MANIFEST,
  render: PHI_BUILDER_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST,
  dataProvider: PHI_BUILDER_RUNTIME_MODULE_DATA_PROVIDER_CLIENT_MANIFEST,
  calendarAdapter: PHI_BUILDER_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST,
});

export function PhiBuilderRuntimeModuleClientBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PhiNextRuntimeModuleClientBoundary
      authoringManifest={PHI_BUILDER_AUTHORING_CLIENT_MANIFEST}
      calendarAdapterManifest={PHI_BUILDER_CLIENT_MANIFESTS.calendarAdapter}
      controllerManifest={PHI_BUILDER_CLIENT_MANIFESTS.controller}
      dataProviderManifest={PHI_BUILDER_CLIENT_MANIFESTS.dataProvider}
      renderManifest={PHI_BUILDER_CLIENT_MANIFESTS.render}
    >
      {children}
    </PhiNextRuntimeModuleClientBoundary>
  );
}
