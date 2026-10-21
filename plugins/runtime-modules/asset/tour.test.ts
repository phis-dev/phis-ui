import { describe, expect, it } from "vitest";

import { collectPhiTourDefinitionErrors } from "../../../types/tours";
import { PHI_ASSET_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_ASSET_MEDIA_TOUR } from "./tour";

describe("the Media Tour", () => {
  it("is a valid definition on the Builder's Media route, and on no other", () => {
    expect(collectPhiTourDefinitionErrors(PHI_ASSET_MEDIA_TOUR)).toEqual([]);
    const toured = PHI_ASSET_RUNTIME_MODULE_ROUTES.filter((route) => "tour" in route);
    expect(toured.map((route) => [route.area, route.path])).toEqual([["builder", "/media"]]);
    expect(toured[0] && "tour" in toured[0] ? toured[0].tour : undefined).toBe(PHI_ASSET_MEDIA_TOUR);
  });
});
