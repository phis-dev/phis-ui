"use client";

import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../plugins/runtime-modules/core/ids";
import {
  buildPhiSpacingScaleOptions,
  type PhiSpacingScaleFamily,
} from "../../config/spacing-options";
import {
  createPhiStaticControlOptionsProviderClient,
  readPhiControlOptionsProviderParam,
  type PhiControlOptionsProviderContext,
} from "../../../controls/phi-options-provider";

function resolveSpacingScaleOptionsProvider(context: PhiControlOptionsProviderContext) {
  const family: PhiSpacingScaleFamily =
    readPhiControlOptionsProviderParam(context.optionsProvider, "family") === "margin"
      ? "margin"
      : "padding";

  return {
    options: buildPhiSpacingScaleOptions(family),
  };
}

export const PhiSpacingScaleOptionsProviderClient = createPhiStaticControlOptionsProviderClient({
  key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale,
  resolve: resolveSpacingScaleOptionsProvider,
});
