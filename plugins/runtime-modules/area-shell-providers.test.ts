import { describe, expect, it } from "vitest";

import type {
  PhiCmsAreaDefinition,
  PhiCmsAreaShellPresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../../types/cms-plugins";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import {
  compilePhiCmsDescriptorCatalog,
  listPhiCmsAreaShellProviders,
  resolvePhiCmsAreaBaseShellPresetBinding,
  resolvePhiCmsAreaShellPresetBinding,
} from "./descriptor-compiler";

/*
 * A Module may bring the shell of an Area whose definition takes one (`shellProviders: "module"`), and
 * while it is active the Area takes that shell instead of its base Module's (MODULES.md, "A Module's own
 * Area shell"). One provider per Area; every other Area keeps the base-only rule.
 */

const PLATFORM_ID = "@test/pkg/modules/platform" as const;
const PUBLIC_ID = "@test/pkg/modules/public" as const;
const ADMIN_ID = "@test/pkg/modules/admin" as const;
const SITE_ID = "@acme/site/modules/site" as const;
const OTHER_ID = "@acme/other/modules/other" as const;

function definition(
  moduleId: PhiRuntimeModuleId,
  kind: "platform" | "module",
  eligibleAreas: readonly PhiCmsAreaKey[],
) {
  const key = moduleId.split("/").at(-1)!;
  return {
    moduleId,
    kind,
    eligibleAreas: [...eligibleAreas],
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

function shell(ownerModuleId: PhiRuntimeModuleId, presetKey: string, area: PhiCmsAreaKey): PhiCmsAreaShellPresetDescriptor {
  return {
    ownerModuleId,
    presetKey,
    shellPresetVersion: 1,
    area,
    loadTree: () => {
      throw new Error("not loaded");
    },
  };
}

function entry(
  moduleId: PhiRuntimeModuleId,
  eligibleAreas: readonly PhiCmsAreaKey[],
  areaShells: readonly PhiCmsAreaShellPresetDescriptor[] = [],
  kind: "platform" | "module" = "module",
): PhiRuntimeModuleCatalogEntry {
  return {
    definition: definition(moduleId, kind, eligibleAreas),
    widgets: [],
    layouts: [],
    areaShells,
    load: async () => {
      throw new Error("not executed");
    },
  };
}

const areaDefinitions: readonly PhiCmsAreaDefinition[] = [
  {
    area: "public",
    baseModuleId: PUBLIC_ID,
    shellPresetKey: "public-shell",
    shellProviders: "module",
    accessPolicy: { access: "anyone" },
  },
  {
    area: "admin",
    baseModuleId: ADMIN_ID,
    shellPresetKey: "admin-shell",
    shellProviders: "base",
    accessPolicy: { access: "anyone" },
  },
];

function compile(extra: readonly PhiRuntimeModuleCatalogEntry[], definitions = areaDefinitions) {
  const entries = [
    entry(PLATFORM_ID, ["public", "admin"], [], "platform"),
    entry(PUBLIC_ID, ["public"], [shell(PUBLIC_ID, "public-shell", "public")]),
    entry(ADMIN_ID, ["admin"], [shell(ADMIN_ID, "admin-shell", "admin")]),
    ...extra,
  ];
  return compilePhiCmsDescriptorCatalog({
    catalog: createPhiRuntimeModuleCatalog(entries, definitions),
    areaDefinitions: definitions,
  });
}

const identity = (binding: { descriptor: { ownerModuleId: string; presetKey: string } } | null) =>
  binding ? `${binding.descriptor.ownerModuleId}/${binding.descriptor.presetKey}` : null;

describe("a Module's own Area shell, as the compiler takes it", () => {
  it("registers a provider apart from the base shell of an Area that takes one", () => {
    const catalog = compile([entry(SITE_ID, ["public"], [shell(SITE_ID, "public-shell", "public")])]);

    expect(identity(resolvePhiCmsAreaBaseShellPresetBinding(catalog, "public"))).toBe(`${PUBLIC_ID}/public-shell`);
    expect(listPhiCmsAreaShellProviders(catalog, "public").map((binding) => binding.moduleId)).toEqual([SITE_ID]);
    // Composition and identity lookups see both.
    expect(catalog.areaShellByIdentity.size).toBe(3);
  });

  it("refuses a provider for an Area that takes its shell from its base Module only", () => {
    expect(() => compile([entry(SITE_ID, ["admin"], [shell(SITE_ID, "admin-shell", "admin")])]))
      .toThrow(/Area "admin" takes its shell from its base Module only/);
  });

  it("refuses a second shell of one Module for one Area", () => {
    expect(() => compile([entry(SITE_ID, ["public"], [
      shell(SITE_ID, "public-shell", "public"),
      shell(SITE_ID, "public-shell-2", "public"),
    ])])).toThrow(/more than one shell preset for Area "public"/);
  });

  it("refuses a provider for an Area its Module is not eligible for", () => {
    expect(() => compile([entry(SITE_ID, ["admin"], [shell(SITE_ID, "public-shell", "public")])]))
      .toThrow(/not eligible for Area "public"/);
  });

  it("keeps the base rule for the base Module: its shell is the one its definition names", () => {
    expect(() => compile([], areaDefinitions.map((areaDefinition) => areaDefinition.area === "public"
      ? { ...areaDefinition, shellPresetKey: "another-shell" }
      : areaDefinition)))
      .toThrow(/does not match Area "public" base definition/);
  });

  it("refuses a Builder that would take its shell from a Module", () => {
    const builderId = "@test/pkg/modules/builder" as const;
    const builder: PhiCmsAreaDefinition = {
      area: "builder",
      baseModuleId: builderId,
      shellPresetKey: "builder-shell",
      shellProviders: "module",
      accessPolicy: { access: "anyone" },
    };
    expect(() => compile(
      [entry(builderId, ["builder"], [shell(builderId, "builder-shell", "builder")])],
      [...areaDefinitions, builder],
    ))
      .toThrow(/Area "builder" takes its shell from its base Module only/);
  });
});

describe("the effective shell of an Area", () => {
  const catalog = compile([
    entry(SITE_ID, ["public"], [shell(SITE_ID, "public-shell", "public")]),
    entry(OTHER_ID, ["public"], [shell(OTHER_ID, "frame", "public")]),
  ]);
  const active = (...moduleIds: PhiRuntimeModuleId[]) => new Set<PhiRuntimeModuleId>([PLATFORM_ID, PUBLIC_ID, ...moduleIds]);

  it("is the base shell while no active Module brings one", () => {
    expect(identity(resolvePhiCmsAreaShellPresetBinding(catalog, "public", active())))
      .toBe(`${PUBLIC_ID}/public-shell`);
  });

  it("is the shell of the one active Module that brings one", () => {
    expect(identity(resolvePhiCmsAreaShellPresetBinding(catalog, "public", active(SITE_ID))))
      .toBe(`${SITE_ID}/public-shell`);
    expect(identity(resolvePhiCmsAreaShellPresetBinding(catalog, "public", active(OTHER_ID))))
      .toBe(`${OTHER_ID}/frame`);
  });

  it("refuses two active providers rather than choosing one", () => {
    expect(() => resolvePhiCmsAreaShellPresetBinding(catalog, "public", active(SITE_ID, OTHER_ID)))
      .toThrow(/more than one active Module that brings its shell/);
  });

  it("stays the base shell in an Area of the base rule", () => {
    expect(identity(resolvePhiCmsAreaShellPresetBinding(catalog, "admin", active(SITE_ID))))
      .toBe(`${ADMIN_ID}/admin-shell`);
  });
});
