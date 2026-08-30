import "server-only";

import { resolvePhiRuntimeConfig, type PhiRuntimeConfigInput } from "../helpers/phis-runtime";
import type { PhiBlockRuntime } from "../types";
import { getPhiRequestRuntime } from "./request-runtime";
import { fetchSiteLocaleConfig, type FetchSiteLocaleConfigOptions } from "./site-locale";

type PhiRuntimeSource =
  | PhiRuntimeConfigInput
  | Pick<PhiBlockRuntime, "phis">
  | Pick<PhiBlockRuntime, "phis" | "locale">
  | Pick<PhiBlockRuntime, "phis" | "site">
  | Pick<PhiBlockRuntime, "phis" | "locale" | "site">;

function hasPhisRuntime(
  value: PhiRuntimeSource,
): value is Exclude<PhiRuntimeSource, PhiRuntimeConfigInput> {
  return "phis" in value;
}

function toRuntimeOptions(source: PhiRuntimeSource): FetchSiteLocaleConfigOptions {
  if (hasPhisRuntime(source)) {
    return {
      apiBaseUrl: source.phis.apiBaseUrl,
      internalToken: source.phis.internalToken,
      siteKey: "site" in source ? source.site.key : undefined,
    };
  }

  return {
    apiBaseUrl: source.apiBaseUrl ?? undefined,
    internalToken: source.internalToken ?? undefined,
    siteKey: source.siteKey ?? undefined,
  };
}

function readLocale(source: PhiRuntimeSource) {
  return hasPhisRuntime(source) && "locale" in source ? source.locale.current : undefined;
}

export function phiRuntime(
  source?: PhiRuntimeSource,
) {
  const resolvedSource = source ?? getPhiRequestRuntime();
  const runtimeOptions = toRuntimeOptions(resolvedSource);
  const resolvedRuntime = resolvePhiRuntimeConfig(runtimeOptions, {
    context: "phiRuntime",
  });
  const siteKey = runtimeOptions.siteKey?.trim() ?? "";
  const locale = readLocale(resolvedSource);

  return {
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    siteKey,
    locale,
    async fetchSiteLocaleConfig() {
      return fetchSiteLocaleConfig({
        apiBaseUrl: resolvedRuntime.apiBaseUrl,
        internalToken: resolvedRuntime.internalToken,
        siteKey,
      });
    },
  };
}
