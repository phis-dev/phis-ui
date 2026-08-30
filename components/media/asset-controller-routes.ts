import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalRouteSet,
  type PhiSignalScope,
} from "../../types/signals";
import { createPhiAssetControllerAddress } from "./asset-controller-address";
import { PHI_ASSET_SIGNAL_CHANNELS } from "./asset-controller-signals";

/**
 * The signal routes a media picker emits towards the asset controller.
 *
 * It sits beside the address and the channels it builds on, because it is used by the asset Module,
 * by the builder Module and by two shared widget components -- so no single Module can own it.
 */
export function createPhiMediaPickerAssetControllerRoutes(
  routeKeyPrefix: string,
  scope: Extract<PhiSignalScope, "area" | "page">,
): PhiSignalRouteSet {
  const receiver = createPhiAssetControllerAddress();
  return {
    emits: [
      { routeKey: `${routeKeyPrefix}-kind`, capabilityId: "kind", scope, channel: PHI_ASSET_SIGNAL_CHANNELS.kind, action: "change", valueType: "string", receiver },
      { routeKey: `${routeKeyPrefix}-presentationFlags`, capabilityId: "presentationFlags", scope, channel: PHI_ASSET_SIGNAL_CHANNELS.presentationFlags, action: "change", valueType: "number[]", receiver },
      { routeKey: `${routeKeyPrefix}-query`, capabilityId: "query", scope, channel: PHI_ASSET_SIGNAL_CHANNELS.query, action: "change", valueType: "string", receiver },
      { routeKey: `${routeKeyPrefix}-path`, capabilityId: "path", scope, channel: PHI_ASSET_SIGNAL_CHANNELS.path, action: "change", valueType: "path", receiver },
      { routeKey: `${routeKeyPrefix}-reload`, capabilityId: "reload", scope, channel: PHI_ASSET_SIGNAL_CHANNELS.reload, action: "activate", valueType: "none", receiver },
      {
        routeKey: `${routeKeyPrefix}-pagination`,
        capabilityId: "pagination",
        scope,
        channel: PHI_ASSET_SIGNAL_CHANNELS.pagination,
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pagination,
        receiver,
      },
    ],
  };
}
