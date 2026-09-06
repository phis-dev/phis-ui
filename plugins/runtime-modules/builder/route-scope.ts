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

/**
 * The Builder pages that draw a canvas, and the only pages that arm the header debug switch. The
 * switch outlines the scaffold a canvas is built from, so anywhere else it toggles state nothing
 * renders. Same resting state as the Area selector: disabled unless a page opts in here.
 */
const PHI_DEBUG_SCAFFOLD_BUILDER_PAGE_KEYS = new Set(["shells", "pages"]);

export function isPhiDebugScaffoldBuilderPage(pageKey: string) {
  return PHI_DEBUG_SCAFFOLD_BUILDER_PAGE_KEYS.has(pageKey);
}

/**
 * Which Builder workspace a path names.
 *
 * The Builder's own routes live under its package like every other Module's -- `/builder/phis/ui/pages`
 * -- so the segment after the Area is the package, not the workspace. The workspace is named by the last
 * segment that is one of the names the Builder knows; a path that names none is not a workspace.
 */
const PHI_BUILDER_WORKSPACE_KEYS = new Set([
  "dashboard",
  "shells",
  "pages",
  "navigation",
  "modules",
  "theme",
  "revisions",
  "media",
  "settings",
]);

export function readPhiDeveloperBuilderWorkspaceKey(pathname: string | null) {
  if (typeof pathname !== "string") {
    return null;
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "builder") {
    return null;
  }
  for (let index = segments.length - 1; index > 0; index -= 1) {
    const segment = segments[index];
    if (segment && PHI_BUILDER_WORKSPACE_KEYS.has(segment)) {
      return segment;
    }
  }
  return null;
}

export function resolvePhiDeveloperBuilderRouteScope(pathname: string | null) {
  if (typeof pathname !== "string" || pathname.split("/").filter(Boolean)[0] !== "builder") {
    return null;
  }

  return {
    area: "builder" as const,
    pageKey: readPhiDeveloperBuilderWorkspaceKey(pathname) ?? "root",
  };
}

const PHI_BUILDER_COMMAND_WORKSPACES: Record<string, PhiDeveloperBuilderCommandWorkspace> = {
  shells: "structure",
  pages: "pages",
  navigation: "navigation",
  modules: "modules",
  theme: "theme",
};

export function resolvePhiDeveloperBuilderCommandWorkspace(
  pathname: string | null,
): PhiDeveloperBuilderCommandWorkspace {
  const workspaceKey = readPhiDeveloperBuilderWorkspaceKey(pathname);
  return workspaceKey ? PHI_BUILDER_COMMAND_WORKSPACES[workspaceKey] ?? null : null;
}
