import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PhiRuntimeModuleDefinition, PhiRuntimeModuleId } from "../../../types";
import {
  PhiBuilderAreaStructureTakenError,
  publishPhiDeveloperBuilderModulesDraft,
  savePhiDeveloperBuilderDraft,
  savePhiDeveloperBuilderModulesDraft,
} from "./persistence";
import { getPhiBuilderRegionDraftKey, PHI_BUILDER_SHELL_REGION_KEYS } from "./region-keys";

/*
 * An Area's Module selection is written apart from its structure: no shell identity, no baseline, only
 * `config.modules`. A structure save Core refuses because the Area stores its structure for another
 * shell comes back as the error the Builder offers to clear the stored structure on.
 */

const SITE_ID = "@acme/site/modules/site" as PhiRuntimeModuleId;
const BASE = { ownerModuleId: "@phis/ui/modules/public" as PhiRuntimeModuleId, presetKey: "public-default-area-preset" };
const PROVIDER = { ownerModuleId: SITE_ID, presetKey: "public-shell", sourcePresetVersion: 1 };

type Call = { path: string; method: string; body: Record<string, unknown> | null };
let calls: Call[] = [];
let answer: (call: Call) => { status: number; body: unknown } = () => ({ status: 200, body: {} });

beforeEach(() => {
  calls = [];
  vi.stubGlobal("fetch", async (path: string, init?: { method?: string; body?: string }) => {
    const call = {
      path: String(path),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(init.body) as Record<string, unknown> : null,
    };
    calls.push(call);
    const { status, body } = answer(call);
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const siteDefinition = {
  moduleId: SITE_ID,
  kind: "module",
  eligibleAreas: ["public"],
} as unknown as PhiRuntimeModuleDefinition;

const modulesState = (draft: { revisionId: number; version: number; nextNodeSequence: number } | null) => ({
  draftAllocations: draft ? { "public:public:modules": { ...draft, sourcePreset: null } } : {},
  runtimeModuleDefinitions: [siteDefinition],
  runtimeModuleIdsByArea: { public: [SITE_ID] },
  publicRoutePaths: [],
  publicRouteClaims: [],
}) as unknown as Parameters<typeof savePhiDeveloperBuilderModulesDraft>[0];

describe("saving an Area's Module selection", () => {
  it("writes the selection alone: no shell identity, no baseline", async () => {
    answer = (call) => call.method === "GET"
      ? { status: 404, body: { error: "CMS area Module draft not found." } }
      : { status: 200, body: { area: "public", revisionId: 5, version: 1, nextNodeSequence: 1 } };
    const saved = await savePhiDeveloperBuilderModulesDraft(modulesState(null), { scope: { area: "public" } });

    const write = calls.find((call) => call.method === "POST")!;
    expect(write.path).toBe("/api/site/cms/area/modules");
    expect(Object.keys(write.body!).sort()).toEqual(["area", "config"]);
    expect(Object.keys(write.body!.config as object)).toEqual(["modules"]);
    expect((write.body!.config as { modules: { runtimeModules: unknown } }).modules.runtimeModules).toEqual([SITE_ID]);
    expect(saved).toEqual({ revisionId: 5, version: 1, nextNodeSequence: 1 });
  });

  it("asks the open Module draft by its Area alone and builds on it", async () => {
    answer = (call) => call.method === "GET"
      ? { status: 200, body: { areaMask: 1, revisionId: 4, version: 2, nextNodeSequence: 3, config: { modules: {} } } }
      : { status: 200, body: { area: "public", revisionId: 4, version: 3, nextNodeSequence: 3 } };
    await savePhiDeveloperBuilderModulesDraft(modulesState(null), { scope: { area: "public" } });

    expect(calls[0]!.path).toBe("http://localhost/api/site/cms/area/modules/draft?area=public");
    expect(calls[1]!.body!.draft).toEqual({ revisionId: 4, version: 2, nextNodeSequence: 3 });
  });

  it("publishes by Area and revision", async () => {
    answer = (call) => call.path.endsWith("/publish")
      ? { status: 200, body: { areaMask: 1, revisionId: 6, config: { modules: {} } } }
      : { status: 200, body: { area: "public", revisionId: 6, version: 2, nextNodeSequence: 1 } };
    await publishPhiDeveloperBuilderModulesDraft(
      modulesState({ revisionId: 6, version: 1, nextNodeSequence: 1 }),
      { scope: { area: "public" } },
    );

    const publish = calls.find((call) => call.path.endsWith("/modules/publish"))!;
    expect(publish.body).toEqual({ area: "public", revisionId: 6 });
  });
});

describe("saving a structure while the Area stores one for another shell", () => {
  const shellDrafts = Object.fromEntries(PHI_BUILDER_SHELL_REGION_KEYS.map((regionKey) => [
    getPhiBuilderRegionDraftKey("public", regionKey),
    { sticky: false, offsetTop: 0, size: {}, zIndex: 0, surface: null, rootNode: null },
  ]));
  const structureState = (storedSource: typeof BASE | null) => ({
    area: "public",
    pageKey: "home",
    pageMetaDrafts: {},
    deletedPageDrafts: {},
    draftAllocations: {},
    modulePresetPagesByArea: {
      public: [{
        key: "home",
        title: "Home",
        storagePath: "/",
        sourcePreset: { ownerModuleId: SITE_ID, presetKey: "home-page", sourcePresetVersion: 1 },
      }],
    },
    customPages: {},
    persistedPageCatalogByArea: {},
    areaPresetSourcesByArea: { public: PROVIDER },
    areaShellsByArea: { public: { providerModuleIds: [SITE_ID], storedSource } },
    areaRootRouteDrafts: {},
    areaRootRoutes: {},
    areaMetaDrafts: {},
    areaMeta: {},
    areaControllerSettings: { public: [] },
    pageControllerSettings: {},
  }) as unknown as Parameters<typeof savePhiDeveloperBuilderDraft>[0];

  it("is refused with the stored shell named", async () => {
    answer = (call) => call.method === "GET"
      ? { status: 404, body: { error: "CMS area draft not found." } }
      : { status: 409, body: { error: "CMS snapshot preset identity does not match the requested scope." } };
    const save = savePhiDeveloperBuilderDraft(structureState(BASE), shellDrafts, "structure", { builderPlugins: [] });

    await expect(save).rejects.toBeInstanceOf(PhiBuilderAreaStructureTakenError);
    await save.catch((error: PhiBuilderAreaStructureTakenError) => {
      expect(error.storedSource).toEqual(BASE);
      expect(error.area).toBe("public");
    });
    const write = calls.find((call) => call.method === "POST")!;
    expect(write.path).toBe("/api/site/cms/area");
    expect(write.body!.sourcePreset).toEqual(PROVIDER);
    expect((write.body!.preset as { config: Record<string, unknown> }).config).not.toHaveProperty("modules");
  });

  it("stays an ordinary conflict where nothing is stored for another shell", async () => {
    answer = (call) => call.method === "GET"
      ? { status: 404, body: {} }
      : { status: 409, body: { error: "Draft was written past." } };
    const save = savePhiDeveloperBuilderDraft(structureState(null), shellDrafts, "structure", { builderPlugins: [] });
    await expect(save).rejects.not.toBeInstanceOf(PhiBuilderAreaStructureTakenError);
  });
});
