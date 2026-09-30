import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhiPublicRuntimeModuleCatalog } from "../area-catalogs/public";
import { resolvePhiRuntimeModuleSet } from "../resolver";
import { buildPhiRuntimeModuleWidgetType } from "../contracts";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";
import { PHI_NEWS_RUNTIME_MODULE_WIDGETS } from "./widgets";
import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";

/**
 * Whether the Widget a Site activates is a Widget the render can find.
 *
 * Written after a measurement that looked like a rendering bug and was a wiring one: the Page rendered,
 * its heading rendered, and the list rendered nothing at all, because a Widget the resolver does not know
 * is dropped with a diagnostic rather than an error. This resolves the real catalog for the Public Area
 * and asks the question the renderer asks.
 */
describe("the News Widget in the Public Area", () => {
  it("carries the type key the preset places, namespaced to this Module", () => {
    const [widget] = PHI_NEWS_RUNTIME_MODULE_WIDGETS;
    expect(buildPhiRuntimeModuleWidgetType(widget)).toBe(PhiCmsWidgetType.NewsList);
  });

  it("resolves out of the Public catalog once the Site activates the Module", async () => {
    const catalog = createPhiPublicRuntimeModuleCatalog();
    expect(catalog.has(PHI_NEWS_RUNTIME_MODULE_ID)).toBe(true);

    const moduleSet = await resolvePhiRuntimeModuleSet({
      catalog,
      moduleIds: [PHI_NEWS_RUNTIME_MODULE_ID],
      area: "public",
      serverCapabilities: null,
    });

    expect(moduleSet.installedOwnerModuleIdByWidgetType.get(PhiCmsWidgetType.NewsList))
      .toBe(PHI_NEWS_RUNTIME_MODULE_ID);
    // The one the renderer reads: a type that is installed but not active is absent from this map.
    expect(moduleSet.widgetDefinitionsByType.has(PhiCmsWidgetType.NewsList)).toBe(true);
  });

  it("is absent from the render when the Site has not activated it", async () => {
    const moduleSet = await resolvePhiRuntimeModuleSet({
      catalog: createPhiPublicRuntimeModuleCatalog(),
      moduleIds: [],
      area: "public",
      serverCapabilities: null,
    });

    expect(moduleSet.widgetDefinitionsByType.has(PhiCmsWidgetType.NewsList)).toBe(false);
  });
});
