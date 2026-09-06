import type { PhiRuntimeModuleId } from "../types/cms-module-descriptors";

const PHI_RUNTIME_MODULE_ID_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export const PHI_RUNTIME_MODULE_ID_MARKER = "modules";

/**
 * The path segments a Module's package occupies, from its id.
 *
 * Outside Public every route lives under its own package -- `/phis/ui/...`, `/acme/shop/...` -- so two
 * packages can never contest an address and a package can only collide with itself. The scope loses its
 * `@` and the module key is not part of it: how a package arranges its routes underneath is the
 * package's own business, and repeating the module key would decide that for it.
 */
export function readPhiRuntimeModulePackageRouteParts(moduleId: PhiRuntimeModuleId) {
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

  const packageParts = segments
    .slice(0, markerIndex)
    .map((segment, index) => (index === 0 && scoped ? segment.slice(1) : segment));
  if (packageParts.some((part) => !part || !PHI_RUNTIME_MODULE_ID_PART_PATTERN.test(part))) {
    throw new Error(
      `Runtime module id "${moduleId}" cannot be encoded as a route namespace.`,
    );
  }

  return packageParts as readonly string[];
}

export function buildPhiRuntimeModulePackageRoutePrefix(moduleId: PhiRuntimeModuleId) {
  return `/${readPhiRuntimeModulePackageRouteParts(moduleId).join("/")}`;
}
