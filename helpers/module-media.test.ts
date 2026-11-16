import { describe, expect, it, vi } from "vitest";

import { createPhiModuleMediaResolver } from "./module-media";
import { createPhiDeclaredMediaResolver } from "./module-media-check";
import { PHI_EMPTY_MODULE_MEDIA_LOADER, type PhiModuleMediaMapping } from "../types/module-media";

const MAPPING: PhiModuleMediaMapping = {
  assets: { "@acme/own": { icon: 7 }, "@acme/other": { icon: 9, secret: 10 } },
  folders: { "@acme/own": { shots: 3 } },
};

describe("createPhiModuleMediaResolver", () => {
  it("answers the owner's own package only", async () => {
    const media = createPhiModuleMediaResolver("@acme/own/modules/site", async () => MAPPING);
    expect(await media.asset("icon")).toBe(7);
    expect(await media.folder("shots")).toBe(3);
    expect(await media.asset("secret")).toBeNull();
  });

  it("answers null for an unknown key and for an empty Site", async () => {
    const media = createPhiModuleMediaResolver("@acme/own/modules/site", async () => MAPPING);
    expect(await media.asset("nope")).toBeNull();
    expect(await media.folder("icon")).toBeNull();
    const empty = createPhiModuleMediaResolver("@acme/own/modules/site", PHI_EMPTY_MODULE_MEDIA_LOADER);
    expect(await empty.asset("icon")).toBeNull();
  });

  it("loads on first use only, and once", async () => {
    const load = vi.fn(async () => MAPPING);
    const media = createPhiModuleMediaResolver("@acme/own/modules/site", load);
    expect(load).not.toHaveBeenCalled();
    await Promise.all([media.asset("icon"), media.folder("shots"), media.asset("icon")]);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("createPhiDeclaredMediaResolver", () => {
  it("answers distinct stable positive ids for declared keys", async () => {
    const { media, findings } = createPhiDeclaredMediaResolver({ assets: ["a", "b"], folders: ["f"] });
    const a = await media.asset("a");
    const b = await media.asset("b");
    const f = await media.folder("f");
    expect(new Set([a, b, f]).size).toBe(3);
    expect([a, b, f].every((id) => Number.isInteger(id) && id! > 0)).toBe(true);
    expect(await media.asset("a")).toBe(a);
    expect(findings()).toEqual([]);
  });

  it("records an undeclared key and answers null", async () => {
    const { media, findings } = createPhiDeclaredMediaResolver({ assets: ["a"] });
    expect(await media.asset("x")).toBeNull();
    expect(await media.folder("a")).toBeNull();
    expect(findings().map((finding) => finding.message)).toEqual([
      "asset `x` is not declared in the package's `phis.media`.",
      "folder `a` is not declared in the package's `phis.media`.",
    ]);
  });

  it("records every call when nothing is declared", async () => {
    const { media, findings } = createPhiDeclaredMediaResolver();
    expect(await media.asset("a")).toBeNull();
    expect(findings()).toHaveLength(1);
  });
});
