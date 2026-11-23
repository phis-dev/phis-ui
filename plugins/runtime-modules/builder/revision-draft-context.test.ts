import { beforeEach, describe, expect, it } from "vitest";

import { PHI_WORKSPACE_CATALOG_SCOPE } from "../../../components/workspace/catalog-store";
import { createPhiBuilderDraftAllocationKey } from "./draft-allocation-key";
import {
  builderWorkspaceStore,
  getPhiBuilderDraftContextGeneration,
  getPhiDeveloperRegionDraftsSnapshot,
  invalidatePhiBuilderDraftContext,
  restorePhiDeveloperRegionDrafts,
  setPhiDeveloperRegionDraft,
  storePhiBuilderDraftAllocation,
} from "./developer-workspace-store";
import { createPhiBuilderHistoryContext, phiBuilderHistory } from "./history";
import { getPhiBuilderDefaultRegionDraft } from "./region-defaults";
import { getPhiBuilderPageDraftKey, getPhiBuilderRegionDraftKey } from "./region-keys";

const shellKey = getPhiBuilderRegionDraftKey("app", "header_main");
const otherAreaKey = getPhiBuilderRegionDraftKey("public", "header_main");
const pageKey = getPhiBuilderRegionDraftKey("app", "content", "home");
const otherPageKey = getPhiBuilderRegionDraftKey("app", "content", "orders");
const metaKey = getPhiBuilderPageDraftKey("app", "page_meta", "home");
const deleteKey = getPhiBuilderPageDraftKey("app", "page_delete", "home");
const allocation = { revisionId: 8, version: 2, nextNodeSequence: 10, sourcePreset: null };
const shellAllocation = createPhiBuilderDraftAllocationKey("app", "", "area");
const pageAllocation = createPhiBuilderDraftAllocationKey("app", "home", "page");
const modulesAllocation = createPhiBuilderDraftAllocationKey("app", "", "modules");
const shellContext = createPhiBuilderHistoryContext({ workspace: "structure", area: "app" });
const pageContext = createPhiBuilderHistoryContext({ workspace: "pages", area: "app", pageKey: "home" });
const state = () => builderWorkspaceStore.getSnapshot(PHI_WORKSPACE_CATALOG_SCOPE);

beforeEach(() => {
  restorePhiDeveloperRegionDrafts({ [shellKey]: null, [otherAreaKey]: null, [pageKey]: null, [otherPageKey]: null });
  phiBuilderHistory.clear(shellContext);
  phiBuilderHistory.clear(pageContext);
  setPhiDeveloperRegionDraft(shellKey, getPhiBuilderDefaultRegionDraft("header_main"), {
    history: { context: shellContext, action: { key: "changeRegion" } },
  });
  setPhiDeveloperRegionDraft(pageKey, getPhiBuilderDefaultRegionDraft("content"), {
    history: { context: pageContext, action: { key: "changeRegion" } },
  });
  setPhiDeveloperRegionDraft(otherAreaKey, getPhiBuilderDefaultRegionDraft("header_main"));
  setPhiDeveloperRegionDraft(otherPageKey, getPhiBuilderDefaultRegionDraft("content"));
  builderWorkspaceStore.patch(PHI_WORKSPACE_CATALOG_SCOPE, (current) => ({
    ...current,
    areaRootRouteDrafts: { app: { mode: "landing" }, public: { mode: "landing" } },
    areaMetaDrafts: { app: { defaultTitle: "Old title" } },
    pageMetaDrafts: { [metaKey]: { title: "Old title" } },
    deletedPageDrafts: { [deleteKey]: true },
    pageControllerSettings: { [metaKey]: [] },
  }));
  storePhiBuilderDraftAllocation(shellAllocation, allocation);
  storePhiBuilderDraftAllocation(pageAllocation, allocation);
  storePhiBuilderDraftAllocation(modulesAllocation, allocation);
});

describe("discarding the cached Builder context superseded by a revision", () => {
  it("drops only the affected shell and lets the next server snapshot fill in its regions", () => {
    const shellGeneration = getPhiBuilderDraftContextGeneration(shellContext);
    const pageGeneration = getPhiBuilderDraftContextGeneration(pageContext);
    invalidatePhiBuilderDraftContext({ workspace: "structure", area: "app" });

    expect(getPhiDeveloperRegionDraftsSnapshot()).not.toHaveProperty(shellKey);
    expect(getPhiDeveloperRegionDraftsSnapshot()).toHaveProperty(otherAreaKey);
    expect(getPhiDeveloperRegionDraftsSnapshot()).toHaveProperty(pageKey);
    expect(state().areaRootRouteDrafts).toEqual({ public: { mode: "landing" } });
    expect(state().areaMetaDrafts).toEqual({});
    expect(state().draftAllocations[shellAllocation]).toBeUndefined();
    expect(state().draftAllocations[modulesAllocation]).toEqual(allocation);
    expect(state().draftAllocations[pageAllocation]).toEqual(allocation);
    expect(phiBuilderHistory.getHead(shellContext)).toBeNull();
    expect(phiBuilderHistory.getHead(pageContext)).not.toBeNull();
    expect(getPhiBuilderDraftContextGeneration(shellContext)).toBe(shellGeneration + 1);
    expect(getPhiBuilderDraftContextGeneration(pageContext)).toBe(pageGeneration);
  });

  it("drops the Page context without discarding its shell or another Page", () => {
    invalidatePhiBuilderDraftContext({ workspace: "pages", area: "app", pageKey: "home" });

    expect(getPhiDeveloperRegionDraftsSnapshot()).not.toHaveProperty(pageKey);
    expect(getPhiDeveloperRegionDraftsSnapshot()).toHaveProperty(shellKey);
    expect(getPhiDeveloperRegionDraftsSnapshot()).toHaveProperty(otherPageKey);
    expect(state().pageMetaDrafts[metaKey]).toBeUndefined();
    expect(state().deletedPageDrafts[deleteKey]).toBeUndefined();
    expect(state().pageControllerSettings[metaKey]).toBeUndefined();
    expect(state().draftAllocations[pageAllocation]).toBeUndefined();
    expect(state().draftAllocations[shellAllocation]).toEqual(allocation);
    expect(phiBuilderHistory.getHead(pageContext)).toBeNull();
    expect(phiBuilderHistory.getHead(shellContext)).not.toBeNull();
  });
});
