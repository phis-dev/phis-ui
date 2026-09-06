"use client";

import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import {
  extendPhiRuntimeModuleCalendarAdapterClientManifest,
  type PhiRuntimeModuleCalendarAdapterClientManifest,
} from "../../components/runtime/runtime-module-calendar-adapter-client-manifest";
import {
  extendPhiRuntimeModuleDataProviderClientManifest,
  type PhiRuntimeModuleDataProviderClientManifest,
} from "../../components/runtime/runtime-module-data-provider-client-manifest";
import {
  extendPhiRuntimeModuleRenderClientManifest,
  type PhiRuntimeModuleRenderClientManifest,
} from "../../components/runtime/runtime-module-render-client-manifest";
import type { PhiRuntimeModuleControllerClientManifest } from "../../components/runtime/runtime-module-controller-client-manifest";
import { extendPhiRuntimeModuleControllerClientManifest } from "./area-contributions-controller-client";
import type { PhiRuntimeModuleAuthoringClientContribution } from "./authoring-contributions-client";
import type {
  PhiSiteModuleClientAreaContributions,
  PhiSiteModuleClientContributions,
} from "./site-modules-client";

/**
 * Adding what a Site's own Modules contribute to the first-party Client manifests.
 *
 * Applied in the generic Area hosts, which is where a Site build's projection is meant to be consumed:
 * the Skeleton imports only those hosts, and neither it nor the individual first-party manifests learn
 * that Site Modules exist.
 *
 * Nothing is merged leniently. Every `extend...` refuses a key the first-party manifests already hold,
 * so a Site Module claiming a Widget type, Provider key, or Controller that is already taken fails
 * where it is composed rather than by quietly winning or quietly losing at render time.
 *
 * The projection is an argument throughout: the Area host receives it and passes it here.
 */

export type PhiSiteModuleClientManifests = {
  controller: PhiRuntimeModuleControllerClientManifest;
  render: PhiRuntimeModuleRenderClientManifest;
  dataProvider: PhiRuntimeModuleDataProviderClientManifest;
  calendarAdapter: PhiRuntimeModuleCalendarAdapterClientManifest;
};

export function readPhiSiteModuleClientAreaContributions(
  contributions: PhiSiteModuleClientContributions,
  area: PhiCmsAreaKey,
): PhiSiteModuleClientAreaContributions {
  return contributions.areas[area] ?? {};
}

export function extendWithPhiSiteModuleClientManifests(
  contributions: PhiSiteModuleClientContributions,
  area: PhiCmsAreaKey,
  base: PhiSiteModuleClientManifests,
): PhiSiteModuleClientManifests {
  const areaContributions = readPhiSiteModuleClientAreaContributions(contributions, area);
  return {
    controller: extendPhiRuntimeModuleControllerClientManifest(
      base.controller,
      areaContributions.controllers ?? [],
    ),
    render: extendPhiRuntimeModuleRenderClientManifest(
      base.render,
      areaContributions.renderLoaders ?? [],
    ),
    dataProvider: extendPhiRuntimeModuleDataProviderClientManifest(
      base.dataProvider,
      areaContributions.dataProviders ?? [],
    ),
    calendarAdapter: extendPhiRuntimeModuleCalendarAdapterClientManifest(
      base.calendarAdapter,
      contributions.calendarAdapters,
    ),
  };
}


/**
 * The Site's own Authoring contributions, for the Builder.
 *
 * One per Module and no Area dimension: the Builder wraps an Authoring Client around the canvas for
 * every active Module so a Module can be authored inside an isolated target-Area Canvas without being
 * mounted in the Builder Area itself. The projection already holds them that way, so this is a read
 * rather than a union across six Areas that only ever undid a placement.
 */
export function readAllPhiSiteModuleAuthoringClientContributions(
  contributions: PhiSiteModuleClientContributions,
): readonly PhiRuntimeModuleAuthoringClientContribution[] {
  return contributions.authoring;
}

