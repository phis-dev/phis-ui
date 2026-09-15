import type * as NodeFs from "node:fs";
import type * as NodePath from "node:path";

export type PhiServerApiCredentials = {
  apiBaseUrl: string;
  internalToken: string;
};

let serverApiCredentials: {
  configPath: string;
  mtimeMs: number;
  checkedAt: number;
  value: PhiServerApiCredentials;
} | null = null;

/** A configuration edit is noticed within this long; server code asks for credentials many times per render. */
const SERVER_API_CREDENTIALS_RECHECK_MS = 1000;

/**
 * Node's own modules, fetched when asked for rather than imported. Presets, label sets and form
 * descriptors that call phis-server are also loaded by contract scripts, tests and client bundles, which
 * must be able to import them; only calling this outside a Node server is an error.
 */
function nodeBuiltin<TModule>(id: string): TModule {
  const getBuiltinModule = typeof window === "undefined" && typeof process !== "undefined"
    ? (process as { getBuiltinModule?: (moduleId: string) => unknown }).getBuiltinModule
    : undefined;
  if (!getBuiltinModule) {
    throw new Error("phis-server credentials are available to server code only.");
  }
  return getBuiltinModule(id) as TModule;
}

/**
 * How this Site reaches phis-server: the internal API base and the internal token.
 *
 * They are the Site's own configuration, `config/site-runtime.json` -- the file `readPhiSiteRuntimeConfigSync`
 * reads -- and they stay on the server. They used to travel inside the Widget runtime, and a runtime handed
 * to a client component was serialised into the browser's payload together with the token. Nothing that
 * renders carries them any more; server code asks here. The file is looked at again at most once a second
 * and read again only when it changed.
 */
export function readPhiServerApiCredentials(): PhiServerApiCredentials {
  const now = Date.now();
  if (serverApiCredentials && now - serverApiCredentials.checkedAt < SERVER_API_CREDENTIALS_RECHECK_MS) {
    return serverApiCredentials.value;
  }
  const fs = nodeBuiltin<typeof NodeFs>("node:fs");
  const path = nodeBuiltin<typeof NodePath>("node:path");
  const configPath = path.join(path.resolve(/* turbopackIgnore: true */ process.cwd()), "config", "site-runtime.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config/site-runtime.json at ${configPath}.`);
  }
  const { mtimeMs } = fs.statSync(configPath);
  if (serverApiCredentials?.configPath === configPath && serverApiCredentials.mtimeMs === mtimeMs) {
    serverApiCredentials.checkedAt = now;
    return serverApiCredentials.value;
  }
  const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8")) as { phis?: { apiBaseUrl?: unknown; internalToken?: unknown } };
  const value = {
    apiBaseUrl: typeof parsed.phis?.apiBaseUrl === "string" ? parsed.phis.apiBaseUrl.trim().replace(/\/$/, "") : "",
    internalToken: typeof parsed.phis?.internalToken === "string" ? parsed.phis.internalToken.trim() : "",
  };
  serverApiCredentials = { configPath, mtimeMs, checkedAt: now, value };
  return value;
}
