import "server-only";

import { resolvePhiRuntimeConfig, type PhiRuntimeConfigInput } from "../helpers/phis-runtime";
import type { PhiBlockRuntime } from "../types";
import { getPhiRequestRuntime } from "./request-runtime";
import { fetchSiteLocaleConfig, type FetchSiteLocaleConfigOptions } from "./site-locale";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

type PhiRuntimeSource =
  | PhiRuntimeConfigInput
  | Pick<PhiBlockRuntime, "locale">
  | Pick<PhiBlockRuntime, "site">
  | Pick<PhiBlockRuntime, "locale" | "site">;

/** A Widget runtime rather than explicit credentials; its credentials come from the Site's configuration. */
function isBlockRuntimeSource(
  value: PhiRuntimeSource,
): value is Exclude<PhiRuntimeSource, PhiRuntimeConfigInput> {
  return "site" in value || "locale" in value;
}

function toRuntimeOptions(source: PhiRuntimeSource): FetchSiteLocaleConfigOptions {
  if (isBlockRuntimeSource(source)) {
    return {
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
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
  return isBlockRuntimeSource(source) && "locale" in source ? source.locale.current : undefined;
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
