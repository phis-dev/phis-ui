import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  PhiCmsAreaDefinition,
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsPresetIdentity,
  PhiRuntimeModuleId,
} from "../types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../types/cms-plugins";
import type { PhiCmsAreaModulesSelection, PhiResolvedCmsAreaPresetPayload } from "../types/cms";
import type { PhiSiteAreaRead } from "../gateway/site-area";
import { createPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { resolvePhiCmsDescriptorCatalog } from "../plugins/runtime-modules/descriptor-compiler";
import {
  readPhiCmsAreaForRequest,
  resolvePhiAreaRouteScope,
  resolvePhiCmsAreaShellSource,
} from "./cms-request";

/*
 * A page view reads the Area once, without an identity: the selection decides the active Modules, they
 * decide the shell, and the stored structure applies only when it stands on that shell (CMS.md, "The
 * Area's Module selection").
 */

const PLATFORM_ID = "@test/pkg/modules/platform" as const;
const PUBLIC_ID = "@test/pkg/modules/public" as const;
const SITE_ID = "@acme/site/modules/site" as const;

function definition(moduleId: PhiRuntimeModuleId, kind: "platform" | "module") {
  const key = moduleId.split("/").at(-1)!;
  return {
    moduleId,
    kind,
    eligibleAreas: ["public"],
    serverBinding: { providerId: "@phis/server/core", requiredCapabilities: [] },
    controllerType: `@test/${key}`,
    controller: {
      pluginKey: "@test",
      key,
      title: key,
      allowedMountScopes: ["area"],
      runtimeSignals: { emits: [], listens: [] },
    },
    title: moduleId,
    description: `Test runtime module ${moduleId}.`,
    category: "other",
    iconFamily: "test",
    controllerMountPolicy: "area",
  } satisfies PhiRuntimeModuleDefinition;
}

function shell(ownerModuleId: PhiRuntimeModuleId, presetKey: string): PhiCmsAreaShellPresetDescriptor {
  return {
    ownerModuleId,
    presetKey,
    shellPresetVersion: 1,
    area: "public",
    loadTree: () => {
      throw new Error("not loaded");
    },
  };
}

function entry(
  moduleId: PhiRuntimeModuleId,
  areaShells: readonly PhiCmsAreaShellPresetDescriptor[] = [],
  kind: "platform" | "module" = "module",
): PhiRuntimeModuleCatalogEntry {
  return {
    definition: definition(moduleId, kind),
    widgets: [],
    layouts: [],
    areaShells,
    load: async () => {
      throw new Error("not executed");
    },
  };
}

const areaDefinition: PhiCmsAreaDefinition = {
  area: "public",
  baseModuleId: PUBLIC_ID,
  shellPresetKey: "public-shell",
  shellProviders: "module",
  accessPolicy: { access: "anyone" },
};

const runtimeModuleCatalog = createPhiRuntimeModuleCatalog([
  entry(PLATFORM_ID, [], "platform"),
  entry(PUBLIC_ID, [shell(PUBLIC_ID, "public-shell")]),
  entry(SITE_ID, [shell(SITE_ID, "site-shell")]),
], [areaDefinition]);
const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);

const BASE: PhiCmsPresetIdentity = { ownerModuleId: PUBLIC_ID, presetKey: "public-shell" };
const SITE: PhiCmsPresetIdentity = { ownerModuleId: SITE_ID, presetKey: "site-shell" };

const selection = (...moduleIds: PhiRuntimeModuleId[]): PhiCmsAreaModulesSelection => ({
  revisionId: 7,
  config: { modules: { runtimeModules: moduleIds } },
});

const structure = (source: PhiCmsPresetIdentity, marker: string): PhiResolvedCmsAreaPresetPayload => ({
  areaMask: 1,
  sourcePreset: { ...source, sourcePresetVersion: 1 },
  preset: {
    preset: { id: 1, siteId: 1, areaMask: 1, status: 1, flags: 0, visibilityMask: 1, config: { marker } },
    regions: [],
    overlays: [],
    layoutNodes: [],
    contentWidgets: [],
  },
});

const scope = (read: Pick<PhiSiteAreaRead, "modules" | "structure"> | null) => resolvePhiAreaRouteScope({
  runtimeModuleCatalog,
  catalog,
  area: "public",
  read,
  serverCapabilities: null,
});

const identityOf = (binding: { descriptor: PhiCmsPresetIdentity }) =>
  `${binding.descriptor.ownerModuleId}/${binding.descriptor.presetKey}`;

