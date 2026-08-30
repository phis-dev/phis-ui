import type { PhiDeveloperBuilderCommandWorkspace } from "./developer-workspace-types";

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

  if (pathname.includes("/builder/theme")) {
    return "theme";
  }

  return null;
}
