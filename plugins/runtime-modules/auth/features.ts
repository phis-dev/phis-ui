import "server-only";

import {
  fetchPhiPublicAuthManifest,
  phiPublicAuthManifestOffersRegistration,
} from "../../../gateway/auth-public-manifest";
import type { PhiRuntimeModuleFeatureContext } from "../../../types/cms-plugins";

/**
 * What this Site was configured to offer at sign-in, as three plain facts.
 *
 * The manifest lists methods and a registration mode; a condition on a page wants to know whether to
 * show a password form, a row of provider buttons, and a way to create an account. Publishing the
 * answers rather than the manifest is deliberate: an operator adding a second identity provider in the
 * Admin changes what `auth.external` is true of, and no page has to be edited for that.
 *
 * `registration` reaches a setting that nothing has been reading. A Site set to `disabled` still
 * offered "Create account" and sent people to a form the server would refuse.
 */
export async function resolvePhiAuthRuntimeModuleFeatures(context: PhiRuntimeModuleFeatureContext) {
  const manifest = await fetchPhiPublicAuthManifest({
    apiBaseUrl: context.apiBaseUrl,
    internalToken: context.internalToken,
    siteKey: context.siteKey,
  });
  const primary = manifest.methods.filter((method) => method.stage === "primary");

  return {
    password: primary.some((method) => method.methodKey === "password"),
    external: primary.some((method) => method.methodKey !== "password"),
    registration: phiPublicAuthManifestOffersRegistration(manifest),
  };
}
