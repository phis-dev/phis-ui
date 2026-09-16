import { describe, expect, it } from "vitest";

import {
  buildPhiSiteThemeSelectOptions,
  createPhiSiteThemeSelectionValue,
  PHI_THEME_SELECT_SITE_GROUP,
  readPhiSiteThemeSelectionState,
  resolvePhiThemeSelectionValue,
} from "./phi-theme-selection";
import { PHI_DEFAULT_THEME_PRESET_KEY } from "./phi-theme-presets";

const derivedFrom = { set: { key: "alpenglow", version: 1, title: "Alpenglow" } };

describe("site theme selection", () => {
  it("stands at the draft while there is one, then at the published Theme, then at the core Set", () => {
    expect(resolvePhiThemeSelectionValue("demo", { published: true, draft: true }))
      .toBe(createPhiSiteThemeSelectionValue("demo", "draft"));
    expect(resolvePhiThemeSelectionValue("demo", { published: true, draft: false }))
      .toBe(createPhiSiteThemeSelectionValue("demo", "published"));
    expect(resolvePhiThemeSelectionValue("demo", { published: false, draft: false }))
      .toBe(PHI_DEFAULT_THEME_PRESET_KEY);
  });

  it("reads back which Site entry a value names, and nothing for a Set", () => {
    expect(readPhiSiteThemeSelectionState(createPhiSiteThemeSelectionValue("demo", "published"), "demo")).toBe("published");
    expect(readPhiSiteThemeSelectionState(createPhiSiteThemeSelectionValue("demo", "draft"), "demo")).toBe("draft");
    expect(readPhiSiteThemeSelectionState(createPhiSiteThemeSelectionValue("other", "draft"), "demo")).toBeNull();
    expect(readPhiSiteThemeSelectionState("alpenglow", "demo")).toBeNull();
  });

  it("always lists both entries, and disables the one that does not exist", () => {
    const options = buildPhiSiteThemeSelectOptions({
      siteKey: "demo",
      published: { theme: { derivedFrom }, revisionId: 7 },
      draft: null,
    });

    expect(options.map((option) => option.label)).toEqual(["Published", "Draft"]);
    expect(options.every((option) => option.group === PHI_THEME_SELECT_SITE_GROUP)).toBe(true);
    expect(options[0]).toMatchObject({ description: "Revision #7 · Derived from Alpenglow" });
    expect(options[0]?.disabled).toBeUndefined();
    expect(options[1]).toMatchObject({ disabled: true });
  });

  it("names an unsaved draft as such", () => {
    const [published, draft] = buildPhiSiteThemeSelectOptions({
      siteKey: "demo",
      published: null,
      draft: { theme: { derivedFrom }, revisionId: null },
    });

    expect(published).toMatchObject({ disabled: true, description: "Not published yet" });
    expect(draft).toMatchObject({ description: "Unsaved · Derived from Alpenglow" });
  });
});
