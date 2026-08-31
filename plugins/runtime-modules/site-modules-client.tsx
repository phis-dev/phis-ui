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
 * The client half of the seam a Site build replaces, and the counterpart to `site-modules.ts`.
 *
 * Split from the server half because these carry Client loaders and must cross the "use client"
 * boundary; a Site build resolves both, and a generated file exports the same names with the installed
 * Modules' loaders in place of the empty lists.
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

export const PHI_SITE_MODULE_CLIENT_CONTRIBUTIONS: PhiSiteModuleClientContributions = {
  areas: {},
  calendarAdapters: [],
};
