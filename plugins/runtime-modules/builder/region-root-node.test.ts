import { afterEach, describe, expect, it } from "vitest";

import { PhiCmsRegionType } from "../../../constants/phi-cms";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutNode } from "../../../types/cms";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";
import { buildPhiDeveloperBuilderRegionDraftsFromTree } from "./region-hydration";
import { serializePhiBuilderRootDraft } from "./persistence";
import { runPhiDeveloperBuilderInspectorAction } from "./controller/inspector-controller";
import {
  builderWorkspaceStore,
  getPhiDeveloperRegionDraftsSnapshot,
  setPhiDeveloperRegionDraft,
} from "./developer-workspace-store";
import { getPhiBuilderRegionDraftKey } from "./region-keys";
import { createPhiDraftCmsInstanceId, type PhiCmsInstanceId } from "../../../types/cms-instance-id";

const AREA = "public";
const PAGE = "contact";
const SPLIT = "@phis/ui/modules/core/layouts/split-card";
const FLEX = "@phis/ui/modules/core/layouts/flex-vertical";
const ROOT = createPhiDraftCmsInstanceId({ domain: "page", draftRevisionId: 1, sequence: 1 });
const INNER = createPhiDraftCmsInstanceId({ domain: "page", draftRevisionId: 1, sequence: 2 });
const TEXT = createPhiDraftCmsInstanceId({ domain: "page", draftRevisionId: 1, sequence: 3 });
const CARD_SURFACE = { background: { base: { kind: "color", color: "#fff" } }, shadow: "soft" };

function layout(
  id: PhiCmsInstanceId,
  parentLayoutNodeId: PhiCmsInstanceId | null,
  widgetType: string,
  config: Record<string, unknown>,
  slotIndex = 0,
): PhiCmsLayoutNode {
  return {
    id,
    siteId: -1,
    parentLayoutNodeId,
    widgetType,
    slotIndex,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: id,
    config,
  };
}

function tree() {
  const widget: PhiCmsContentWidgetNode = {
    id: TEXT,
    siteId: -1,
    parentLayoutNodeId: INNER,
    widgetType: "@phis/ui/modules/core/widgets/text",
    slotIndex: 0,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: "text",
    config: { text: "Hello" },
    contentId: null,
  } as PhiCmsContentWidgetNode;
  return {
    regions: [{
      id: 1,
      pageId: 1,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: ROOT,
      status: 1,
      flags: 0,
      visibilityMask: 0,
      sortOrder: 0,
      config: {},
    }],
    layoutNodes: [
      layout(ROOT, null, SPLIT, { gap: "var(--ant-margin)", padding: 16, anchor: "center", surface: CARD_SURFACE }),
      layout(INNER, ROOT, FLEX, { padding: 8, surface: CARD_SURFACE }),
    ],
    contentWidgets: [widget],
  };
}

function hydrate() {
  const drafts = buildPhiDeveloperBuilderRegionDraftsFromTree(tree(), AREA, PAGE, ["content"]);
  return drafts[getPhiBuilderRegionDraftKey(AREA, "content", PAGE)]!;
}

describe("the Region's root Layout", () => {
  it("is hydrated as the node it is in the tree", () => {
    const draft = hydrate();
    // One copy of the root Layout: the node. No field beside it repeats what its config says.
    expect(Object.keys(draft).filter((key) => key.startsWith("rootNode") && key !== "rootNode")).toEqual([]);
    expect(draft.rootNode?.id).toBe(ROOT);
    expect(draft.rootNode?.config).toEqual(tree().layoutNodes[0]!.config);
    expect(draft.rootNode?.childLayouts?.map((node) => node.id)).toEqual([INNER]);
    expect(draft.rootNode?.childLayouts?.[0]?.childWidgets?.map((node) => node.id)).toEqual([TEXT]);
  });

  it("is stored as it was loaded -- hydrating and saving changes nothing", () => {
    const serialized = serializePhiBuilderRootDraft(hydrate(), new Map(), "carry");
    expect(serialized.rootLayoutNodeId).toBe(ROOT);
    const byId = new Map(serialized.layoutNodes.map((node) => [node.id, node]));
    expect(byId.get(ROOT)).toMatchObject({ parentLayoutNodeId: null, config: tree().layoutNodes[0]!.config });
    expect(byId.get(INNER)).toMatchObject({ parentLayoutNodeId: ROOT, config: tree().layoutNodes[1]!.config });
    expect(serialized.contentWidgets.map((widget) => widget.parentLayoutNodeId)).toEqual([INNER]);
  });
});

describe("the Inspector edits the root Layout like a nested one", () => {
  const draftKey = getPhiBuilderRegionDraftKey(AREA, "content", PAGE);

  function select(node: "root" | "inner") {
    const nodeId = node === "root" ? ROOT : INNER;
    phiWorkspaceCatalogStore.patch(AREA, (current) => ({ ...current, area: AREA, pageKey: PAGE }));
    builderWorkspaceStore.patch(AREA, (current) => ({
      ...current,
      nodeId,
      nodeKind: "layout",
      nodeKey: node === "root" ? SPLIT : FLEX,
      selectedRootRegionKey: "content",
    }));
  }

  function config(node: "root" | "inner") {
    const root = getPhiDeveloperRegionDraftsSnapshot()[draftKey]?.rootNode;
    return node === "root" ? root?.config : root?.childLayouts?.[0]?.config;
  }

  afterEach(() => {
    builderWorkspaceStore.reset(AREA);
    phiWorkspaceCatalogStore.reset(AREA);
  });

  it.each(["root", "inner"] as const)("%s: None takes the Surface away for good", (node) => {
    setPhiDeveloperRegionDraft(draftKey, hydrate());
    select(node);
    runPhiDeveloperBuilderInspectorAction(AREA, { kind: "patchSelectedLayoutSurface", surface: null });
    expect(config(node)).not.toHaveProperty("surface");
  });

  it.each(["root", "inner"] as const)("%s: padding and anchor go to the config", (node) => {
    setPhiDeveloperRegionDraft(draftKey, hydrate());
    select(node);
    runPhiDeveloperBuilderInspectorAction(AREA, { kind: "patchSelectedLayoutPadding", padding: { padding: 24 } });
    runPhiDeveloperBuilderInspectorAction(AREA, { kind: "patchSelectedLayoutAnchor", selectedLayoutAnchor: "topLeft" });
    expect(config(node)).toMatchObject({ padding: 24, anchor: "topLeft" });
    expect(Object.keys(config(node) ?? {}).filter((key) => key.startsWith("rootNode"))).toEqual([]);
  });
});
