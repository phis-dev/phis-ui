import { beforeEach, describe, expect, it } from "vitest";

import {
  builderWorkspaceStore,
  commitPhiDeveloperBuilderAreaConfig,
  readPhiBuilderEffectiveAreaRootRoute,
  readPhiBuilderStoredAreaRootRoute,
  setPhiDeveloperBuilderAreaRootRoute,
} from "./developer-workspace-store";
import type { PhiAreaRootRoute } from "../../../helpers/cms-area-config";
import {
  createPhiBuilderHistoryContext,
  phiBuilderHistory,
  type PhiBuilderHistorySnapshot,
} from "./history";

const CONTEXT = createPhiBuilderHistoryContext({ workspace: "structure", area: "public" });

/** The undo the command controller performs, without the React hook it normally sits in. */
function undoOnce() {
  const applied: PhiBuilderHistorySnapshot[] = [];
  phiBuilderHistory.undo(CONTEXT, (snapshot) => {
    applied.push(snapshot);
    if (snapshot.kind === "areaRootRoute") {
      setPhiDeveloperBuilderAreaRootRoute(snapshot.area, snapshot.rootRoute);
    }
  });
  return applied.at(-1) ?? null;
}

const currentDraft = () => builderWorkspaceStore.getSnapshot("public").areaRootRouteDrafts?.public;

/**
 * Taking back what the Shell said about itself.
 *
 * The root route lives in the Area's config rather than in its Region tree, so the `"regionDrafts"`
 * entries the canvas records walk straight past it -- which left choosing a landing as the one edit in
 * `/shells` that could not be undone. It matters more now that the answer only reaches `/pages` when it
 * is saved: the span between choosing and saving is exactly the span in which somebody wants it back.
 */
describe("undoing the Area root route", () => {
  beforeEach(() => {
    phiBuilderHistory.clear(CONTEXT);
    builderWorkspaceStore.patch("public", (current) => ({ ...current, areaRootRouteDrafts: {} }));
  });

  it("restores the state of never having been asked", () => {
    setPhiDeveloperBuilderAreaRootRoute("public", { mode: "landing" }, { historyContext: CONTEXT });
    expect(currentDraft()).toEqual({ mode: "landing" });

    expect(undoOnce()).toEqual({ kind: "areaRootRoute", area: "public", rootRoute: undefined });
    // Absent, not null: this session touched nothing, so whatever the Area stored still stands.
    expect(currentDraft()).toBeUndefined();
    expect("public" in (builderWorkspaceStore.getSnapshot("public").areaRootRouteDrafts ?? {})).toBe(false);
  });

  it("keeps the two answers apart", () => {
    // `null` is the Builder asking for the shipped default back, and undo has to land on it exactly.
    setPhiDeveloperBuilderAreaRootRoute("public", null, { historyContext: CONTEXT });
    setPhiDeveloperBuilderAreaRootRoute("public", { mode: "landing" }, { historyContext: CONTEXT });

    undoOnce();
    expect(currentDraft()).toBeNull();
    expect(readPhiBuilderEffectiveAreaRootRoute(
      { areaRootRouteDrafts: { public: null }, areaRootRoutes: { public: { mode: "landing" } } },
      "public",
    )).toBeNull();
  });

  /**
   * A save is what makes the two workspaces agree again.
   *
   * `/shells` reads the answer being edited and `/pages` the one that is stored, so between choosing
   * and saving they deliberately differ. Writing the draft has to close that gap in the same breath --
   * the Builder chrome is one layout across both, so nothing re-renders on the way over.
   */
  it("agrees with the Page list once the save has written it", () => {
    const saved = { mode: "redirect", target: "module:contact" } as unknown as PhiAreaRootRoute;
    setPhiDeveloperBuilderAreaRootRoute("public", saved, { historyContext: CONTEXT });
    const before = builderWorkspaceStore.getSnapshot("public");
    expect(readPhiBuilderStoredAreaRootRoute(before, "public")).not.toEqual(saved);

    commitPhiDeveloperBuilderAreaConfig("public", { rootRoute: saved, meta: null });

    const after = builderWorkspaceStore.getSnapshot("public");
    expect(readPhiBuilderStoredAreaRootRoute(after, "public")).toEqual(saved);
    expect(readPhiBuilderEffectiveAreaRootRoute(after, "public")).toEqual(saved);
  });

  it("records nothing when the restore itself runs", () => {
    setPhiDeveloperBuilderAreaRootRoute("public", { mode: "landing" }, { historyContext: CONTEXT });
    undoOnce();
    // One entry went in, one came out: an undo that recorded itself could never reach the state before.
    expect(phiBuilderHistory.getAvailability(CONTEXT)).toEqual({ canUndo: false, canRedo: true });
  });
});
