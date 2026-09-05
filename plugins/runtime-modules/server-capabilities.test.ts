import { describe, expect, it } from "vitest";

import { resolvePhiRuntimeModuleServerBinding } from "./server-capabilities";
import {
  PHI_CORE_SERVER_BINDING,
  PHI_CORE_SERVER_PROVIDER_ID,
  type PhiCapabilitySnapshot,
} from "../../types/server-capabilities";

/**
 * Whether a Module's server half is there.
 *
 * The binding is the only thing tying the two halves of one package together at runtime. They ship
 * under one name and one version and are installed by different commands, so nothing else notices when
 * a Site has the Module and not the Add-on behind it.
 */

const ADDON = "@acme/shop";

function snapshot(providers: PhiCapabilitySnapshot["providers"]): PhiCapabilitySnapshot {
  return { siteKey: "acme", releaseBuildId: null, buildManifestDigest: "pgtest", providers };
}

describe("resolving a Module's server binding", () => {
  it("lets a Core binding through without a snapshot, because Core is what is rendering", () => {
    // And because the snapshot is legitimately absent wherever there is no Site to take one of.
    expect(resolvePhiRuntimeModuleServerBinding(PHI_CORE_SERVER_BINDING, null))
      .toEqual({ available: true });
  });

  it("checks an Add-on provider even when the binding names no capability", () => {
    /*
     * The statement "my server half is installed and enabled here" is one that can be false, and
     * reading an empty list as "nothing to check" made it unfalsifiable: the Module rendered against an
     * Add-on that was never installed, and the failure arrived as every request missing a route.
     */
    const resolution = resolvePhiRuntimeModuleServerBinding(
      { providerId: ADDON, requiredCapabilities: [] },
      snapshot([{
        providerId: PHI_CORE_SERVER_PROVIDER_ID, state: "available",
        diagnosticCode: null, capabilities: [],
      }]),
    );
    expect(resolution).toMatchObject({ available: false, state: "missing" });
  });

  it("reports the provider's own state, so an operator is told which of the reasons it is", () => {
    const resolution = resolvePhiRuntimeModuleServerBinding(
      { providerId: ADDON, requiredCapabilities: [] },
      snapshot([{
        providerId: ADDON, state: "disabled",
        diagnosticCode: "site_disabled", capabilities: [],
      }]),
    );
    expect(resolution)
      .toMatchObject({ available: false, state: "disabled", diagnosticCode: "site_disabled" });
  });

  it("lets an installed and enabled Add-on through", () => {
    expect(resolvePhiRuntimeModuleServerBinding(
      { providerId: ADDON, requiredCapabilities: [] },
      snapshot([{ providerId: ADDON, state: "available", diagnosticCode: null, capabilities: [] }]),
    )).toEqual({ available: true });
  });

  it("names the capability a provider does not offer", () => {
    // The other half of the contract: present is not the same as the shape this Module was built for,
    // and a raised major version is how a provider says so.
    const resolution = resolvePhiRuntimeModuleServerBinding(
      { providerId: ADDON, requiredCapabilities: ["@acme/shop/catalogue:v2"] },
      snapshot([{
        providerId: ADDON, state: "available", diagnosticCode: null,
        capabilities: [{ id: "@acme/shop/catalogue:v1", interfaceDigest: "x" }],
      }]),
    );
    expect(resolution).toMatchObject({
      available: false,
      diagnosticCode: "capability_missing",
      missingCapabilities: ["@acme/shop/catalogue:v2"],
    });
  });
});
