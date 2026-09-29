import { describe, expect, it } from "vitest";

import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../components/regions/presets/phi-base-page-layout";
import { PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../types/access";
import type { PhiCmsRoutePresetDescriptor } from "../../types/cms-module-descriptors";
import { buildPhiAdminSidebarRoutePresetDescriptor } from "./admin-sidebar-route";
import { PHI_AUTH_RUNTIME_MODULE_ROUTES } from "./auth/presets";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ROUTES } from "./observability/presets";

const loadTree = (() => {
  throw new Error("not loaded");
}) as PhiCmsRoutePresetDescriptor["loadTree"];

/* Serialized, so the comparison sees key order as well as values. */
const shape = (descriptor: unknown) => JSON.stringify(descriptor);

describe("buildPhiAdminSidebarRoutePresetDescriptor", () => {
  it("places a sidebar Page before Settings", () => {
    const descriptor = buildPhiAdminSidebarRoutePresetDescriptor({
      ownerModuleId: "@phis/ui/modules/observability",
      presetKey: "admin-logs-page",
      title: "Logs",
      path: "/logs",
      placement: "sidebar",
      itemKey: "@phis/ui/modules/observability/nav/admin/logs",
      icon: "antd:file-search",
      loadTree,
    });
    const expected = {
      ownerModuleId: "@phis/ui/modules/observability",
      presetKey: "admin-logs-page",
      presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
      area: "admin",
      title: "Logs",
      path: "/logs",
      navigation: [{
        navKey: "admin:sidebar",
        parentItemKey: null,
        before: "@phis/ui/modules/admin/nav/settings",
        item: {
          itemKey: "@phis/ui/modules/observability/nav/admin/logs",
          label: { defaultMessage: "Logs" },
          icon: "antd:file-search",
          routePresetKey: "admin-logs-page",
        },
      }],
      loadTree,
    };
    expect(descriptor).toEqual(expected);
    expect(shape(descriptor)).toBe(shape(expected));
    expect(shape(PHI_OBSERVABILITY_RUNTIME_MODULE_ROUTES[0])).toBe(shape(expected));
  });

  it("mounts a settings Page under Settings, visible to Site administrators", () => {
    const descriptor = buildPhiAdminSidebarRoutePresetDescriptor({
      ownerModuleId: "@phis/ui/modules/auth",
      presetKey: "admin-auth-settings-page",
      title: "Authentication",
      path: "/settings/authentication",
      placement: "settings",
      itemKey: "@phis/ui/modules/auth/nav/admin/settings",
      icon: "antd:safety-certificate",
      loadTree,
    });
    const expected = {
      ownerModuleId: "@phis/ui/modules/auth",
      presetKey: "admin-auth-settings-page",
      presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
      area: "admin",
      title: "Authentication",
      path: "/settings/authentication",
      mount: { mountKey: "settings" },
      navigation: [{
        navKey: "admin:sidebar",
        parentItemKey: "@phis/ui/modules/admin/nav/settings",
        item: {
          itemKey: "@phis/ui/modules/auth/nav/admin/settings",
          accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN,
          label: { defaultMessage: "Authentication" },
          icon: "antd:safety-certificate",
          routePresetKey: "admin-auth-settings-page",
        },
      }],
      loadTree,
    };
    expect(descriptor).toEqual(expected);
    expect(shape(descriptor)).toBe(shape(expected));
    const shipped = PHI_AUTH_RUNTIME_MODULE_ROUTES.find(
      (route) => route.presetKey === "admin-auth-settings-page",
    );
    expect(shape(shipped)).toBe(shape(expected));
  });
});
