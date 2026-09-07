export const PHI_SHARED_PACKAGE_NAME = "@phis/ui";

/**
 * Whether a string can name an npm package.
 *
 * Every first-party identifier grammar starts with a package -- controller plugin keys, module-scoped
 * keys, background pattern keys -- and a second copy of this test is a second thing to widen. It had
 * grown a third copy in phi-server, which validates controller addresses without being able to import
 * this one, so the test now lives in `@phis/contracts/signals` beside the address family that needs it
 * on both sides. This is the name the rest of this package reaches for.
 */
export { isPhiNpmPackageName } from "@phis/contracts/signals";
