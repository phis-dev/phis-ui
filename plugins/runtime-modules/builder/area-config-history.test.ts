import { beforeEach, describe, expect, it } from "vitest";

import {
  builderWorkspaceStore,
  commitPhiDeveloperBuilderAreaConfig,
  readPhiBuilderEffectiveAreaRootRoute,
  readPhiBuilderStoredAreaRootRoute,
  restorePhiDeveloperBuilderAreaMeta,
  setPhiDeveloperBuilderAreaRootRoute,
} from "./developer-workspace-store";
import { applyPhiBuilderAreaSettingsAnswer } from "./area-settings-answer";
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
  const apply = (snapshot: PhiBuilderHistorySnapshot) => {
    if (snapshot.kind === "composite") {
      for (const part of snapshot.parts) apply(part);
      return;
    }
    applied.push(snapshot);
    if (snapshot.kind === "areaRootRoute") {
      setPhiDeveloperBuilderAreaRootRoute(snapshot.area, snapshot.rootRoute);
    }
    if (snapshot.kind === "areaMeta") {
      restorePhiDeveloperBuilderAreaMeta(snapshot.area, snapshot.meta);
    }
  };
  phiBuilderHistory.undo(CONTEXT, apply);
  return applied.at(0) ?? null;
}

/** What the Area settings dialog does on OK, with the SEO answers left as they stand. */
function answerRootRoute(rootRoute: PhiAreaRootRoute | null) {
  const meta = builderWorkspaceStore.getSnapshot("public").areaMetaDrafts?.public ?? null;
  applyPhiBuilderAreaSettingsAnswer({
    area: "public",
    historyContext: CONTEXT,
    rootRoute,
    meta: {
      titleTemplate: meta?.titleTemplate,
      defaultTitle: meta?.defaultTitle,
      index: meta?.index ?? true,
      sitemap: meta?.sitemap ?? true,
    },
  });
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
    builderWorkspaceStore.patch("public", (current) => ({
      ...current,
      areaRootRouteDrafts: {},
      areaRootRoutes: {},
      areaMetaDrafts: {},
      areaMeta: {},
    }));
  });

  it("restores the state of never having been asked", () => {
    answerRootRoute({ mode: "landing" });
    expect(currentDraft()).toEqual({ mode: "landing" });

    expect(undoOnce()).toEqual({ kind: "areaRootRoute", area: "public", rootRoute: undefined });
    // Absent, not null: this session touched nothing, so whatever the Area stored still stands.
    expect(currentDraft()).toBeUndefined();
    expect("public" in (builderWorkspaceStore.getSnapshot("public").areaRootRouteDrafts ?? {})).toBe(false);
  });

  it("keeps the two answers apart", () => {
    // `null` is the Builder asking for the shipped default back, and undo has to land on it exactly.
    // The Area stored a landing, so asking for the default is a change of its own.
    builderWorkspaceStore.patch("public", (current) => ({ ...current, areaRootRoutes: { public: { mode: "landing" } } }));
    answerRootRoute(null);
    answerRootRoute({ mode: "redirect", target: "module:contact" } as unknown as PhiAreaRootRoute);

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
    answerRootRoute(saved);
    const before = builderWorkspaceStore.getSnapshot("public");
    expect(readPhiBuilderStoredAreaRootRoute(before, "public")).not.toEqual(saved);

    commitPhiDeveloperBuilderAreaConfig("public", { rootRoute: saved, meta: null });

    const after = builderWorkspaceStore.getSnapshot("public");
    expect(readPhiBuilderStoredAreaRootRoute(after, "public")).toEqual(saved);
    expect(readPhiBuilderEffectiveAreaRootRoute(after, "public")).toEqual(saved);
  });

  it("records nothing when the restore itself runs", () => {
    answerRootRoute({ mode: "landing" });
    undoOnce();
    // One entry went in, one came out: an undo that recorded itself could never reach the state before.
    expect(phiBuilderHistory.getAvailability(CONTEXT)).toMatchObject({ canUndo: false, canRedo: true });
  });
});

/**
 * One press of OK in the Area settings dialog.
 *
 * It answers the root route and the SEO answers at once. Recorded as two entries, one press took two
 * undos and the first left a state the author never saw; and an OK that changed nothing still wrote,
 * so an untouched Area turned unsaved and an emptied title was stored as "".
 */
describe("the Area settings dialog in the history", () => {
  beforeEach(() => {
    phiBuilderHistory.clear(CONTEXT);
    builderWorkspaceStore.patch("public", (current) => ({
      ...current,
      areaRootRouteDrafts: {},
      areaRootRoutes: {},
      areaMetaDrafts: {},
      areaMeta: {},
    }));
  });

  it("records one step for the root route and the titles together", () => {
    applyPhiBuilderAreaSettingsAnswer({
      area: "public",
      historyContext: CONTEXT,
      rootRoute: { mode: "landing" },
      meta: { titleTemplate: "%s | Site", defaultTitle: "", index: true, sitemap: true },
    });
    const availability = phiBuilderHistory.getAvailability(CONTEXT);
    expect(availability.undoAction).toEqual({ key: "changeAreaSettings" });

    undoOnce();
    expect(phiBuilderHistory.getAvailability(CONTEXT).canUndo).toBe(false);
    expect(currentDraft()).toBeUndefined();
    expect(builderWorkspaceStore.getSnapshot("public").areaMetaDrafts?.public).toBeUndefined();
  });

  it("records nothing when OK confirms what stands", () => {
    applyPhiBuilderAreaSettingsAnswer({
      area: "public",
      historyContext: CONTEXT,
      rootRoute: null,
      meta: { titleTemplate: "  ", defaultTitle: "", index: true, sitemap: true },
    });
    expect(phiBuilderHistory.getAvailability(CONTEXT).canUndo).toBe(false);
    expect(builderWorkspaceStore.getSnapshot("public").areaMetaDrafts?.public).toBeUndefined();
  });

  it("takes an emptied title away instead of storing it empty", () => {
    builderWorkspaceStore.patch("public", (current) => ({
      ...current,
      areaMeta: { public: { titleTemplate: "%s | Old", defaultTitle: "Old" } },
    }));
    applyPhiBuilderAreaSettingsAnswer({
      area: "public",
      historyContext: CONTEXT,
      rootRoute: undefined,
      meta: { titleTemplate: "", defaultTitle: "Old", index: true, sitemap: true },
    });
    expect(builderWorkspaceStore.getSnapshot("public").areaMetaDrafts?.public).toEqual({
      defaultTitle: "Old",
      index: true,
      sitemap: true,
    });
  });
});
