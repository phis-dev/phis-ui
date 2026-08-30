import { localizeAreaPath, localizePath, stripLocaleAndAreaFromPathname } from "../../helpers/locale";

export function normalizeLoginRedirectTarget(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }

  return normalized;
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
    const response = await fetch(`/api/site/navigation-target?${search.toString()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as { available?: unknown } | null;

    return response.ok && payload?.available === true;
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
