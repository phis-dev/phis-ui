import type { PhiRuntimeModuleId } from "../types/cms-module-descriptors";

const PHI_RUNTIME_MODULE_ID_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export const PHI_RUNTIME_MODULE_ID_MARKER = "modules";

export function readPhiRuntimeModuleRouteParts(moduleId: PhiRuntimeModuleId) {
  const segments = moduleId.split("/");
  const scoped = segments[0]?.startsWith("@") ?? false;
  const markerIndex = scoped ? 2 : 1;
  if (
    segments.length !== markerIndex + 2 ||
    segments[markerIndex] !== PHI_RUNTIME_MODULE_ID_MARKER
  ) {
    throw new Error(
      `Runtime module id "${moduleId}" must use <npm-package>/${PHI_RUNTIME_MODULE_ID_MARKER}/<module-key>.`,
    );
  }

  // The marker separates the module namespace from a package's other identifiers. Every part of a
  // route is a module already, so it carries nothing here and is left out, which keeps the segment
  // at <scope>+<package>+<key> rather than growing a constant fourth part.
  const routeParts = segments
    .filter((_, index) => index !== markerIndex)
    .map((segment, index) => (index === 0 && scoped ? segment.slice(1) : segment));
  if (
    routeParts.some((part) =>
      !part || part.includes("+") || !PHI_RUNTIME_MODULE_ID_PART_PATTERN.test(part)
    )
  ) {
    throw new Error(
      `Runtime module id "${moduleId}" cannot be encoded as a module route segment.`,
    );
  }

  return routeParts as readonly string[];
}

export function buildPhiRuntimeModuleRouteSegment(moduleId: PhiRuntimeModuleId) {
  return readPhiRuntimeModuleRouteParts(moduleId).join("+");
}
