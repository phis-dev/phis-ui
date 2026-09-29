import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { PHI_VIEWER_ACCESS_ANYONE, PHI_VIEWER_ACCESS_AUTHENTICATED } from "../types/access";

/**
 * Which Area a Form submit is resolved in, and in which locale.
 *
 * The chain behind it -- the Area read, the Module set, the Form registry -- is each its own contract
 * and is stood in for. Left real: the Area key grammar and `canPhiViewerAccess`, which are the rules
 * here.
 */

vi.mock("server-only", () => ({}));

const scope = vi.hoisted(() => ({
  viewer: { access: "public" } as { access: "public" | "authenticated" },
  resolvedLocale: "de",
  localeRequests: [] as Array<{ acceptLanguage: unknown; cookieHeader: unknown }>,
  areaReads: [] as Array<{ area: string; locale: string }>,
  contextLoads: 0,
}));

const PROVIDER = {
  key: "@phis/ui/modules/public/form-handler:contact",
  ownerModuleId: "@phis/ui/modules/public",
  phase: "submit",
  handlerKey: "forms.contact",
};

vi.mock("../plugins/runtime-modules/descriptor-compiler", () => ({
  resolvePhiCmsDescriptorCatalog: () => ({
    areaDefinitions: new Map([
      ["public", {
        area: "public",
        baseModuleId: "@phis/ui/modules/public",
        shellPresetKey: "public",
        accessPolicy: PHI_VIEWER_ACCESS_ANYONE,
      }],
      ["app", {
        area: "app",
        baseModuleId: "@phis/ui/modules/app",
        shellPresetKey: "app",
        accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED,
      }],
    ]),
  }),
}));
vi.mock("../server-helpers/site-locale", () => ({
  fetchResolvedSiteLocale: async (options: { acceptLanguage: unknown; cookieHeader: unknown }) => {
    const { acceptLanguage, cookieHeader } = options;
    scope.localeRequests.push({ acceptLanguage, cookieHeader });
    return { locale: scope.resolvedLocale };
  },
}));
vi.mock("./site-area", () => ({
  getExactSiteArea: async (options: { area: string; locale: string }) => {
    scope.areaReads.push({ area: options.area, locale: options.locale });
    return { preset: { preset: { config: {} } } };
  },
}));
vi.mock("../server-helpers/runtime", () => ({
  loadPhiSiteRequestContext: async () => {
    scope.contextLoads += 1;
    return { viewer: scope.viewer, serverCapabilities: {}, site: { id: "site" } };
  },
  buildPhiBlockRuntime: () => ({}),
}));
vi.mock("../server-helpers/request-runtime", () => ({
  runWithPhiRequestRuntime: async (_runtime: unknown, run: () => unknown) => run(),
}));
vi.mock("../server-helpers/cms-area", () => ({ buildPhiLocalCmsAreaPayload: async () => null }));
vi.mock("./server-capabilities", () => ({ getPhiCapabilitySnapshot: async () => ({}) }));
vi.mock("../plugins/runtime-modules/settings", () => ({ resolvePhiRuntimeModuleIdsForArea: () => [] }));
vi.mock("../helpers/cms-area-config", () => ({ readPhiAreaPresetRuntimeModuleIds: () => [] }));
vi.mock("../plugins/runtime-modules/resolver", () => ({
  resolvePhiRuntimeModuleSet: async () => ({
    activeModuleIds: new Set([PROVIDER.ownerModuleId]),
    formDefinitionsById: new Map(),
    formHandlerProviderDescriptorsByKey: new Map([[PROVIDER.key, PROVIDER]]),
  }),
}));
vi.mock("./form-registry", () => ({
  getResolvedFormDefinition: async ({ formId }: { formId: string }) => ({
    definition: {
      formId,
      ownerModuleId: PROVIDER.ownerModuleId,
      submitHandlerKey: PROVIDER.handlerKey,
      confirmHandlerKey: null,
      previewHandlerKey: null,
    },
  }),
}));

const { resolvePhiServerFormHandler } = await import("./form-handler-resolution");

const FORM_ID = "@phis/ui/modules/public/forms/contact";

function resolve(area: string | null | undefined, headers: Record<string, string> = {}) {
  const loadedAreas: string[] = [];
  const result = resolvePhiServerFormHandler({
    request: new NextRequest("http://site.test/api/site/forms", {
      method: "POST",
      headers: { host: "site.test", ...headers },
    }),
    upstreamBaseUrl: "http://phi.test",
    internalToken: "internal",
    siteKey: "site",
    formId: FORM_ID,
    phase: "submit",
    area,
    loadRuntimeModuleCatalog: async (catalogArea) => {
      loadedAreas.push(catalogArea);
      return new Map() as never;
    },
  });
  return { result, loadedAreas };
}

beforeEach(() => {
  scope.viewer = { access: "public" };
  scope.resolvedLocale = "de";
  scope.localeRequests = [];
  scope.areaReads = [];
  scope.contextLoads = 0;
});

describe("resolvePhiServerFormHandler: Area", () => {
  it("resolves the named Area for a request that carries no Referer", async () => {
    const { result, loadedAreas } = resolve("public");

    expect(await result).toMatchObject({ formId: FORM_ID, area: "public", provider: PROVIDER });
    expect(loadedAreas).toEqual(["public"]);
    expect(scope.areaReads).toEqual([{ area: "public", locale: "de" }]);
  });

  it("does not let the Referer pick the Area", async () => {
    const { result, loadedAreas } = resolve(null, { referer: "http://site.test/admin/settings" });

    expect(await result).toBeNull();
    expect(loadedAreas).toEqual([]);
  });

  it.each([undefined, "", "en", "favicon.ico", "../admin", "public/../admin"])(
    "resolves nothing for %j, which is not an Area",
    async (area) => {
      const { result, loadedAreas } = resolve(area);

      expect(await result).toBeNull();
      expect(loadedAreas).toEqual([]);
    },
  );

  it("normalizes the Area's spelling", async () => {
    const { result } = resolve("  PUBLIC ");

    expect(await result).toMatchObject({ area: "public" });
  });

  it("enters an Area that admits anybody without reading the viewer", async () => {
    await resolve("public").result;

    expect(scope.contextLoads).toBe(0);
  });

  it("refuses an Area the viewer may not enter, before its tree is read", async () => {
    const { result } = resolve("app");

    expect(await result).toBeNull();
    expect(scope.contextLoads).toBe(1);
    expect(scope.areaReads).toEqual([]);
  });

  it("resolves the same Area for a viewer it admits", async () => {
    scope.viewer = { access: "authenticated" };

    expect(await resolve("app").result).toMatchObject({ area: "app" });
    expect(scope.areaReads).toEqual([{ area: "app", locale: "de" }]);
  });
});

describe("resolvePhiServerFormHandler: locale", () => {
  it("reads the Area in the locale the Site resolves, never a path segment", async () => {
    scope.resolvedLocale = "fr";
    await resolve("public", {
      referer: "http://site.test/xx/contact",
      "accept-language": "fr-CH",
      cookie: "phis_locale=fr",
    }).result;

    expect(scope.localeRequests).toEqual([{ acceptLanguage: "fr-CH", cookieHeader: "phis_locale=fr" }]);
    expect(scope.areaReads).toEqual([{ area: "public", locale: "fr" }]);
  });
});
