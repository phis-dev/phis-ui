import { describe, expect, it } from "vitest";

import { readPhiCmsInstanceId } from "../../types/cms-instance-id";
import { applyPhiWidgetBlockDefaults, buildPhiRenderFailureIssue } from "./phi-cms-layout-renderer";

/*
 * The path that only runs when something has already gone wrong, which is exactly why it is tested.
 *
 * A Widget rendering on the server hands back a promise. That promise rejecting used to travel up the
 * RSC stream unhandled: React abandoned the server render and Next re-rendered the whole route in the
 * browser, saying nothing about which Widget had failed. The Error Boundary underneath could never have
 * caught it -- it is a Client Component, and a Client Boundary does not see what an async Server
 * Component throws. What the rejection becomes instead is this issue.
 */
describe("buildPhiRenderFailureIssue", () => {
  const options = {
    kind: "widget",
    typeKey: "@phis/ui/modules/core/widgets/header-navigation",
    blockId: readPhiCmsInstanceId("EQFllPq86opL1uN1"),
    moduleId: "@phis/ui/modules/core",
  } as const;

  it("names the Widget that failed, not just the failure", () => {
    const issue = buildPhiRenderFailureIssue(new Error("fetch failed"), options);

    expect(issue).toEqual({
      code: "render-failed",
      kind: "widget",
      type: "@phis/ui/modules/core/widgets/header-navigation",
      blockId: options.blockId,
      moduleId: "@phis/ui/modules/core",
      detail: "fetch failed",
    });
  });

  it("carries a thrown non-Error through rather than losing it", () => {
    expect(buildPhiRenderFailureIssue("connection reset", options).detail)
      .toBe("connection reset");
  });

  it("says so when the Widget has no type to name", () => {
    expect(buildPhiRenderFailureIssue(new Error("boom"), { kind: "widget" }).type)
      .toBe("unknown");
  });

  it("turns a rejected render into a resolved issue instead of a rejection", async () => {
    // The shape the renderer relies on: the rejection handler returns a value, so the promise the RSC
    // stream awaits resolves. If this ever throws again, the whole page loses server rendering.
    const rendered = await Promise.reject(new Error("fetch failed")).catch(
      (error: unknown) => buildPhiRenderFailureIssue(error, options),
    );

    expect(rendered.code).toBe("render-failed");
    expect(rendered.detail).toBe("fetch failed");
  });
});

/*
 * What a Widget says about its own block, for the nodes that say nothing.
 *
 * A Preset writes its nodes by hand, so it reaches a Widget's `defaultConfig` neither the way the
 * Builder does when it creates a node nor the way the Inspector does when it edits one. The Form Widget
 * declared the reading measure as its cap and every Form a Preset placed rendered uncapped, because the
 * slot frame reads the node and the node had never heard of it.
 */
describe("applyPhiWidgetBlockDefaults", () => {
  const blockDefaults = new Map([
    ["@phis/ui/modules/core/widgets/form", { maxSize: { width: 610 } }],
  ]);
  const widget = {
    id: readPhiCmsInstanceId("EQFllPq86opL1uN1"),
    widgetType: "@phis/ui/modules/core/widgets/form",
    config: { formId: "registration" },
  } as unknown as Parameters<typeof applyPhiWidgetBlockDefaults>[0];

  it("hands a silent node what its Widget declares", () => {
    expect(applyPhiWidgetBlockDefaults(widget, blockDefaults).config)
      .toEqual({ maxSize: { width: 610 }, formId: "registration" });
  });

  it("lets the placement win, whole", () => {
    // Shallow, per key: a node that states the cap owns it, and nothing of the default is mixed in.
    const placed = { ...widget, config: { ...widget.config, maxSize: { width: "100%" } } };

    expect(applyPhiWidgetBlockDefaults(placed, blockDefaults).config)
      .toEqual({ maxSize: { width: "100%" }, formId: "registration" });
  });

  it("leaves a Widget that declares nothing exactly as it was", () => {
    const text = { ...widget, widgetType: "@phis/ui/modules/core/widgets/simple-text" };

    expect(applyPhiWidgetBlockDefaults(text, blockDefaults)).toBe(text);
  });
});
