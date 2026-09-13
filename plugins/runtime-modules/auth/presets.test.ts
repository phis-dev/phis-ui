import { describe, expect, it } from "vitest";

import { createPhiPublicRuntimeModuleCatalog } from "../area-catalogs/public";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../descriptor-compiler";
import { PHI_AUTH_RUNTIME_MODULE_ROUTES } from "./presets";
import { PhiCmsFlags } from "../../../constants/phi-cms";
import { hasPhiFlag } from "../../../helpers/flags";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";

/**
 * What the sign-in Pages start out as, and how far that reaches.
 *
 * A Module states a default and the Site decides -- so what is pinned here is the default itself and
 * the one journey it has to survive: from the descriptor, through the compiled route table, to the
 * route that answers the address. Where it goes after that is the Page record's business, and the
 * Builder's, and is not a fact about this Module.
 */

const PUBLIC_AUTH_PRESET_KEYS = [
  "public-registration-page",
  "public-login-page",
  "public-confirm-page",
  "public-reset-password-page",
  "public-logout-page",
] as const;

describe("the Pages a visitor signs in through", () => {
  it("ships every Public one as not indexed", () => {
    for (const presetKey of PUBLIC_AUTH_PRESET_KEYS) {
      const descriptor = PHI_AUTH_RUNTIME_MODULE_ROUTES.find((route) => route.presetKey === presetKey);
      expect(descriptor, `${presetKey} is missing`).toBeDefined();
      expect(
        hasPhiFlag(descriptor?.defaultPageFlags, PhiCmsFlags.NoIndex),
        `${presetKey} must start out NoIndex`,
      ).toBe(true);
    }
  });

  it("states nothing for the Areas that are never indexed anyway", () => {
    // App and Admin are authenticated. A default there would restate a decision already made, and
    // would read in the Builder as though it were the Operator's to reverse.
    for (const route of PHI_AUTH_RUNTIME_MODULE_ROUTES) {
      if (route.area === "public") continue;
      expect(route.defaultPageFlags, `${route.presetKey} states a flag it does not own`).toBeUndefined();
    }
  });

  it("carries the default through the route table to the address", () => {
    const entries = createPhiPublicRuntimeModuleCatalog();
    const table = compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "public",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });

    const login = resolvePhiCmsRoutePreset(table, "/login");
    expect(hasPhiFlag(login?.descriptor.defaultPageFlags, PhiCmsFlags.NoIndex)).toBe(true);

    // The flag is the route's own, not the table's: a Public Page that states none carries none.
    const unflagged = [...table.exactByPath.values()].filter((route) => route.defaultPageFlags === undefined);
    for (const route of unflagged) {
      expect(hasPhiFlag(route.defaultPageFlags, PhiCmsFlags.NoIndex)).toBe(false);
    }
  });
});
