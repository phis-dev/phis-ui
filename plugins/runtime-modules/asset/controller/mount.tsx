"use client";

import { usePhiAssetRuntimeController } from "./runtime";
import type { PhiAssetRuntimeControllerConfig } from "./definition";
import type { PhiRuntimeControllerMountScope, PhiSignalAddress } from "../../../../types";

export function PhiAssetRuntimeControllerMount({
  address,
  mountScope,
  config,
}: {
  address: PhiSignalAddress;
  mountScope: PhiRuntimeControllerMountScope;
  config: PhiAssetRuntimeControllerConfig;
}) {
  usePhiAssetRuntimeController({ address, mountScope, config });

  return null;
}
