import { PhiCmsVisibilityContext } from "../constants/phi-cms";

export type ResolvedCmsPath = {
  areaMask: number;
  path: string;
};

function normalizeRequestPath(path: string | null | undefined) {
  return `/${(path ?? "").trim().replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

export function resolveAreaFromPath(path: string | null | undefined) {
  const normalized = normalizeRequestPath(path);

  if (normalized === "/admin" || normalized.startsWith("/admin/")) {
    return PhiCmsVisibilityContext.AdminArea;
  }

  if (normalized === "/builder" || normalized.startsWith("/builder/")) {
    return PhiCmsVisibilityContext.BuilderArea;
  }

  if (normalized === "/editor" || normalized.startsWith("/editor/")) {
    return PhiCmsVisibilityContext.EditorArea;
  }

  if (normalized === "/accounting" || normalized.startsWith("/accounting/")) {
    return PhiCmsVisibilityContext.AccountingArea;
  }

  if (normalized === "/app" || normalized.startsWith("/app/")) {
    return PhiCmsVisibilityContext.AppArea;
  }

  return PhiCmsVisibilityContext.PublicArea;
}

export function resolveCmsPath(path: string | null | undefined): ResolvedCmsPath {
  const normalized = normalizeRequestPath(path);
  const segments = normalized === "/" ? [] : normalized.slice(1).split("/");
  const areaMask = resolveAreaFromPath(normalized);

  if (segments.length === 0) {
    return { areaMask, path: "/" };
  }

  const first = segments[0]?.toLowerCase();
  const knownArea =
    first === "app" ||
    first === "admin" ||
    first === "builder" ||
    first === "editor" ||
    first === "accounting";

  if (!knownArea) {
    return { areaMask, path: normalized };
  }

  const remaining = segments.slice(1).join("/");
  return { areaMask, path: remaining ? `/${remaining}` : "/" };
}
