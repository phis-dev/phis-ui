import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiBuilderPluginMeta } from "../../../types/builder";
import { createPhiDraftCmsInstanceId, type PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { createPhiSignalSubcontrolAddress } from "../../../types/signals";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";
import {
  builderWorkspaceStore,
  getPhiDeveloperRegionDraftsSnapshot,
  setPhiDeveloperRegionDraft,
} from "./developer-workspace-store";
import { createPhiBuilderRegionHistoryContext, phiBuilderHistory } from "./history";
import { runPhiDeveloperBuilderInspectorAction } from "./controller/inspector-controller";
import { resolvePhiBuilderConfigEditAction, writePhiBuilderNode } from "./node-config-write";
import { setPhiBuilderModuleMetas } from "./plugin-meta-store";
import { getPhiBuilderRegionDraftKey } from "./region-keys";
import type { PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";

const AREA = "public";
const PAGE = "contact";
const STACK = "@phis/ui/modules/core/layouts/flex-vertical";
const TOOLBAR = "@phis/ui/modules/core/widgets/command-toolbar";
const BUTTON = "@phis/ui/modules/core/widgets/button";
const id = (sequence: number) => createPhiDraftCmsInstanceId({ domain: "page", draftRevisionId: 1, sequence });
const ROOT = id(1);
const TOOLBAR_ID = id(2);
const BUTTON_ID = id(3);
const draftKey = getPhiBuilderRegionDraftKey(AREA, "content", PAGE);
const historyContext = createPhiBuilderRegionHistoryContext({ area: AREA, pageKey: PAGE, pageScoped: true });

function widget(nodeId: PhiCmsInstanceId, widgetType: string, label: string | null, config: Record<string, unknown>) {
  return {
    id: nodeId,
    siteId: -1,
    parentLayoutNodeId: ROOT,
    widgetType,
    slotIndex: 0,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label,
    config,
    contentId: null,
  } as PhiCmsContentWidgetNode;
}

function draft(): PhiDeveloperBuilderRegionDraft {
  return {
    rootNode: {
      id: ROOT,
      siteId: -1,
      parentLayoutNodeId: null,
      widgetType: STACK,
      slotIndex: 0,
      sortOrder: 0,
      status: 0,
      flags: 0,
      visibilityMask: 0,
      label: "Column",
      config: { columns: 1 },
      childLayouts: [],
      childWidgets: [
        widget(TOOLBAR_ID, TOOLBAR, "Toolbar", { buttons: [{ key: "save" }, { key: "undo" }] }),
        widget(BUTTON_ID, BUTTON, null, {
          signalRoutes: {
            emits: [{
              routeKey: "to-undo",
              capabilityId: "activate",
              scope: "page",
              channel: "enabled",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalSubcontrolAddress("cms", TOOLBAR_ID, "undo"),
            }],
          },
        }),
      ],
    } as PhiCmsLayoutRenderNode,
  } as unknown as PhiDeveloperBuilderRegionDraft;
}

const metas: PhiBuilderPluginMeta[] = [
  {
    kind: "widget",
    pluginKey: "@phis/ui/modules/core/widgets",
    typeKey: "command-toolbar",
    title: "Command toolbar",
    leaf: true,
    signalSubcontrols: [{ configKey: "buttons", keyField: "key" }],
    fields: [{ key: "gap", type: "number", label: "Gap" }],
  } as unknown as PhiBuilderPluginMeta,
  {
    kind: "widget",
    pluginKey: "@phis/ui/modules/core/widgets",
    typeKey: "button",
    title: "Button",
    leaf: true,
    fields: [],
  } as unknown as PhiBuilderPluginMeta,
];

beforeEach(() => {
  phiBuilderHistory.clear(historyContext);
  setPhiBuilderModuleMetas(AREA, {
    plugins: metas,
    dataProviders: [],
    collectionItemRenderers: [],
    calendarAdapters: [],
    videoProviders: [],
    forms: [],
  });
  setPhiDeveloperRegionDraft(draftKey, draft());
});

afterEach(() => {
  builderWorkspaceStore.reset(AREA);
  phiWorkspaceCatalogStore.reset(AREA);
});

const current = () => getPhiDeveloperRegionDraftsSnapshot()[draftKey]!.rootNode!;
const node = (nodeId: PhiCmsInstanceId) => current().childWidgets!.find((child) => child.id === nodeId)!;

/**
 * One way to change a node in place. The Canvas pruned the routes to subcontrols an edit removed but
 * wrote any config it was handed; the Inspector checked the config and left those routes standing.
 */
describe("writing a node's config", () => {
  it("takes the routes to a removed subcontrol with it, in the same step", () => {
    writePhiBuilderNode({
      area: AREA,
      pageKey: PAGE,
      regionKey: "content",
      draftKey,
      nodeId: TOOLBAR_ID,
      patchConfig: (config) => ({ ...config, buttons: [{ key: "save" }] }),
    });
    expect(node(TOOLBAR_ID).config).toMatchObject({ buttons: [{ key: "save" }] });
    // No route is left that names the button the edit took away.
    expect(JSON.stringify(node(BUTTON_ID).config ?? {})).not.toContain(createPhiSignalSubcontrolAddress("cms", TOOLBAR_ID, "undo"));
    expect(JSON.stringify(draft().rootNode)).toContain(createPhiSignalSubcontrolAddress("cms", TOOLBAR_ID, "undo"));
    expect(phiBuilderHistory.getAvailability(historyContext).undoAction).toEqual({
      key: "changeNodeSettings",
      subject: "Toolbar",
    });
  });

  it("refuses a config the node's fields do not allow, whoever writes it", () => {
    expect(() => writePhiBuilderNode({
      area: AREA,
      pageKey: PAGE,
      regionKey: "content",
      draftKey,
      nodeId: TOOLBAR_ID,
      patchConfig: (config) => ({ ...config, gap: "wide" }),
    })).toThrow(/Invalid Command toolbar configuration/u);
    expect(node(TOOLBAR_ID).config).not.toHaveProperty("gap");
  });

  it("names the step after the node, or its type when it has no label", () => {
    writePhiBuilderNode({
      area: AREA,
      pageKey: PAGE,
      regionKey: "content",
      draftKey,
      nodeId: BUTTON_ID,
      patchConfig: (config) => ({ ...config, effects: [] }),
    });
    expect(phiBuilderHistory.getAvailability(historyContext).undoAction).toEqual({
      key: "changeNodeEffects",
      subject: "Button",
    });
  });
});

describe("the kind of step a config edit is", () => {
  it("is read off the keys it changed", () => {
    expect(resolvePhiBuilderConfigEditAction({}, { padding: 8, paddingTop: 4 })).toBe("changeNodePadding");
    expect(resolvePhiBuilderConfigEditAction({ size: 1 }, { size: 2 })).toBe("resizeNode");
    expect(resolvePhiBuilderConfigEditAction({}, { slotTitles: ["A"] })).toBe("renameSlot");
    expect(resolvePhiBuilderConfigEditAction({}, { padding: 8, surface: {} })).toBe("changeNodeSettings");
  });
});

/**
 * A Layout Inspector control that answers several keys at once -- four padding sides, a grid's columns
 * and placements -- sent them a key at a time, and each became an undo step of its own.
 */
describe("a Layout Inspector gesture over several keys", () => {
  it("is one step", () => {
    phiWorkspaceCatalogStore.patch(AREA, (state) => ({ ...state, area: AREA, pageKey: PAGE }));
    builderWorkspaceStore.patch(AREA, (state) => ({
      ...state,
      nodeId: ROOT,
      nodeKind: "layout",
      nodeKey: STACK,
      selectedRootRegionKey: "content",
    }));
    runPhiDeveloperBuilderInspectorAction(AREA, {
      kind: "patchSelectedLayoutConfig",
      patch: { columns: 2, slotPlacements: [{ slot: 0 }] },
    });
    expect(current().config).toMatchObject({ columns: 2, slotPlacements: [{ slot: 0 }] });

    let undone = 0;
    while (phiBuilderHistory.undo(historyContext, () => undefined)) undone += 1;
    expect(undone).toBe(1);
  });

  it("takes a key away when it is answered with null", () => {
    phiWorkspaceCatalogStore.patch(AREA, (state) => ({ ...state, area: AREA, pageKey: PAGE }));
    builderWorkspaceStore.patch(AREA, (state) => ({
      ...state,
      nodeId: ROOT,
      nodeKind: "layout",
      nodeKey: STACK,
      selectedRootRegionKey: "content",
    }));
    runPhiDeveloperBuilderInspectorAction(AREA, { kind: "patchSelectedLayoutConfig", patch: { columns: null } });
    expect(current().config?.columns).toBeUndefined();
  });
});
