import { describe, expect, it } from "vitest";

import { collectPhiTourDefinitionErrors } from "../../../types/tours";
import { PHI_REVISIONS_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_REVISIONS_TOUR } from "./tour";

describe("the Revisions Tour", () => {
  it("is a valid definition on its own route", () => {
    expect(collectPhiTourDefinitionErrors(PHI_REVISIONS_TOUR)).toEqual([]);
    const route = PHI_REVISIONS_RUNTIME_MODULE_ROUTES.find((candidate) => candidate.path === "/revisions");
    expect(route && "tour" in route ? route.tour : undefined).toBe(PHI_REVISIONS_TOUR);
  });
});
