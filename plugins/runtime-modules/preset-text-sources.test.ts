import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
/*
 * The words stay the source's: the viewer reads English, the Modules' source language, so no Label Set
 * asks Core for a translation. Core is not there; anything that still calls it fails the build loudly.
 */
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));
/*
 * What the settings Pages and an entry's Page read from Core before they are drawn, stood in for: the
 * Preset decides whose words those are, whatever the values happen to be.
 */
vi.mock("../../gateway/site-settings", () => ({
  getResolvedSiteAdminSettings: async () => ({
    key: "example",
    name: "Example",
    hostname: "example.test",
    publicBaseUrl: "https://example.test",
    supportEmail: "support@example.test",
    mailFrom: "",
    mailFromName: "",
    contactRecipient: "",
  }),
}));
vi.mock("../../gateway/site-auth-settings", () => ({
  getResolvedSiteAuthAdminSettings: async () => ({
    policy: { registrationMode: "automatic", existingAccountLinking: "verified-email-confirm", allowPrivilegedAutoLink: false },
    passwordMethod: { enabled: true, sortOrder: 10 },
    totpPolicy: { required: false, enforcement: "next-login", graceUntil: null, roles: [] },
  }),
}));
vi.mock("../../gateway/site-media-settings", () => ({
  getResolvedSiteMediaSettings: async () => ({
    userSpacesEnabled: true,
    groupSpacesEnabled: true,
    defaultUserQuotaBytes: null,
    defaultGroupQuotaBytes: null,
    defaultAddonQuotaBytes: null,
    maxUserQuotaBytes: null,
    maxGroupQuotaBytes: null,
    maxAddonQuotaBytes: null,
    maxObjectBytes: 134217728,
    addonSpaces: [],
    storage: {
      profiles: [{ id: 1, key: "local", providerId: "@phis/server/storage-local", local: true, disabled: false, spaces: 1 }],
      siteSpaceProfileId: 1,
      defaultUserProfileId: null,
      defaultGroupProfileId: null,
      allowedProfileIds: [],
    },
  }),
}));
vi.mock("../../server-helpers/content-entry-page", () => ({
  loadPhiContentEntryPage: async (_runtime: unknown, { slug }: { slug: string }) =>
    ({ entry: { title: "Sample", subtitle: "", slug }, related: [] }),
}));
vi.stubGlobal("fetch", async (input: unknown) => {
  throw new Error(`no Core in this test: ${String(input)}`);
});

import { PHI_CORE_ROLE_PROVIDER_ID } from "@phis/contracts/access";

import { PHI_BUILDER_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "./area-contributions/builder";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { resolvePhiCmsDescriptorCatalog } from "./descriptor-compiler";
import { resolvePhiCmsAreaMask, type PhiCmsAreaKey } from "../../constants/cms-areas";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { createPhiModuleMediaResolver } from "../../helpers/module-media";
import { checkPhiPresetTextSources } from "../../module-page-check";
import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../types/cms";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import { PHI_EMPTY_MODULE_MEDIA_LOADER } from "../../types/module-media";

/**
 * Whose words phis-ui's own Presets write (`helpers/preset-text-source-check.ts`).
 *
 * Every route, Area shell and Area overlay a first-party Module ships is built and checked: a Widget
 * with text has to say whether its words are the Module's (`"preset"`) or the Site's (`"site"`). Left
 * unsaid, a Module's words would be translated per Site as if an author had written them.
 */

const ALL_BASE_ROLE_FLAGS = 0b111_1111;

const runtime = {
  locale: { current: "en" },
  site: {
    id: 1,
    key: "example",
    name: "Example",
    defaultLocale: "en",
    sourceLocale: "en",
    availableLocales: [{ code: "en", label: "English" }],
  },
  viewer: {
    access: "authenticated",
    roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags: ALL_BASE_ROLE_FLAGS }],
    groupClaims: [],
  },
} as unknown as PhiBlockRuntime;

/**
 * Loaders that cannot be built in a unit test, with the reason. Keyed `<kind> <moduleId>/<presetKey>`.
 * Empty today; a new entry needs a reason, never a silent skip.
 */
const UNBUILDABLE: Readonly<Record<string, string>> = {};

const catalog = resolvePhiCmsDescriptorCatalog(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG);

