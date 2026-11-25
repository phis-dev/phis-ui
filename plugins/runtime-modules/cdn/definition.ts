import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_CDN_RUNTIME_MODULE_IDENTITY } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_CDN_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";

/**
 * The Site's CDN on the Admin page `CDN`: what is published, uploads, withdrawing and deleting, and the
 * check of the bucket against the catalogue.
 *
 * Off by default and in no Area's default list: a Site switches it on in the Admin Area once its
 * operator attached a CDN (`phis cdn attach`). It is bound to Core alone, like the other Core Modules;
 * a Site without a CDN gets the page with the sentence that says how one is attached, rather than a
 * Module it cannot choose -- whether a Site has one is per Site, and the Module catalogue is not.
 */
export const PHI_CDN_RUNTIME_MODULE_DEFINITION = {
  ...PHI_CDN_RUNTIME_MODULE_IDENTITY,
  kind: "module",
  eligibleAreas: ["admin"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "CDN",
  description: "Files published once and served from the Site's CDN host.",
  category: "foundation",
  iconFamily: "cdn",
  dataProviders: PHI_CDN_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
