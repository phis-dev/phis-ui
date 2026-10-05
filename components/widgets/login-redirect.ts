import { requestPhiJson } from "../../helpers/client-json-request";
import { readPhiInternalPath } from "../../helpers/internal-path";
import { localizeAreaPath, localizePath, stripLocaleAndAreaFromPathname } from "../../helpers/locale";

/** Where to go after signing in, if it is an address on this Site (helpers/internal-path.ts). */
export function normalizeLoginRedirectTarget(value: string | null | undefined) {
  return readPhiInternalPath(value);
}

export function resolvePostLoginTarget(pathname: string, locale: string, area: string) {
  const publicPath = stripLocaleAndAreaFromPathname(pathname) || "/";
  const isBootstrapAuthPath = publicPath === "/login" || publicPath === "/confirm" || publicPath === "/reset-password";

  if (area === "public") {
    return isBootstrapAuthPath ? localizePath(locale, "/") : localizePath(locale, publicPath);
  }

  if (publicPath === "/" || isBootstrapAuthPath) {
    return localizeAreaPath(locale, area, "/");
  }

  return localizeAreaPath(locale, area, publicPath);
}

async function pathExists(path: string, area: string) {
  try {
    const search = new URLSearchParams({ path, area });
    const { ok, payload } = await requestPhiJson<{ available?: unknown }>(
      `/api/site/navigation-target?${search.toString()}`,
    );
    return ok && payload?.available === true;
  } catch {
    return false;
  }
}

export async function resolveSafePostLoginTarget(pathname: string, locale: string, area: string) {
  const target = resolvePostLoginTarget(pathname, locale, area);
  const rootTarget = area === "public" ? localizePath(locale, "/") : localizeAreaPath(locale, area, "/");

  if (target === rootTarget) {
    return rootTarget;
  }

  return (await pathExists(target, area)) ? target : rootTarget;
}
