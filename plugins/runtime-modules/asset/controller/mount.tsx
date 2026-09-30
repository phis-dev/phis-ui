"use client";

import { usePhiAssetRuntimeController } from "./runtime";
import type { PhiRuntimeControllerMountScope } from "../../../../types";

export function PhiAssetRuntimeControllerMount({
  mountScope,
}: {
  mountScope: PhiRuntimeControllerMountScope;
}) {
  usePhiAssetRuntimeController(mountScope);

  return null;
}
