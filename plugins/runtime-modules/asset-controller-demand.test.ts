import { describe, expect, it } from "vitest";

import type { PhiCmsContentWidgetNode, PhiResolvedCmsRenderableTree } from "../../types/cms";
import type { PhiCmsWidgetPlugin, PhiRuntimeControllerSetting } from "../../types/cms-plugins";
import {
  PHI_ASSET_CONTROLLER_INSTANCE_KEY,
  PHI_ASSET_CONTROLLER_TYPE,
  createPhiAssetControllerAddress,
} from "../../components/media/asset-controller-address";
import { resolvePhiAssetControllerRouteRequirements } from "../../components/media/asset-controller-requirement";
import { materializePhiRuntimeControllerSettings } from "../../components/runtime/runtime-controller-materialization";
import { PHI_BUILDER_INSPECTOR_SECTION_WIDGET_DEFINITIONS } from "./builder/widgets/chrome/config";
import {
  PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION,
  PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION,
} from "./builder/widgets/workspaces/config";
import { PHI_STRUCTURE_REGION_WIDGET_DEFINITION } from "./builder/widgets/structure-region/config";
import { PHI_COLLECTION_VIEW_WIDGET_DEFINITION } from "./core/widgets/collection-view/config";
import {
  PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_DEFINITION,
} from "./theme/widgets/brand-controls/config";
import { PHI_AREA_UPLOAD_WIDGET_DEFINITION } from "./asset/widgets/area-upload/config";
import { PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION } from "./asset/widgets/asset-focal-rect/config";
import { PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION } from "./asset/widgets/image-inspector/config";
import { PHI_MEDIA_PICKER_WIDGET_DEFINITION } from "./asset/widgets/media-picker/config";

/*
 * The Asset Module is active in every Area and mounts its Controller on demand, so a Page without Media
 * mounts nothing for it. The demand is a Widget's `requiredRuntimeControllers`: the Widgets that draw
 * the Controller's state, a placement whose routes send to it, and the Media Page, which also tells it
 * whom to answer. A picker opened from authoring chrome sends it nothing, so its host asks for nothing.
 */

/** A placement's routes to the Controller, as the Media Page writes them. */
const routesToAssetController = (routeKey: string) => ({
  emits: [{
    routeKey,
    capabilityId: "selection",
    scope: "page" as const,
    channel: "selection",
    action: "change" as const,
    valueType: "json" as const,
    receiver: createPhiAssetControllerAddress(),
  }],
});

const ASSET_SETTING = { type: PHI_ASSET_CONTROLLER_TYPE, instanceKey: PHI_ASSET_CONTROLLER_INSTANCE_KEY };
const UPLOAD = "@phis/ui/modules/asset/widgets/area-upload";
const COLLECTION = "@phis/ui/modules/core/widgets/collection-view";
const widgetPluginsByType: Parameters<typeof materializePhiRuntimeControllerSettings>[0]["widgetPluginsByType"] =
  new Map<string, Pick<PhiCmsWidgetPlugin<unknown>, "parseConfig" | "requiredRuntimeControllers">>([
    [UPLOAD, PHI_AREA_UPLOAD_WIDGET_DEFINITION],
    [COLLECTION, PHI_COLLECTION_VIEW_WIDGET_DEFINITION],
  ]);

function pageTree(
  widgets: readonly { widgetType: string; config: Record<string, unknown> }[],
  controllerSettings: readonly PhiRuntimeControllerSetting[] = [],
): PhiResolvedCmsRenderableTree {
  return {
    regions: [],
    overlays: [],
    layoutNodes: [],
    contentWidgets: widgets.map((widget, index) => ({
      id: `a:widget-${index}`,
      parentLayoutNodeId: "a:layout",
      ...widget,
    }) as unknown as PhiCmsContentWidgetNode),
    controllerSettings,
  };
}

const requirementsOf = (
  definition: { requiredRuntimeControllers?: (args: never) => readonly { type: string; instanceKey: string }[] },
  config: unknown = {},
) => (definition.requiredRuntimeControllers?.({ config } as never) ?? [])
  .map(({ type, instanceKey }) => ({ type, instanceKey }));

