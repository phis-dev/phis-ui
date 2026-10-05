import { describe, expect, it } from "vitest";

import { createPhiPublicRuntimeModuleCatalog } from "./area-catalogs/public";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsNavigationOverlay,
} from "./descriptor-compiler";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";

/**
 * Which language a Navigation label is written in.
 *
 * A Module's label is its own text, in the Module's source language; a label the operator wrote is in
 * the Site's. A Site whose source language is German took the Public Module's "Home" for German and
 * showed it untranslated, because the label did not say otherwise.
 */

function publicHeader() {
  const entries = createPhiPublicRuntimeModuleCatalog();
  const catalog = resolvePhiCmsDescriptorCatalog(entries);
  const activeModuleIds = new Set([...entries.keys()]);
  const surface = resolvePhiCmsActiveNavigationSurfaces({
    catalog,
    area: "public",
    activeModuleIds,
    routeTable: compilePhiCmsActiveRouteTable({ catalog, area: "public", activeModuleIds }),
  }).find((candidate) => candidate.navKey === "public:header");
  if (!surface) throw new Error("The Public Area declares a header Navigation.");
  return surface;
}

describe("a Navigation label's source language", () => {
  it("is the Module's for an entry the Module ships", () => {
    const header = publicHeader();
    expect(header.items.length).toBeGreaterThan(0);
    for (const item of header.items) {
      expect(item.label.sourceLocale, item.label.defaultMessage).toBe("en");
    }
  });

  it("is gone once the operator renames the entry", () => {
    const header = publicHeader();
    const [renamed, kept] = header.items;
    const { surface } = resolvePhiCmsNavigationOverlay(header, {
      navKey: "public:header",
      itemOverrides: [{ id: renamed!.id, label: "Startseite" }],
      customItems: [],
      tombstones: [],
    });
    expect(surface.items.find((item) => item.id === renamed!.id)?.label)
      .toEqual({ defaultMessage: "Startseite" });
    expect(surface.items.find((item) => item.id === kept!.id)?.label.sourceLocale).toBe("en");
  });

  it("is absent for an entry the operator adds", () => {
    const header = publicHeader();
    const id = "EgMAAAAAAAEAAAAB" as PhiCmsInstanceId;
    const { surface } = resolvePhiCmsNavigationOverlay(header, {
      navKey: "public:header",
      itemOverrides: [],
      customItems: [{
        id,
        kind: "link",
        label: "Kontakt",
        target: { kind: "external", href: "https://example.test" },
        placement: { index: 0, parentId: null },
      }],
      tombstones: [],
    });
    expect(surface.items.find((item) => item.id === id)?.label).toEqual({ defaultMessage: "Kontakt" });
  });
});
