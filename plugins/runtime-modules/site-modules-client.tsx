"use client";

import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleRenderClientLoader } from "../../components/runtime/runtime-module-render-client-manifest";
import type {
  PhiRuntimeModuleCalendarAdapterClientDefinition,
  PhiRuntimeModuleDataProviderClientDefinition,
} from "../../types/cms-plugins";
import type { PhiRuntimeModuleAuthoringClientContribution } from "./authoring-contributions-client";
import type { PhiRuntimeModuleControllerClientAreaContribution } from "./area-contributions-controller-client";

/**
 * The Client counterpart to `site-modules.ts`, and the shape of the Client file `phis-cli` generates.
 *
 * Split from the Server half because these carry Client loaders and must cross the "use client"
 * boundary. Like the Server half it is passed to the Area host as a value, never imported from here by
 * the host itself.
 *
 * The shape follows what the first-party manifests actually do rather than what looks symmetrical.
 * Controllers, Render loaders, Data Providers, and Authoring contributions are composed per Area, so
 * they are held per Area here. Calendar adapters are not: every Area re-exports the same common
 * manifest, adapters are resolved by their type when a Widget renders, and giving them an Area
 * dimension would model a distinction the runtime does not make. If that ever changes it changes for
 * first-party Modules too, and the flat list becomes a per-Area one for both.
 */
export type PhiSiteModuleClientAreaContributions = {
  controllers?: readonly PhiRuntimeModuleControllerClientAreaContribution[];
  renderLoaders?: ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClientLoader]>;
  dataProviders?: readonly PhiRuntimeModuleDataProviderClientDefinition[];
  authoring?: readonly PhiRuntimeModuleAuthoringClientContribution[];
};

export type PhiSiteModuleClientContributions = {
  areas: Readonly<Partial<Record<PhiCmsAreaKey, PhiSiteModuleClientAreaContributions>>>;
  calendarAdapters: readonly PhiRuntimeModuleCalendarAdapterClientDefinition[];
};

/** A Site that installed no Modules of its own. */
export const PHI_NO_SITE_MODULE_CLIENT_CONTRIBUTIONS: PhiSiteModuleClientContributions = {
  areas: {},
  calendarAdapters: [],
};