describe("who asks for the Asset Controller", () => {
  it("is every Widget that draws its state", () => {
    for (const definition of [
      PHI_AREA_UPLOAD_WIDGET_DEFINITION,
      PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION,
      PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION,
    ]) {
      expect(requirementsOf(definition), definition.typeKey).toEqual([ASSET_SETTING]);
    }
  });

  it("is no Widget of the authoring chrome: its pickers keep their own state", () => {
    // Were one of them to ask, the Inspector's Area Overlay and the Page beside it would each mount
    // the Controller, two instances behind one address.
    for (const definition of [
      PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION,
      PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION,
      PHI_STRUCTURE_REGION_WIDGET_DEFINITION,
      PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_DEFINITION,
      PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_DEFINITION,
      ...PHI_BUILDER_INSPECTOR_SECTION_WIDGET_DEFINITIONS.map(({ definition: section }) => section),
    ] as readonly { typeKey: string; requiredRuntimeControllers?: unknown }[]) {
      expect(definition.requiredRuntimeControllers, definition.typeKey).toBeUndefined();
    }
  });

  it("is a placed picker or collection only where its routes name the Controller", () => {
    const wired = { signalRoutes: routesToAssetController("test-selection") };
    const elsewhere = {
      signalRoutes: {
        emits: [{ routeKey: "select", capabilityId: "selection", scope: "page", channel: "selection", action: "change", valueType: "json", receiver: "cms:a:other" }],
      },
    };
    expect(resolvePhiAssetControllerRouteRequirements(wired.signalRoutes)).toEqual([{ ...ASSET_SETTING, enabled: true }]);
    for (const definition of [PHI_MEDIA_PICKER_WIDGET_DEFINITION, PHI_COLLECTION_VIEW_WIDGET_DEFINITION]) {
      expect(requirementsOf(definition, wired), definition.typeKey).toEqual([ASSET_SETTING]);
      expect(requirementsOf(definition, elsewhere), definition.typeKey).toEqual([]);
      // A Gallery that only lists the library, on a Public Page, mounts no Controller.
      expect(requirementsOf(definition, { signalRoutes: null }), definition.typeKey).toEqual([]);
    }
  });
});

describe("what a Page mounts for the Asset Controller", () => {
  it("is nothing where no Widget asks and the tree states nothing", () => {
    expect(materializePhiRuntimeControllerSettings({
      tree: pageTree([{ widgetType: COLLECTION, config: {} }]),
      ownerMountScope: "page",
      widgetPluginsByType,
      // What the Area runs for every Page no longer includes it: the policy is `demand`.
      enclosingSettings: [],
      activeControllerTypes: [PHI_ASSET_CONTROLLER_TYPE],
    })).toEqual([]);
  });

  it("is one instance on the Media Page, with the tree's routes, however many Widgets ask", () => {
    const signalRoutes = { emits: [{ routeKey: "inspector-open", capabilityId: "inspectorOpen", scope: "page", channel: "dialog", action: "open", valueType: "none", receiver: "cms:a:inspector" }] };
    const mounted = materializePhiRuntimeControllerSettings({
      tree: pageTree(
        [
          { widgetType: UPLOAD, config: {} },
          { widgetType: UPLOAD, config: {} },
          { widgetType: COLLECTION, config: { signalRoutes: routesToAssetController("media-selection") } },
        ],
        [{ ...ASSET_SETTING, mountScope: "page", config: { signalRoutes } }],
      ),
      ownerMountScope: "page",
      widgetPluginsByType,
      enclosingSettings: [],
      activeControllerTypes: [PHI_ASSET_CONTROLLER_TYPE],
    });
    expect(mounted).toEqual([{ ...ASSET_SETTING, mountScope: "page", enabled: true, config: { signalRoutes } }]);
  });

  it("is the tree's own setting where no Widget on the Page asks", () => {
    const setting: PhiRuntimeControllerSetting = { ...ASSET_SETTING, mountScope: "page", config: { signalRoutes: null } };
    expect(materializePhiRuntimeControllerSettings({
      tree: pageTree([], [setting]),
      ownerMountScope: "page",
      widgetPluginsByType,
      enclosingSettings: [],
      activeControllerTypes: [PHI_ASSET_CONTROLLER_TYPE],
    })).toEqual([setting]);
  });
});
