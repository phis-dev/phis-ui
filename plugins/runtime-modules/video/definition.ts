import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_VIDEO_RUNTIME_MODULE_ID } from "./ids";
import { PHI_VIDEO_RUNTIME_MODULE_PROVIDERS } from "./providers";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";

/**
 * A Module of its own rather than two Core widgets, because what it owns is a list of companies.
 *
 * Core has no business knowing that Vimeo exists, and a Site that embeds nothing should not carry the
 * table. Making it a Module also makes the registry honest: the providers arrive through the same
 * contribution an add-on would use, so the first consumer of `videoProviders` is already a Module and not
 * a special case.
 *
 * Public and App. A video is as much at home in a help page behind a login as on a landing page, and
 * being signed in changes nothing about the question: § 25 is about the device, so an account is not a
 * consent to fetch somebody else's player ([design/CONSENT.md](../../../design/CONSENT.md), "Signed-in
 * Areas"). The placeholder is the same in both, which is the point of asking at the embed rather than at
 * a banner -- there is no per-Area surface to build and nothing stored that an Area would have to scope.
 */
export const PHI_VIDEO_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_VIDEO_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["public", "app"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "Video",
  description: "A video from somewhere else, fetched only once a visitor asks for it.",
  category: "media",
  icon: "antd:play-circle-outlined",
  videoProviders: PHI_VIDEO_RUNTIME_MODULE_PROVIDERS,
} satisfies PhiRuntimeModuleDefinition;
