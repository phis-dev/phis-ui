import type { PhiRuntimeControllerRequirement } from "../../types/cms-plugins";
import { readPhiControllerSignalAddressParts, type PhiSignalRouteSet } from "../../types/signals";
import {
  PHI_ASSET_CONTROLLER_INSTANCE_KEY,
  PHI_ASSET_CONTROLLER_TYPE,
} from "./asset-controller-address";

/**
 * The Asset Controller, asked for by whatever hosts something that talks to it.
 *
 * The Asset Module mounts its Controller on demand: a Page without Media mounts nothing for it. So a
 * Widget that shows what the Controller keeps, or whose placement sends to it, says so through
 * `requiredRuntimeControllers`, and the Page or Area the Widget stands in mounts the Controller with it
 * (MODULES.md, "Activation"). It sits beside the address it names, because the Widgets are the Asset
 * Module's own and a Core one -- no one Module could own it.
 *
 * A media picker opened from authoring chrome -- the canvas' image tool and mask picker, the Inspector's
 * image fields and Backgrounds, the Theme's Logo and Background -- is not among them. It keeps its own
 * search, folder and page and sends the Controller nothing, so its host asks for nothing.
 */
const PHI_ASSET_CONTROLLER_REQUIREMENT = {
  type: PHI_ASSET_CONTROLLER_TYPE,
  instanceKey: PHI_ASSET_CONTROLLER_INSTANCE_KEY,
  enabled: true,
} as const satisfies PhiRuntimeControllerRequirement;

/** For a Widget that draws the Controller's state: wherever it is placed, the Controller is there. */
export function requirePhiAssetController(): readonly PhiRuntimeControllerRequirement[] {
  return [PHI_ASSET_CONTROLLER_REQUIREMENT];
}

/**
 * For a Widget whose placement decides whom it tells: the Asset Controller instances its emit routes
 * name, and nothing where they name none. A Gallery that only lists the library asks for no Controller.
 */
export function resolvePhiAssetControllerRouteRequirements(
  signalRoutes: PhiSignalRouteSet | null | undefined,
): PhiRuntimeControllerRequirement[] {
  const requirements = new Map<string, PhiRuntimeControllerRequirement>();
  for (const route of signalRoutes?.emits ?? []) {
    const parts = readPhiControllerSignalAddressParts(route.receiver);
    if (!parts || parts.type !== PHI_ASSET_CONTROLLER_TYPE) continue;
    requirements.set(parts.instanceKey, {
      type: parts.type,
      instanceKey: parts.instanceKey,
      enabled: true,
    });
  }
  return [...requirements.values()];
}