const activeModuleIds = new Set<PhiRuntimeModuleId>(
  PHI_BUILDER_RUNTIME_MODULE_AREA_CONTRIBUTIONS.map((entry) => entry.moduleId),
);

function pageAt(area: PhiCmsAreaKey, path: string): PhiCmsPageNode {
  const areaMask = resolvePhiCmsAreaMask(area);
  return {
    id: -1,
    siteId: 1,
    areaMask,
    path,
    pageType: PhiCmsPageType.Standard,
    status: PhiCmsStatus.Published,
    flags: 0,
    visibilityMask: areaMask,
    accessPolicy: { access: "anyone" },
    titleMsgId: null,
    descriptionMsgId: null,
    heroRootLayoutNodeId: null,
    headerBottomRootLayoutNodeId: null,
    siderRightRootLayoutNodeId: null,
    footerTopRootLayoutNodeId: null,
    drawerRightRootLayoutNodeId: null,
    contentRootLayoutNodeId: null,
    layoutConfig: {},
  };
}

/** A route's parameters with a stand-in value each, and the address they fill in. */
function standInParams(path: string) {
  const params: Record<string, string> = {};
  const filled = path.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
    params[name] = "sample";
    return "sample";
  });
  return { params, path: filled };
}

type PresetLoad = {
  key: string;
  load: () => PhiResolvedCmsPageTree | Promise<PhiResolvedCmsPageTree>;
};

function collectPresetLoads(): PresetLoad[] {
  const loads = new Map<string, PresetLoad>();
  const seenModules = new Set<PhiRuntimeModuleId>();
  for (const { moduleId, catalogEntry } of PHI_BUILDER_RUNTIME_MODULE_AREA_CONTRIBUTIONS) {
    if (seenModules.has(moduleId)) continue;
    seenModules.add(moduleId);
    for (const descriptor of catalogEntry.routes ?? []) {
      const key = `route ${descriptor.ownerModuleId}/${descriptor.presetKey}`;
      const { params, path } = standInParams(descriptor.path);
      const runtimeInArea = { ...runtime, area: descriptor.area };
      loads.set(key, {
        key,
        load: () => descriptor.loadTree({
          page: { ...pageAt(descriptor.area, path), flags: descriptor.defaultPageFlags ?? 0 },
          runtime: runtimeInArea,
          catalog,
          activeModuleIds,
          params,
          media: createPhiModuleMediaResolver(descriptor.ownerModuleId, PHI_EMPTY_MODULE_MEDIA_LOADER),
        }),
      });
    }
    for (const descriptor of catalogEntry.areaShells ?? []) {
      const key = `shell ${descriptor.ownerModuleId}/${descriptor.presetKey}`;
      loads.set(key, {
        key,
        load: () => descriptor.loadTree({
          page: pageAt(descriptor.area, "/"),
          runtime: { ...runtime, area: descriptor.area },
          catalog,
          media: createPhiModuleMediaResolver(descriptor.ownerModuleId, PHI_EMPTY_MODULE_MEDIA_LOADER),
        }),
      });
    }
    for (const descriptor of catalogEntry.areaOverlays ?? []) {
      const key = `overlay ${descriptor.ownerModuleId}/${descriptor.presetKey}`;
      loads.set(key, {
        key,
        load: () => descriptor.loadTree({
          page: pageAt(descriptor.area, "/"),
          runtime: { ...runtime, area: descriptor.area },
          catalog,
          media: createPhiModuleMediaResolver(descriptor.ownerModuleId, PHI_EMPTY_MODULE_MEDIA_LOADER),
        }),
      });
    }
  }
  return [...loads.values()];
}

describe("phis-ui's Presets", () => {
  it("say of every Widget with text whose words it holds", async () => {
    const loads = collectPresetLoads();
    expect(loads.length).toBeGreaterThan(0);
    for (const key of Object.keys(UNBUILDABLE)) {
      expect(loads.some((load) => load.key === key), `${key} is excused but no longer shipped`).toBe(true);
    }

    const problems: string[] = [];
    for (const { key, load } of loads) {
      if (UNBUILDABLE[key]) continue;
      let tree: PhiResolvedCmsPageTree;
      try {
        tree = await load();
      } catch (error) {
        problems.push(`${key}: does not build (${error instanceof Error ? error.message : String(error)})`);
        continue;
      }
      for (const finding of checkPhiPresetTextSources(tree)) {
        problems.push(`${key} -> ${finding.node}: ${finding.message}`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
