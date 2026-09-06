import type { PhiDeveloperBuilderCommandWorkspace } from "./developer-workspace-types";

/**
 * The Builder pages that edit one Area at a time -- the only pages that arm the header Area
 * selector. The selector's meaning is "the Area being edited", so every page NOT in this list gets
 * it disabled by default: a new Builder page that forgets to opt in sits in the safe state instead
 * of showing a scope that steers nothing. Site-wide pages (modules, media, theme, dashboard,
 * settings) never opt in.
 */
const PHI_AREA_SCOPED_BUILDER_PAGE_KEYS = new Set(["shells", "pages", "navigation", "revisions"]);

export function isPhiAreaScopedBuilderPage(pageKey: string) {
  return PHI_AREA_SCOPED_BUILDER_PAGE_KEYS.has(pageKey);
}

export function resolvePhiDeveloperBuilderRouteScope(pathname: string | null) {
  if (typeof pathname !== "string") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "builder") {
    return null;
  }

  return {
    area: "builder" as const,
    pageKey: segments[1] ?? "root",
  };
}

export function resolvePhiDeveloperBuilderCommandWorkspace(
  pathname: string | null,
): PhiDeveloperBuilderCommandWorkspace {
  if (typeof pathname !== "string") {
    return null;
  }

  if (pathname.includes("/builder/shells")) {
    return "structure";
  }

  if (pathname.includes("/builder/pages")) {
    return "pages";
  }

  if (pathname.includes("/builder/navigation")) {
    return "navigation";
  }

  if (pathname.includes("/builder/modules")) {
    return "modules";
  }

  if (pathname.includes("/builder/theme")) {
    return "theme";
  }

  return null;
}
