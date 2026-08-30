"use client";

import { usePhiAssetRuntimeController } from "./phi-media-scope-controller";
import type { PhiRuntimeControllerMountScope } from "../../types";

export function PhiAssetRuntimeControllerMount({
  mountScope,
}: {
  mountScope: PhiRuntimeControllerMountScope;
}) {
  usePhiAssetRuntimeController(mountScope);

  return null;
}
