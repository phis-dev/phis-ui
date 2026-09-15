import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  type SiteLocaleConfig,
} from "./site-locale-config";
import { fetchSiteLocaleConfig } from "../server-helpers/site-locale";

export type PhiSiteRuntimeConfig = {
  site: {
    key: string;
    publicUrl?: string;
  };
  phis: {
    apiBaseUrl: string;
    internalToken: string;
  };
  network?: {
    internalApiTimeoutMs?: number;
  };
};

const DEFAULT_TIMEOUT_MS = 8000;

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export function resolvePhiSiteRuntimeConfigPath() {
  const root = path.resolve(/* turbopackIgnore: true */ process.cwd());
  const runtimePath = path.join(root, "config", "site-runtime.json");
  if (existsSync(runtimePath)) {
    return runtimePath;
  }

  throw new Error(`Missing config/site-runtime.json at ${runtimePath}.`);
}

let siteRuntimeConfig: { configPath: string; value: PhiSiteRuntimeConfig } | null = null;

/**
 * The Site's deployment configuration, read once per process.
 *
 * The phis CLI writes `config/site-runtime.json` when it scaffolds a Site and preserves it on reconcile;
 * nothing changes it while a Site runs. It used to be read again on every call -- the proxy alone does so
 * on every request -- for a file that does not move. A change takes effect when the Site process restarts,
 * and whatever rewrites the file restarts the Site's services.
 */
export function readPhiSiteRuntimeConfigSync(): PhiSiteRuntimeConfig {
  const expectedPath = path.join(path.resolve(/* turbopackIgnore: true */ process.cwd()), "config", "site-runtime.json");
  if (siteRuntimeConfig?.configPath === expectedPath) {
    return siteRuntimeConfig.value;
  }
  const configPath = resolvePhiSiteRuntimeConfigPath();
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  const site = asObject(asObject(parsed).site);
  const phis = asObject(asObject(parsed).phis);
  const network = asObject(asObject(parsed).network);

  const value = {
    site: {
      key: asTrimmedString(site.key),
      publicUrl: asTrimmedString(site.publicUrl) || undefined,
    },
    phis: {
      apiBaseUrl: asTrimmedString(phis.apiBaseUrl).replace(/\/$/, ""),
      internalToken: asTrimmedString(phis.internalToken),
    },
    network: {
      internalApiTimeoutMs: asPositiveNumber(network.internalApiTimeoutMs, DEFAULT_TIMEOUT_MS),
    },
  };
  siteRuntimeConfig = { configPath, value };
  return value;
}

export function getPhiInternalApiTimeoutMs() {
  return readPhiSiteRuntimeConfigSync().network?.internalApiTimeoutMs ?? DEFAULT_TIMEOUT_MS;
}

export async function getPhiSiteLocaleConfig(): Promise<SiteLocaleConfig> {
  const runtimeConfig = readPhiSiteRuntimeConfigSync();

  return fetchSiteLocaleConfig({
    apiBaseUrl: runtimeConfig.phis.apiBaseUrl,
    internalToken: runtimeConfig.phis.internalToken,
    siteKey: runtimeConfig.site.key,
  });
}
