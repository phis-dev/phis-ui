import { describe, expect, it } from "vitest";

import { createPhiPublicRuntimeModuleCatalog } from "./area-catalogs/public";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "./descriptor-compiler";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./public/ids";
import { createPhiPresetCmsPageId } from "../../types/cms-instance-id";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleCatalogEntry } from "../../types/cms-plugins";

/**
 * A package Module covering a Page the Public base Module holds as a floor (MODULES.md, "Who owns an
 * address"): its Page answers the path, the base Page keeps its identity, and whatever points at the
 * base Page reaches the package's through the path.
 */

const ACME_ID = "@acme/site/modules/site" as unknown as PhiRuntimeModuleId;
const OTHER_ID = "@acme/other/modules/site" as unknown as PhiRuntimeModuleId;

function buildPackageEntry(moduleId: PhiRuntimeModuleId, paths: readonly string[]) {
  return {
    definition: {
      moduleId,
      kind: "module",
      eligibleAreas: ["public"],
      title: "Site",
      description: "Pages of its own.",
      category: "content",
      iconFamily: "dashboard",
    },
    widgets: [],
    layouts: [],
    routes: paths.map((path, index) => ({
      ownerModuleId: moduleId,
      presetKey: `page-${index}`,
      presetVersion: 1,
      area: "public",
      title: path,
      path,
      loadTree: () => {
        throw new Error("The route table never draws a tree.");
      },
    })),
    load: () => Promise.resolve({}),
  } as unknown as PhiRuntimeModuleCatalogEntry;
}

const baseEntries = createPhiPublicRuntimeModuleCatalog();

function withPackages(...packages: PhiRuntimeModuleCatalogEntry[]): PhiRuntimeModuleCatalog {
  const entries = Object.assign(new Map(baseEntries), {
    areaDefinitions: baseEntries.areaDefinitions,
    platformModuleId: baseEntries.platformModuleId,
  });
  for (const entry of packages) {
    entries.set(entry.definition.moduleId, entry);
  }
  return entries;
}

function compile(entries: PhiRuntimeModuleCatalog, activeModuleIds = new Set([...entries.keys()])) {
  const catalog = resolvePhiCmsDescriptorCatalog(entries);
  return {
    catalog,
    activeModuleIds,
    table: compilePhiCmsActiveRouteTable({ catalog, area: "public", activeModuleIds }),
  };
}

describe("a package covering a Public base Page", () => {
  it("answers the base path with the package's Page", () => {
    const { table } = compile(withPackages(buildPackageEntry(ACME_ID, ["/contact", "/error/404"])));
    expect(resolvePhiCmsRoutePreset(table, "/contact")?.descriptor.ownerModuleId).toBe(ACME_ID);
    expect(resolvePhiCmsRoutePreset(table, "/error/404")?.descriptor.ownerModuleId).toBe(ACME_ID);
    expect(resolvePhiCmsRoutePreset(table, "/terms-and-conditions")?.descriptor.ownerModuleId)
      .toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
  });

  it("keeps the base Page's identity in the table", () => {
    const { table } = compile(withPackages(buildPackageEntry(ACME_ID, ["/contact"])));
    const basePageId = createPhiPresetCmsPageId({
      ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
      presetKey: "public-contact-page",
    });
    expect(table.byPageId.get(basePageId)?.path).toBe("/contact");
  });

  it("keeps the base navigation item, leading to the path the package now answers", () => {
    const { catalog, activeModuleIds } = compile(withPackages(buildPackageEntry(ACME_ID, ["/contact"])));
    const header = resolvePhiCmsActiveNavigationSurfaces({ catalog, area: "public", activeModuleIds })
      .find((surface) => surface.navKey === "public:header");
    const contact = header?.items.find((item) =>
      item.target?.kind === "module" &&
      item.target.ownerModuleId === PHI_PUBLIC_RUNTIME_MODULE_ID &&
      item.target.presetKey === "public-contact-page");
    expect(contact?.target).toMatchObject({ path: "/contact" });
  });

  it("uncovers the base Page when the package is switched off", () => {
    const entries = withPackages(buildPackageEntry(ACME_ID, ["/contact"]));
    const { table } = compile(entries, new Set([...baseEntries.keys()]));
    expect(resolvePhiCmsRoutePreset(table, "/contact")?.descriptor.ownerModuleId).toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
  });

  it("leaves the base Module covered when a second package declares the same path", () => {
    const { table } = compile(withPackages(
      buildPackageEntry(ACME_ID, ["/contact"]),
      buildPackageEntry(OTHER_ID, ["/contact"]),
    ));
    expect(resolvePhiCmsRoutePreset(table, "/contact")?.descriptor.ownerModuleId).not.toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
  });
});
