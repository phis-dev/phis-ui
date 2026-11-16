import "server-only";

import { isPhiRecord } from "../helpers/is-record";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import {
  PHI_EMPTY_MODULE_MEDIA_MAPPING,
  type PhiModuleMediaLoader,
  type PhiModuleMediaMapping,
} from "../types/module-media";
import { fetchPhiSiteApi } from "./site-api-request";
import { readPhiSiteReadCache } from "./site-read-cache";

const PACKAGE_NAME_PATTERN = /^@[^/]+\/[^/]+$/;
const KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function parseIds(value: unknown, what: string): Record<string, Record<string, number>> {
  if (!isPhiRecord(value)) {
    throw new Error(`Invalid module media ${what}.`);
  }
  const result: Record<string, Record<string, number>> = {};
  for (const [packageName, keys] of Object.entries(value)) {
    if (!PACKAGE_NAME_PATTERN.test(packageName) || !isPhiRecord(keys)) {
      throw new Error(`Invalid module media ${what}.`);
    }
    const ids: Record<string, number> = {};
    for (const [key, id] of Object.entries(keys)) {
      if (!KEY_PATTERN.test(key) || typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
        throw new Error(`Invalid module media ${what}.`);
      }
      ids[key] = id;
    }
    result[packageName] = ids;
  }
  return result;
}

export function parsePhiModuleMediaMapping(value: unknown): PhiModuleMediaMapping {
  if (!isPhiRecord(value)) {
    throw new Error("Invalid module media mapping.");
  }
  return { assets: parseIds(value.assets, "assets"), folders: parseIds(value.folders, "folders") };
}

let unavailableLogged = false;

/** Re-arms the once-per-process log; for tests. */
export function resetPhiModuleMediaUnavailableLog() {
  unavailableLogged = false;
}

export async function getPhiModuleMediaMapping(options: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
}): Promise<PhiModuleMediaMapping> {
  /*
   * Kept in the read cache outside development, with the capability snapshot's reasoning and lifetime
   * (60 s): the mapping is the same for every viewer and changes only on `phis module media sync` or a
   * rebind, which no read marker sees, so the TTL is what lets a hand binding reach a running Site.
   */
  if (process.env.NODE_ENV === "development") {
    return loadPhiModuleMediaMapping(options);
  }
  return readPhiSiteReadCache(
    `module-media:${options.siteKey.trim().toLowerCase()}`,
    () => loadPhiModuleMediaMapping(options),
  );
}

/**
 * Unlike the capability snapshot, a Core that cannot answer is not an error here: a missing route (`404`,
 * a Core older than the route), a refusal or an unreachable Core give the empty mapping, and the first
 * time per process is logged. A missing picture must not take a page down, and `@phis/ui` may be rolled
 * out before the Core that knows the route. An answer that arrives but is malformed still throws.
 */
async function loadPhiModuleMediaMapping({
  apiBaseUrl,
  internalToken,
  siteKey,
}: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
}): Promise<PhiModuleMediaMapping> {
  let answer: unknown;
  try {
    answer = await fetchPhiSiteApi<unknown>({
      context: "getPhiModuleMediaMapping",
      apiBaseUrl,
      internalToken,
      siteKey,
      path: "/api/v1/site/module-media",
      failure: "Failed to read module media",
    });
  } catch (error) {
    if (!unavailableLogged) {
      unavailableLogged = true;
      console.warn("[phi-module-media] The Site's module media could not be read; presets leave their pictures out.", {
        error,
      });
    }
    return PHI_EMPTY_MODULE_MEDIA_MAPPING;
  }
  return parsePhiModuleMediaMapping(answer);
}

/** The loader a server caller hands to the descriptor compiler for this Site. */
export function createPhiModuleMediaLoader(siteKey: string): PhiModuleMediaLoader {
  return () => getPhiModuleMediaMapping({ ...readPhiServerApiCredentials(), siteKey });
}
