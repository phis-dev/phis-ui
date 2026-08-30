export const PHI_SHARED_PACKAGE_NAME = "@phis/ui";

/**
 * Whether a string can name an npm package. It lives beside the package name rather than inside one
 * of its users because every first-party identifier grammar starts with a package: controller plugin
 * keys, module-scoped keys and background pattern keys each need to decide where the package ends and
 * their own namespace begins, and a second copy of this test is a second thing to widen.
 */
export function isPhiNpmPackageName(value: string) {
  if (!value || value.includes(":") || value.length > 214) {
    return false;
  }

  if (value.startsWith("@")) {
    return /^@[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*$/.test(value);
  }

  return /^[a-z0-9][a-z0-9._~-]*$/.test(value);
}
