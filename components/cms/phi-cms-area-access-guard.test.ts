import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  unauthorized: vi.fn(() => {
    throw new Error("unauthorized");
  }),
  forbidden: vi.fn(() => {
    throw new Error("forbidden");
  }),
}));
vi.mock("next/navigation", () => navigation);

const areaDefinitions = vi.hoisted(() => new Map<string, { accessPolicy: unknown }>());
vi.mock("../../plugins/runtime-modules/descriptor-compiler", () => ({
  resolvePhiCmsDescriptorCatalog: () => ({ areaDefinitions }),
}));

const publicLogin = vi.hoisted(() => ({ href: "/en/login" as string | null }));
vi.mock("../../server-helpers/public-login-route", () => ({
  resolvePhiPublicLoginHref: vi.fn(async () => publicLogin.href),
}));

import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import type { PhiBlockRuntimeViewer } from "../../types/widget-runtime";
import { PHI_VIEWER_ACCESS_AUTHENTICATED, PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../types/access";
import { guardPhiCmsAreaAccess } from "./phi-cms-area-access-guard";

const cmsBridge = { runtimeModuleCatalog: new Map() } as unknown as PhiCmsSiteBridge;

function viewer(access: "public" | "authenticated", resolvedArea: "public" | "app" | "admin" | null) {
  return {
    access,
    resolvedArea,
    roleClaims: [],
    groupClaims: [],
    authorizationRevision: 0,
  } as PhiBlockRuntimeViewer;
}

function guard(overrides: Partial<Parameters<typeof guardPhiCmsAreaAccess>[0]> = {}) {
  return guardPhiCmsAreaAccess({
    cmsBridge,
    resolvedRoute: { rootKind: "area", area: "admin", locale: "de" },
    viewer: viewer("public", "public"),
    pathname: "/admin/users",
    serverCapabilities: null,
    isRevisionPreview: false,
    ...overrides,
  });
}

describe("guardPhiCmsAreaAccess", () => {
  beforeEach(() => {
    areaDefinitions.clear();
    areaDefinitions.set("admin", { accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED });
    areaDefinitions.set("app", { accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED });
    publicLogin.href = "/en/login";
  });

  it("sends a signed-out visitor to the Public login with the path to come back to", async () => {
    await expect(guard()).rejects.toThrow(
      `redirect:/en/login?${new URLSearchParams({ next: "/admin/users" })}`,
    );
  });

  it("falls back to the Area root as the way back when the request path is unknown", async () => {
    await expect(guard({ pathname: "  " })).rejects.toThrow(
      `redirect:/en/login?${new URLSearchParams({ next: "/admin" })}`,
    );
  });

  it("refuses outright where no Auth Module owns the login route", async () => {
    publicLogin.href = null;
    await expect(guard()).rejects.toThrow("unauthorized");
  });

  it("sends anyone else back to the root of the Area they resolve to", async () => {
    areaDefinitions.set("admin", { accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN });
    await expect(guard({ viewer: viewer("authenticated", "app") })).rejects.toThrow("redirect:/app");
  });

  it("refuses instead of forwarding where the way back would be refused as well", async () => {
    areaDefinitions.set("admin", { accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN });
    // Home is this very Area: a forward would land here again.
    await expect(guard({ viewer: viewer("authenticated", "admin") })).rejects.toThrow("forbidden");
    // Home refuses this viewer too.
    areaDefinitions.set("app", { accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN });
    await expect(guard({ viewer: viewer("authenticated", "app") })).rejects.toThrow("forbidden");
    // Home is not an Area this build declares.
    areaDefinitions.delete("app");
    await expect(guard({ viewer: viewer("authenticated", "app") })).rejects.toThrow("forbidden");
  });

  it("lets a viewer through who may enter", async () => {
    await expect(guard({ viewer: viewer("authenticated", "app") })).resolves.toBeUndefined();
  });

  it("does not guard a revision preview, a locale root, an unknown Area or an unresolved viewer", async () => {
    await expect(guard({ isRevisionPreview: true })).resolves.toBeUndefined();
    await expect(
      guard({ resolvedRoute: { rootKind: "locale", area: "admin", locale: "de" } }),
    ).resolves.toBeUndefined();
    await expect(guard({ viewer: viewer("public", null) })).resolves.toBeUndefined();
    areaDefinitions.clear();
    await expect(guard()).resolves.toBeUndefined();
  });
});