describe("an Area as a page view reads it", () => {
  it("takes the base shell and its preset where nothing is stored", () => {
    const result = scope(null);
    expect(identityOf(result.shellBinding)).toBe(`${PUBLIC_ID}/public-shell`);
    expect(result.structure).toBeNull();
  });

  it("uses a stored structure only when it stands on the effective shell", () => {
    const stored = structure(BASE, "base");
    expect(scope({ modules: selection(), structure: stored }).structure).toBe(stored);
    // The provider is active: its shell applies, and the base structure is kept but not used.
    const withProvider = scope({ modules: selection(SITE_ID), structure: stored });
    expect(identityOf(withProvider.shellBinding)).toBe(`${SITE_ID}/site-shell`);
    expect(withProvider.structure).toBeNull();
  });

  it("takes a structure stored for the provider's shell while the provider is active, and only then", () => {
    const stored = structure(SITE, "site");
    expect(scope({ modules: selection(SITE_ID), structure: stored }).structure).toBe(stored);
    expect(scope({ modules: selection(), structure: stored }).structure).toBeNull();
  });

  it("reads the active Modules from the selection, never from the structure", () => {
    const result = scope({ modules: selection(SITE_ID), structure: null });
    expect(result.activeModuleIds.has(SITE_ID)).toBe(true);
    expect(scope({ modules: selection(), structure: null }).activeModuleIds.has(SITE_ID)).toBe(false);
  });

  it("names the shell a selection chooses", () => {
    const source = (modules: PhiCmsAreaModulesSelection | null) => resolvePhiCmsAreaShellSource({
      runtimeModuleCatalog,
      area: "public",
      modules,
      serverCapabilities: null,
    });
    expect(source(null)).toEqual(BASE);
    expect(source(selection(SITE_ID))).toEqual(SITE);
  });
});

describe("the Area read of a request", () => {
  const resolveShellSource = (modules: PhiCmsAreaModulesSelection | null) => resolvePhiCmsAreaShellSource({
    runtimeModuleCatalog,
    area: "public",
    modules,
    serverCapabilities: null,
  });

  it("is one read without an identity for a page view", async () => {
    const calls: unknown[] = [];
    const live = { areaMask: 1, modules: selection(), structure: structure(BASE, "base") };
    const read = await readPhiCmsAreaForRequest({
      loadArea: async (request) => {
        calls.push(request);
        return live;
      },
      previewsArea: false,
      resolveShellSource,
    });
    expect(calls).toEqual([{ sourcePreset: null, stage: "live" }]);
    expect(read).toEqual({ modules: live.modules, structure: live.structure });
  });

  it("asks a reviewed revision under the shell the live selection chooses", async () => {
    const calls: unknown[] = [];
    const reviewed = structure(SITE, "reviewed");
    const read = await readPhiCmsAreaForRequest({
      loadArea: async (request) => {
        calls.push(request);
        return request.stage === "live"
          ? { areaMask: 1, modules: selection(SITE_ID), structure: structure(SITE, "live") }
          : { areaMask: 1, modules: selection(SITE_ID), structure: reviewed, revisionId: 9 };
      },
      previewsArea: true,
      resolveShellSource,
    });
    expect(calls).toEqual([
      { sourcePreset: null, stage: "live" },
      { sourcePreset: SITE, stage: "requested" },
    ]);
    expect(read.structure).toBe(reviewed);
  });

  it("takes the live structure under the shell a reviewed Module selection chooses", async () => {
    const liveBase = structure(BASE, "live");
    const read = await readPhiCmsAreaForRequest({
      loadArea: async (request) => request.stage === "live"
        ? { areaMask: 1, modules: selection(SITE_ID), structure: liveBase }
        // A Modules revision that switches the provider off, beside the published structure of the shell
        // it was asked under.
        : { areaMask: 1, modules: selection(), structure: null, revisionId: 9 },
      previewsArea: true,
      resolveShellSource,
    });
    expect(read.modules).toEqual(selection());
    expect(read.structure).toBe(liveBase);
  });

  it("answers what is live where the reviewed revision is not there", async () => {
    const live = { areaMask: 1, modules: selection(), structure: structure(BASE, "live") };
    const read = await readPhiCmsAreaForRequest({
      loadArea: async (request) => (request.stage === "live" ? live : null),
      previewsArea: true,
      resolveShellSource,
    });
    expect(read).toEqual({ modules: live.modules, structure: live.structure });
  });
});
