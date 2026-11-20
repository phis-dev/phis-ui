import { describe, expect, it } from "vitest";

import {
  buildPhiAreaShellPresetConfig,
  readPhiAreaMeta,
  readPhiAreaRootRoute,
} from "./cms-area-config";

/*
 * A shell preset's `settings` stand for the Area config while nothing is stored on that shell, and are
 * read by the same readers as a Builder save (MODULES.md, "A Module's own Area shell").
 */
describe("a shell preset's proposed Area settings", () => {
  it("is no config at all when the shell proposes nothing, so phis-ui's defaults answer", () => {
    expect(buildPhiAreaShellPresetConfig(undefined)).toEqual({});
    expect(buildPhiAreaShellPresetConfig({})).toEqual({});
    expect(readPhiAreaMeta(buildPhiAreaShellPresetConfig(undefined))).toBeNull();
  });

  it("reads back through the stored config's readers", () => {
    const config = buildPhiAreaShellPresetConfig({
      meta: { titleTemplate: "%s · Acme", sitemap: false },
      rootRoute: { mode: "landing" },
    });
    expect(readPhiAreaMeta(config)).toEqual({ titleTemplate: "%s · Acme", sitemap: false });
    expect(readPhiAreaRootRoute(config)).toEqual({ mode: "landing" });
  });

  it("leaves out what it does not name, so that key keeps its default", () => {
    const config = buildPhiAreaShellPresetConfig({ meta: { defaultTitle: "Acme" } });
    expect(readPhiAreaRootRoute(config)).toBeNull();
    expect(readPhiAreaMeta(config)).toEqual({ defaultTitle: "Acme" });
  });
});
