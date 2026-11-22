import { describe, expect, it } from "vitest";

import { resolvePhiFormMediaLimits } from "./form-media-limits";
import type { PhiCmsRuntimeRenderRegistry } from "../../types/cms-plugins";

/**
 * A Form's Media fields apply the Media limits of the Add-on its own Module is bound to, which the Site
 * learns from the capability snapshot.
 */

const GALLERY_LIMITS = { maxFileBytes: 1_048_576, kinds: ["image" as const], maxPerField: 4 };

function registry(): Pick<PhiCmsRuntimeRenderRegistry, "runtimeModuleCatalog" | "serverCapabilities"> {
  const entry = (providerId: string) => ({ definition: { serverBinding: { providerId, requiredCapabilities: [] } } });
  return {
    runtimeModuleCatalog: new Map([
      ["@acme/gallery", entry("@acme/gallery")],
      ["@acme/plain", entry("@acme/plain")],
      ["@phis/ui/modules/asset", entry("@phis/server/core")],
    ]) as unknown as PhiCmsRuntimeRenderRegistry["runtimeModuleCatalog"],
    serverCapabilities: {
      siteKey: "acme",
      releaseBuildId: null,
      buildManifestDigest: "digest",
      providers: [
        { providerId: "@phis/server/core", state: "available", diagnosticCode: null, capabilities: [] },
        { providerId: "@acme/gallery", state: "available", diagnosticCode: null, capabilities: [], media: GALLERY_LIMITS },
        { providerId: "@acme/plain", state: "available", diagnosticCode: null, capabilities: [] },
      ],
    },
  };
}

describe("the Media limits a Form's fields apply", () => {
  it("are those of the Add-on the Form's Module is bound to", () => {
    expect(resolvePhiFormMediaLimits(registry(), "@acme/gallery")).toEqual(GALLERY_LIMITS);
  });

  it("are none for a Core-bound Module, an Add-on that states none, an unknown Module or no snapshot", () => {
    expect(resolvePhiFormMediaLimits(registry(), "@phis/ui/modules/asset")).toBeUndefined();
    expect(resolvePhiFormMediaLimits(registry(), "@acme/plain")).toBeUndefined();
    expect(resolvePhiFormMediaLimits(registry(), "@acme/unknown")).toBeUndefined();
    expect(resolvePhiFormMediaLimits({ ...registry(), serverCapabilities: null }, "@acme/gallery")).toBeUndefined();
  });
});
