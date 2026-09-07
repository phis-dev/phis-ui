import { describe, expect, it } from "vitest";

import {
  createPhiDraftCmsInstanceId,
  createPhiPresetCmsInstanceId,
  createPhiPresetCmsPageId,
  readPhiCmsInstanceIdDescriptor,
} from "./cms-instance-id";

/**
 * The ids this release computes, pinned to the ones it computed before.
 *
 * A Preset node's id is derived from what it is, so every stored draft, every signal route and every
 * Page identity in a database points at the output of this arithmetic. Changing it is a migration and
 * not an edit -- and it would not fail anything: ids would still be well formed, they would simply
 * name nothing. These values were taken from the implementation as it stood when it lived in two
 * copies, one here and one in phi-server, on the day they became one.
 */

describe("the Preset instance id arithmetic", () => {
  it("still computes the ids it computed on 2026-09-07", () => {
    expect(createPhiPresetCmsInstanceId({
      domain: "page",
      ownerModuleId: "@phis/ui/modules/public",
      presetKey: "public-welcome-page",
      nodeKey: "page",
    })).toBe("EQJMu9agLguTrp08");
    expect(createPhiPresetCmsInstanceId({
      domain: "area",
      ownerModuleId: "@phis/ui/modules/builder",
      presetKey: "builder-area-preset",
      nodeKey: "widgetAreaLandingPage",
    })).toBe("EQHC0Ptrjglrg-cF");
    // A third party's Module, to pin that the identity string is not built differently for our own.
    expect(createPhiPresetCmsInstanceId({
      domain: "navigation",
      ownerModuleId: "@acme/shop/modules/shop",
      presetKey: "shop-nav",
      nodeKey: "root",
    })).toBe("EQOqDtRLcONaGhQ2");
  });

  it("derives a Page id from owner and preset alone", () => {
    expect(createPhiPresetCmsPageId({
      ownerModuleId: "@phis/ui/modules/public",
      presetKey: "public-welcome-page",
    })).toBe("EQJMu9agLguTrp08");
  });
});

describe("the draft instance id arithmetic", () => {
  it("still computes the ids it computed on 2026-09-07", () => {
    expect(createPhiDraftCmsInstanceId({ domain: "page", draftRevisionId: 7, sequence: 3 }))
      .toBe("EgIAAAAAAAcAAAAD");
    expect(createPhiDraftCmsInstanceId({
      domain: "area",
      draftRevisionId: 0xffff_ffff_ffff,
      sequence: 0xffff_ffff,
    })).toBe("EgH_____________");
  });

  it("reads back what it wrote, which is what phi-server does with it", () => {
    const id = createPhiDraftCmsInstanceId({ domain: "page", draftRevisionId: 7, sequence: 3 });
    expect(readPhiCmsInstanceIdDescriptor(id)).toEqual({
      version: 1,
      origin: "draft",
      domain: "page",
      draftRevisionId: 7,
      sequence: 3,
    });
  });
});
