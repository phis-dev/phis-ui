"use client";


export const loadPhiAssetRuntimeControllerClient = () =>
  import("../../../components/media/asset-controller-plugin")
    .then((module) => module.PhiAssetRuntimeControllerClient);

