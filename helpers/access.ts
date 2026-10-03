import { PhiCmsVisibilityContext } from "../constants/phi-cms";

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
