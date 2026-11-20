import { describe, expect, it } from "vitest";

import { hasPhiCmsPresetUpdate } from "./preset-version";

/*
 * "Preset update available" is a statement about a revision of the shell the Area takes: one saved from
 * an older version of that very preset. A Modules revision names no preset, and a structure of another
 * shell is not an older copy of this one.
 */
describe("whether a revision is older than the preset it was saved from", () => {
  const installed = { ownerModuleId: "@acme/site/modules/site" as const, presetKey: "public-shell", sourcePresetVersion: 2 };

  it("is so for a revision of an older version of the same preset", () => {
    expect(hasPhiCmsPresetUpdate(installed, { ...installed, sourcePresetVersion: 1 })).toBe(true);
    expect(hasPhiCmsPresetUpdate(installed, installed)).toBe(false);
  });

  it("is not a question for a Modules revision, which names no preset", () => {
    expect(hasPhiCmsPresetUpdate(installed, null)).toBe(false);
    expect(hasPhiCmsPresetUpdate(installed, undefined)).toBe(false);
  });

  it("is not a question for a revision of another shell", () => {
    expect(hasPhiCmsPresetUpdate(installed, {
      ownerModuleId: "@phis/ui/modules/public",
      presetKey: "public-default-area-preset",
      sourcePresetVersion: 1,
    })).toBe(false);
  });
});
