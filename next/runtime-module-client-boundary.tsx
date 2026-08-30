"use client";

import type { PhiRuntimeModuleControllerClientManifest } from "../components/runtime/runtime-module-controller-client-manifest";
import { PhiRuntimeModuleControllerClientManifestProvider } from "../components/runtime/runtime-module-controller-client-manifest";
import type { PhiRuntimeModuleRenderClientManifest } from "../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeModuleRenderClientManifestProvider } from "../components/runtime/runtime-module-render-client-manifest";
import type { PhiRuntimeModuleDataProviderClientManifest } from "../components/runtime/runtime-module-data-provider-client-manifest";
import { PhiRuntimeModuleDataProviderClientManifestProvider } from "../components/runtime/runtime-module-data-provider-client-manifest";
import type { PhiRuntimeModuleAuthoringClientManifest } from "../components/runtime/runtime-module-authoring-client-manifest";
import { PhiRuntimeModuleAuthoringClientManifestProvider } from "../components/runtime/runtime-module-authoring-client-manifest";
import type { PhiRuntimeModuleCalendarAdapterClientManifest } from "../components/runtime/runtime-module-calendar-adapter-client-manifest";
import { PhiRuntimeModuleCalendarAdapterClientManifestProvider } from "../components/runtime/runtime-module-calendar-adapter-client-manifest";

export function PhiNextRuntimeModuleClientBoundary({
  children,
  controllerManifest,
  renderManifest,
  dataProviderManifest,
  authoringManifest,
  calendarAdapterManifest,
}: {
  children: React.ReactNode;
  controllerManifest: PhiRuntimeModuleControllerClientManifest;
  renderManifest: PhiRuntimeModuleRenderClientManifest;
  dataProviderManifest: PhiRuntimeModuleDataProviderClientManifest;
  authoringManifest?: PhiRuntimeModuleAuthoringClientManifest;
  calendarAdapterManifest?: PhiRuntimeModuleCalendarAdapterClientManifest;
}) {
  const content = authoringManifest ? (
    <PhiRuntimeModuleAuthoringClientManifestProvider manifest={authoringManifest}>
      {children}
    </PhiRuntimeModuleAuthoringClientManifestProvider>
  ) : children;

  return (
    <PhiRuntimeModuleControllerClientManifestProvider manifest={controllerManifest}>
      <PhiRuntimeModuleRenderClientManifestProvider manifest={renderManifest}>
        <PhiRuntimeModuleCalendarAdapterClientManifestProvider manifest={calendarAdapterManifest}>
          <PhiRuntimeModuleDataProviderClientManifestProvider manifest={dataProviderManifest}>
            {content}
          </PhiRuntimeModuleDataProviderClientManifestProvider>
        </PhiRuntimeModuleCalendarAdapterClientManifestProvider>
      </PhiRuntimeModuleRenderClientManifestProvider>
    </PhiRuntimeModuleControllerClientManifestProvider>
  );
}
