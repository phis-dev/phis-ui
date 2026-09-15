import { describe, expect, it } from "vitest";

import { PHI_AUTH_CONTROLLER_DEFINITION } from "./area-base-controller-definitions";
import {
  createPhiAuthControllerAddress,
  PHI_AUTH_CONTROLLER_KEY,
} from "./area-base-controller-addresses";
import { resolvePhiRuntimeControllerMount } from "../../plugins/registries/runtime-controller-core";

/**
 * The address senders use has to be the address the mount registers.
 *
 * These are built in two different places from two different sets of constants, and when they drifted
 * apart nothing said so: a signal to an address nobody registered is held for a receiver that will
 * never arrive, which is silent by design. The Auth Controller was addressed by its package name rather
 * than its plugin key, so every signal sent to it -- an Overlay asking to close, a finished sign-in
 * asking to be forwarded -- waited forever, and a visitor who had just signed in stayed on the sign-in
 * page with nothing in the console.
 */
describe("Auth Controller address", () => {
  it("is the address its mount registers", () => {
    const mount = resolvePhiRuntimeControllerMount(PHI_AUTH_CONTROLLER_DEFINITION, {
      type: `${PHI_AUTH_CONTROLLER_DEFINITION.pluginKey}/${PHI_AUTH_CONTROLLER_KEY}`,
      instanceKey: "default",
      mountScope: "area",
      enabled: true,
    });

    expect(createPhiAuthControllerAddress()).toBe(mount.address);
  });
});
