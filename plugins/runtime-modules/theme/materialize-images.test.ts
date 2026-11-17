import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.hoisted(() => ({ calls: [] as Array<{ file: File; meta: unknown }>, nextId: 41 }));

vi.mock("../../../components/media/media-upload-flow", () => ({
  runPhiMediaUploadSession: async (file: File, _target: unknown, options: { meta: unknown }) => {
    upload.calls.push({ file, meta: options.meta });
    return { asset: { id: upload.nextId++ } };
  },
}));

import { PHI_CORE_THEME_SETS } from "../../../theme/phi-theme-blocks";
import { materializePhiThemeBrandSignet } from "./materialize-images";

const moduleSet = { ...PHI_CORE_THEME_SETS[0], key: "@acme/ui/sets/dunes", signet: "data:image/png;base64,iVBORw0KGgo=" };
const coreSet = PHI_CORE_THEME_SETS[0];

describe("taking a Signet into the Site's record on save", () => {
  beforeEach(() => {
    upload.calls = [];
    upload.nextId = 41;
  });

  it("uploads a Module Set's Signet and points the record at the Asset", async () => {
    const saved = await materializePhiThemeBrandSignet({ brand: { slogan: { label: "Hi" } } }, moduleSet);
    expect(upload.calls).toHaveLength(1);
    expect(upload.calls[0].file.type).toBe("image/png");
    expect(upload.calls[0].file.name).toBe("acme-ui-sets-dunes-signet.png");
    expect(upload.calls[0].meta).toEqual({ source: "theme-brand-signet" });
    expect(saved.brand).toEqual({
      slogan: { label: "Hi" },
      signet: { sourceKind: "asset", assetId: 41, url: "/api/site/media/41/content" },
    });
  });

  it("uploads an inline picture the record carries itself, over the Set's", async () => {
    const saved = await materializePhiThemeBrandSignet(
      { brand: { signet: { sourceKind: "url", sourceUrl: "data:image/png;base64,iVBORw0KGgo=" } } },
      coreSet,
    );
    expect(upload.calls).toHaveLength(1);
    expect(saved.brand?.signet).toMatchObject({ sourceKind: "asset", assetId: 41 });
  });

  it("leaves a Signet that already is an Asset, and uploads nothing", async () => {
    const theme = { brand: { signet: { sourceKind: "asset", assetId: 5 } as const } };
    expect(await materializePhiThemeBrandSignet(theme, moduleSet)).toBe(theme);
    expect(upload.calls).toHaveLength(0);
  });

  it("follows the core Set and never copies, as it does for every core block", async () => {
    const theme = { brand: {} };
    expect(await materializePhiThemeBrandSignet(theme, { ...coreSet, signet: "data:image/png;base64,AAAA" })).toBe(theme);
    expect(await materializePhiThemeBrandSignet({}, { ...moduleSet, signet: null })).toEqual({});
    expect(upload.calls).toHaveLength(0);
  });

  it("does not fetch a picture on somebody else's server", async () => {
    const theme = { brand: { signet: { sourceKind: "url", sourceUrl: "https://example.com/s.png" } as const } };
    expect(await materializePhiThemeBrandSignet(theme, moduleSet)).toBe(theme);
    expect(upload.calls).toHaveLength(0);
  });
});
