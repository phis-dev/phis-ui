import { describe, expect, it } from "vitest";

import { PHI_COLLAPSIBLE_LAYOUT_DEFINITION } from "../../../components/layouts/layout-definitions";
import { collectPhiTourDefinitionErrors } from "../../../types/tours";
import { createPhiBuilderControllerAddress } from "./controller/address";
import { PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_BUILDER_INSPECTOR_LAYOUT_IDS } from "./inspector-overlay-addresses";
import { PHI_BUILDER_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_BUILDER_PAGES_TOUR, PHI_BUILDER_SHELLS_TOUR } from "./tour";

/*
 * A step signal is a route the Tour writes, so it is checked the way a route is: against what its receiver
 * says it hears. Nothing else catches a renamed channel -- the step would open nothing, wait for a target
 * that never appears, and be passed over without a word (design/TOURS.md, Signaling and orchestration).
 */
describe.each([
  ["Shells", "/shells", PHI_BUILDER_SHELLS_TOUR],
  ["Pages", "/pages", PHI_BUILDER_PAGES_TOUR],
] as const)("the %s Tour", (_name, path, tour) => {
  it("is a valid definition on its own route", () => {
    expect(collectPhiTourDefinitionErrors(tour)).toEqual([]);
    const route = PHI_BUILDER_RUNTIME_MODULE_ROUTES.find((candidate) => candidate.path === path);
    expect(route && "tour" in route ? route.tour : undefined).toBe(tour);
  });

  it("sends only what its receivers listen for", () => {
    // The Builder Controller, and the Inspector's section Collapsibles it opens one by one.
    const listensByReceiver = new Map<string, readonly { channel: string; action: string; valueType: string; valueSchema?: unknown }[]>([
      [createPhiBuilderControllerAddress(), PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION.runtimeSignals.listens],
      ...[
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorBody,
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody,
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorBody,
      ].map((id) => [`cms:${id}`, PHI_COLLAPSIBLE_LAYOUT_DEFINITION.runtimeSignals.listens] as const),
    ]);
    const signals = tour.steps.flatMap((step) => [
      ...("prepare" in step ? step.prepare : []),
      ...("release" in step ? step.release : []),
    ]);
    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      const listens = listensByReceiver.get(signal.receiver);
      expect(listens, signal.receiver).toBeDefined();
      const listen = listens!.find((capability) =>
        capability.channel === signal.channel && capability.action === signal.action);
      expect(listen, `${signal.channel}/${signal.action}`).toBeDefined();
      expect(listen?.valueType).toBe(signal.valueType);
      expect(listen?.valueSchema ?? undefined).toBe("valueSchema" in signal ? signal.valueSchema : undefined);
    }
  });

  it("puts away what it opens", () => {
    for (const step of tour.steps) {
      if ("prepare" in step) expect("release" in step, step.key).toBe(true);
    }
  });
});
