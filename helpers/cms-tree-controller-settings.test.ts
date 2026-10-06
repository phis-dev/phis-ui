import { describe, expect, it } from "vitest";

import { concatPhiCmsTreeControllerSettings } from "./cms-tree-controller-settings";
import { mergePhiRuntimeControllerConfigOverlay } from "../components/runtime/runtime-controller-config-overlays";
import type { PhiCmsTreeControllerSettings } from "../types/cms";

const route = (routeKey: string, capabilityId: string) => ({
  routeKey,
  capabilityId,
  scope: "area" as const,
  channel: "dialog",
  action: "activate" as const,
  valueType: "none" as const,
  receiver: `cms:${routeKey}` as const,
});

const setting = (
  config: Record<string, unknown>,
  mountScope: "area" | "page" = "area",
): PhiCmsTreeControllerSettings[number] => ({
  type: "@test/pkg/modules/test/controller/default",
  instanceKey: "default",
  mountScope,
  config,
});

/*
 * One Controller, receivers in two places: a Builder Shell holds the header switches, the Inspector
 * Overlay contribution its drawers. Each tree names the receivers it holds, and the composed tree has
 * to hold both -- refusing the second, as it was, left the Controller one half deaf.
 */
describe("composing two trees' Controller settings", () => {
  it("joins the routes two trees write for the same Controller", () => {
    const composed = concatPhiCmsTreeControllerSettings(
      [setting({ signalRoutes: { emits: [route("shell-switch", "switchEnabled")] } })],
      [setting({ signalRoutes: { emits: [route("overlay-drawer", "drawerOpen")] } })],
      "Test composition",
    );
    expect(composed).toHaveLength(1);
    expect((composed[0]!.config!.signalRoutes as { emits: { routeKey: string }[] }).emits.map((entry) => entry.routeKey))
      .toEqual(["shell-switch", "overlay-drawer"]);
  });

  it("refuses a route both trees name, and any other key both set", () => {
    expect(() => concatPhiCmsTreeControllerSettings(
      [setting({ signalRoutes: { emits: [route("same", "a")] } })],
      [setting({ signalRoutes: { emits: [route("same", "b")] } })],
      "Test composition",
    )).toThrow(/names signal route "same" twice/u);
    expect(() => concatPhiCmsTreeControllerSettings(
      [setting({ mode: "a" })],
      [setting({ mode: "b" })],
      "Test composition",
    )).toThrow(/configures Controller .* twice/u);
  });

  it("refuses the same Controller configured at two scopes", () => {
    expect(() => concatPhiCmsTreeControllerSettings(
      [setting({}, "area")],
      [setting({}, "page")],
      "Test composition",
    )).toThrow(/twice/u);
  });
});

/*
 * The Area runs the Controller and keeps it across Pages; the shown Page adds what it holds. The
 * Area's receivers -- its Overlays -- stand on every Page, so a Page that replaced the Area's routes
 * with its own silenced them for exactly as long as it was shown.
 */
describe("laying a Page's config over its Area's", () => {
  it("keeps the Area's routes beside the Page's", () => {
    const merged = mergePhiRuntimeControllerConfigOverlay(
      { signalRoutes: { emits: [route("area-drawer", "drawerOpen")] } },
      { signalRoutes: { emits: [route("page-dialog", "dialogOpen")] } },
    );
    expect((merged!.signalRoutes as { emits: { routeKey: string }[] }).emits.map((entry) => entry.routeKey))
      .toEqual(["area-drawer", "page-dialog"]);
  });

  it("lets the Page's route answer one the Area answered under the same key", () => {
    const merged = mergePhiRuntimeControllerConfigOverlay(
      { signalRoutes: { emits: [route("shared", "fromArea")] } },
      { signalRoutes: { emits: [route("shared", "fromPage")] } },
    );
    expect((merged!.signalRoutes as { emits: { capabilityId: string }[] }).emits.map((entry) => entry.capabilityId))
      .toEqual(["fromPage"]);
  });

  it("is the Area's config while no Page says anything", () => {
    const area = { signalRoutes: { emits: [route("area", "a")] } };
    expect(mergePhiRuntimeControllerConfigOverlay(area, null)).toBe(area);
  });
});
