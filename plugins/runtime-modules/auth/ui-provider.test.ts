import { describe, expect, it } from "vitest";

import { createPhiAppRuntimeModuleCatalog } from "../area-catalogs/app";
import { createPhiPublicRuntimeModuleCatalog } from "../area-catalogs/public";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../descriptor-compiler";
import { resolvePhiAuthUiRuntimeProjection } from "./ui-provider";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";

/**
 * The addresses the Account menu links to, against the routes that answer them.
 *
 * The Module writes these paths for itself -- `/security` -- and outside Public a Module's routes are
 * served under its package. The projection used to hand the declared path through untouched, the Account
 * Widget put only the Area in front of it, and the menu offered `/app/security` for a Page that lives at
 * `/app/phis/ui/security`. So the fact worth pinning is not the string: it is that the address the menu
 * links to is the address the Area's route table resolves.
 */

const APP_AREA_PREFIX = "/app";

function appCatalogEntries() {
  return createPhiAppRuntimeModuleCatalog();
}

function appRouteTable(entries: ReturnType<typeof appCatalogEntries>) {
  return compilePhiCmsActiveRouteTable({
    catalog: resolvePhiCmsDescriptorCatalog(entries),
    area: "app",
    activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
  });
}

function areaLocalPath(href: string) {
  expect(href.startsWith(`${APP_AREA_PREFIX}/`)).toBe(true);
  return href.slice(APP_AREA_PREFIX.length);
}

describe("the Account menu's own addresses", () => {
  it("resolves the App projection to the Pages the App route table serves", () => {
    const entries = appCatalogEntries();
    const projection = resolvePhiAuthUiRuntimeProjection(
      entries,
      new Set<PhiRuntimeModuleId>([...entries.keys()]),
      "app",
    );
    const table = appRouteTable(entries);

    expect(projection?.accountSecurityPath).toBe("/app/phis/ui/security");
    expect(projection?.accountProfilePath).toBe("/app/phis/ui/profile");

    expect(
      resolvePhiCmsRoutePreset(table, areaLocalPath(projection!.accountSecurityPath!))?.descriptor.presetKey,
    ).toBe("app-auth-security-page");
    expect(
      resolvePhiCmsRoutePreset(table, areaLocalPath(projection!.accountProfilePath!))?.descriptor.presetKey,
    ).toBe("app-profile-page");
  });

  it("does not offer the Module-relative path as a link", () => {
    const entries = appCatalogEntries();
    const projection = resolvePhiAuthUiRuntimeProjection(
      entries,
      new Set<PhiRuntimeModuleId>([...entries.keys()]),
      "app",
    );
    const table = appRouteTable(entries);

    // What the Module declares, with only the Area in front of it -- the address the menu used to build.
    expect(resolvePhiCmsRoutePreset(table, "/security")).toBeNull();
    expect(resolvePhiCmsRoutePreset(table, "/profile")).toBeNull();
    expect(projection?.accountSecurityPath).not.toBe("/app/security");
    expect(projection?.accountProfilePath).not.toBe("/app/profile");
  });

  it("names the same App Pages from a Public Area's projection", () => {
    // The Public shell draws the same Account menu and links into App; it does not grow a second copy
    // of those Pages, so the Area asked for must not change where they are.
    const entries = createPhiPublicRuntimeModuleCatalog();
    const projection = resolvePhiAuthUiRuntimeProjection(
      entries,
      new Set<PhiRuntimeModuleId>([...entries.keys()]),
      "public",
    );

    expect(projection?.accountSecurityPath).toBe("/app/phis/ui/security");
    expect(projection?.accountProfilePath).toBe("/app/phis/ui/profile");
  });
});
