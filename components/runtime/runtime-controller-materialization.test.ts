import { describe, expect, it } from "vitest";

import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiCmsOverlayNode,
  PhiResolvedCmsRenderableTree,
} from "../../types/cms";
import type { PhiRuntimeControllerSetting } from "../../types/cms-plugins";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import {
  collectPhiRuntimeControllerConfigOverlays,
  materializePhiOverlayRuntimeControllerSettings,
  materializePhiRuntimeControllerSettings,
} from "./runtime-controller-materialization";

/*
 * One contract for what a tree tells its Controllers, on a Page and on an Area. These are the three
 * places it can end up: mounted in the tree's scope, laid over a Controller the Area already runs, or
 * carried with the deferred Overlay that is the only one asking for it.
 */

const AUTH = "@phis/ui/modules/auth/controller/default";
const ASSET = "@phis/ui/modules/asset/controller/default";
const GROUPS = "@phis/ui/modules/groups/controller/default";
const STEP_WIDGET = "@phis/ui/modules/auth/widgets/auth-workflow";

const OVERLAY_ID = "a:overlay" as PhiCmsInstanceId;
const OVERLAY_LAYOUT_ID = "a:overlay-layout" as PhiCmsInstanceId;
const STEP_ID = "a:step" as PhiCmsInstanceId;

const routes = (receiver: string) => ({
  signalRoutes: {
    emits: [{
      routeKey: "open",
      capabilityId: "loginOverlayOpen",
      scope: "area",
      channel: "dialog",
      action: "activate",
      valueType: "none",
      receiver,
    }],
  },
});

const stepPlugin = {
  parseConfig: (raw: Record<string, unknown>) => raw,
  requiredRuntimeControllers: () => [{ type: AUTH as `${string}/${string}`, instanceKey: "default", config: { asked: true } }],
};
const widgetPluginsByType = new Map([[STEP_WIDGET, stepPlugin]]);

function areaTree(controllerSettings: readonly PhiRuntimeControllerSetting[]): PhiResolvedCmsRenderableTree {
  return {
    regions: [],
    overlays: [{ id: OVERLAY_ID, bodyLayoutNodeId: OVERLAY_LAYOUT_ID } as unknown as PhiCmsOverlayNode],
    layoutNodes: [{ id: OVERLAY_LAYOUT_ID, parentLayoutNodeId: null } as unknown as PhiCmsLayoutNode],
    contentWidgets: [{
      id: STEP_ID,
      parentLayoutNodeId: OVERLAY_LAYOUT_ID,
      widgetType: STEP_WIDGET,
      config: {},
    } as unknown as PhiCmsContentWidgetNode],
    controllerSettings,
  };
}

describe("a tree's Controller settings", () => {
  const authSetting: PhiRuntimeControllerSetting = {
    type: AUTH,
    instanceKey: "default",
    mountScope: "area",
    config: routes(`cms:${OVERLAY_ID}`),
  };

  it("leave a Controller only a deferred Overlay asks for to that Overlay, config and all", () => {
    const tree = areaTree([authSetting]);
    const areaMounted = materializePhiRuntimeControllerSettings({
      tree,
      ownerMountScope: "area",
      widgetPluginsByType,
      activeControllerTypes: [AUTH],
      excludedOverlayIds: new Set([OVERLAY_ID]),
    });
    expect(areaMounted).toEqual([]);

    const withOverlay = materializePhiOverlayRuntimeControllerSettings({
      tree,
      overlay: tree.overlays[0]!,
      widgetPluginsByType,
      activeControllerTypes: [AUTH],
    });
    expect(withOverlay).toEqual([{
      type: AUTH,
      instanceKey: "default",
      mountScope: "area",
      enabled: undefined,
      // The tree's keys win over what the Widget asked with, and the rest of the request stays.
      config: { asked: true, ...routes(`cms:${OVERLAY_ID}`) },
    }]);
  });

  it("mount a demand Controller in the tree's own scope when nothing else does", () => {
    const groups: PhiRuntimeControllerSetting = {
      type: GROUPS,
      instanceKey: "default",
      mountScope: "page",
      config: { signalRoutes: null },
    };
    const mounted = materializePhiRuntimeControllerSettings({
      tree: { regions: [], overlays: [], layoutNodes: [], contentWidgets: [], controllerSettings: [groups] },
      ownerMountScope: "page",
      widgetPluginsByType,
      activeControllerTypes: [GROUPS],
    });
    expect(mounted).toEqual([groups]);
  });

  it("configure a Controller the Area already runs instead of mounting a second one", () => {
    const pageAsset: PhiRuntimeControllerSetting = {
      type: ASSET,
      instanceKey: "default",
      mountScope: "page",
      config: { signalRoutes: { emits: [] } },
    };
    const areaAsset: PhiRuntimeControllerSetting = { type: ASSET, instanceKey: "default", mountScope: "area", enabled: true };
    const tree = { regions: [], overlays: [], layoutNodes: [], contentWidgets: [], controllerSettings: [pageAsset] };

    expect(materializePhiRuntimeControllerSettings({
      tree,
      ownerMountScope: "page",
      widgetPluginsByType,
      enclosingSettings: [areaAsset],
      activeControllerTypes: [ASSET],
    })).toEqual([]);
    expect(collectPhiRuntimeControllerConfigOverlays({
      tree,
      ownerMountScope: "page",
      enclosingSettings: [areaAsset],
    })).toEqual([{ type: ASSET, instanceKey: "default", config: { signalRoutes: { emits: [] } } }]);
  });

  it("lay the tree's config over a Controller its Module mounts for the whole Area", () => {
    const areaAsset: PhiRuntimeControllerSetting = { type: ASSET, instanceKey: "default", mountScope: "area", enabled: true };
    const mounted = materializePhiRuntimeControllerSettings({
      tree: {
        regions: [],
        overlays: [],
        layoutNodes: [],
        contentWidgets: [],
        controllerSettings: [{ type: ASSET, instanceKey: "default", mountScope: "area", config: { signalRoutes: null } }],
      },
      ownerMountScope: "area",
      widgetPluginsByType,
      baseSettings: [areaAsset],
      activeControllerTypes: [ASSET],
    });
    expect(mounted).toEqual([{ ...areaAsset, config: { signalRoutes: null } }]);
  });

  it("run nothing for a Controller no active Module owns, and refuse a setting in another scope", () => {
    const tree = { regions: [], overlays: [], layoutNodes: [], contentWidgets: [], controllerSettings: [authSetting] };
    expect(materializePhiRuntimeControllerSettings({
      tree,
      ownerMountScope: "area",
      widgetPluginsByType,
      activeControllerTypes: [],
    })).toEqual([]);
    expect(() => materializePhiRuntimeControllerSettings({
      tree,
      ownerMountScope: "page",
      widgetPluginsByType,
      activeControllerTypes: [AUTH],
    })).toThrow(/configures its Controllers in its own scope/u);
  });
});
