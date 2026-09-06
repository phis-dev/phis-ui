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
 * Controllers, Render loaders and Data Providers are composed per Area, so they are held per Area
 * here. Two things are not.
 *
 * Calendar adapters, because every Area re-exports the same common manifest and adapters resolve by
 * their type when a Widget renders; an Area dimension would model a distinction the runtime does not
 * make. And Authoring contributions, because they belong to the Builder rather than to an Area: it
 * wraps one around the canvas for every active Module, whichever Area is being edited. They used to
 * be placed into each eligible Area and read back as a union across all of them, which stored a
 * Module three times to answer one question and let the first Area seen decide if the three ever
 * differed.
 *
 * If either ever becomes Area-scoped it becomes so for first-party Modules too, and the flat list
 * becomes a per-Area one for both.
 */
export type PhiSiteModuleClientAreaContributions = {
  controllers?: readonly PhiRuntimeModuleControllerClientAreaContribution[];
  renderLoaders?: ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClientLoader]>;
  dataProviders?: readonly PhiRuntimeModuleDataProviderClientDefinition[];
};

export type PhiSiteModuleClientContributions = {
  areas: Readonly<Partial<Record<PhiCmsAreaKey, PhiSiteModuleClientAreaContributions>>>;
  calendarAdapters: readonly PhiRuntimeModuleCalendarAdapterClientDefinition[];
  /** One per Module, for the Builder. No Area reads these. */
  authoring: readonly PhiRuntimeModuleAuthoringClientContribution[];
};

/** A Site that installed no Modules of its own. */
export const PHI_NO_SITE_MODULE_CLIENT_CONTRIBUTIONS: PhiSiteModuleClientContributions = {
  areas: {},
  calendarAdapters: [],
  authoring: [],
};
