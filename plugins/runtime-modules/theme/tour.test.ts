import { describe, expect, it } from "vitest";

import { PHI_STACK_LAYOUT_DEFINITION } from "../../../components/layouts/layout-definitions";
import { collectPhiTourDefinitionErrors } from "../../../types/tours";
import { PHI_THEME_PAGE_LAYOUT_IDS } from "./page-ids";
import { PHI_THEME_WORKSPACE_TOUR } from "./tour";

/*
 * The panel steps turn the workspace's Stack. A step signal is checked the way a route is: against what
 * its receiver says it hears (design/TOURS.md, Signaling and orchestration).
 */
describe("the Theme workspace's Tour", () => {
  it("is a valid definition", () => {
    expect(collectPhiTourDefinitionErrors(PHI_THEME_WORKSPACE_TOUR)).toEqual([]);
  });

  it("turns only the Stack, with what the Stack listens for, and turns it back", () => {
    const listens = PHI_STACK_LAYOUT_DEFINITION.runtimeSignals.listens;
    const panelSteps = PHI_THEME_WORKSPACE_TOUR.steps.filter((step) => "prepare" in step);
    expect(panelSteps.map((step) => step.key)).toEqual(["color", "style", "background", "brand"]);
    for (const step of panelSteps) {
      expect("release" in step, step.key).toBe(true);
      for (const signal of [...step.prepare, ...("release" in step ? step.release : [])]) {
        expect(signal.receiver).toBe(`cms:${PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack}`);
        expect(listens.find((capability) =>
          capability.channel === signal.channel &&
          capability.action === signal.action &&
          capability.valueType === signal.valueType)).toBeDefined();
      }
    }
  });
});
