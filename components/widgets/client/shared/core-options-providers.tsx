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
import { readPhiSiteLocaleOptions } from "../../../forms/site-locales-config";

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

/**
 * The locales this Site offers, read from the configuration of the placement the field stands in.
 *
 * Handed over rather than fetched, because the Page already holds them: it is rendered for a Site and
 * knows which languages that Site publishes. A provider that asked a route for them would answer after
 * hydration -- the options contract forbids a Client store in `getServerSnapshot` -- and the select
 * would be empty in the HTML the Server sends, for a list that was never in doubt.
 *
 * That is what a placement's config is for, and why options resolution reads it under the field's own:
 * the field belongs to a registered descriptor that is the same on every Site, and this is not.
 */
function resolveSiteLocalesOptionsProvider(context: PhiControlOptionsProviderContext) {
  return { options: readPhiSiteLocaleOptions(context.sourceConfig) };
}

export const PhiSiteLocalesOptionsProviderClient = createPhiStaticControlOptionsProviderClient({
  key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales,
  resolve: resolveSiteLocalesOptionsProvider,
});
