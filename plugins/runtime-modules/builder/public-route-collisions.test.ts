import { describe, expect, it } from "vitest";

import { createPhiPageReference } from "../../../types/references";
import type { PhiRuntimeModuleId } from "../../../types";
import { resolvePhiBuilderPublicRouteCollisionAnswers } from "./public-route-collisions";

const WANTS = "@phis/dev/modules/dev" as PhiRuntimeModuleId;
const HOLDS = "@phis/support/modules/support" as PhiRuntimeModuleId;

function state(input: { live?: boolean; pagePublished?: boolean | null }) {
  return {
    publicRouteClaims: [
      { ownerModuleId: WANTS, presetKey: "contact", title: "Contact", declaredPath: "/contact" },
      { ownerModuleId: WANTS, presetKey: "help", title: "Help", declaredPath: "/help" },
      { ownerModuleId: HOLDS, presetKey: "help", title: "Help desk", declaredPath: "/help", live: input.live },
    ],
    publicRoutePaths: [],
    runtimeModuleIdsByArea: { public: [HOLDS] },
    persistedPageCatalogByArea: input.pagePublished == null ? { public: [] } : {
      public: [{
        id: 5,
        reference: createPhiPageReference({ kind: "site", pageScopeId: 5 }),
        path: "/contact",
        publishedRevisionId: input.pagePublished ? 12 : null,
        tombstoned: false,
      }],
    },
    runtimeModuleDefinitions: [],
  } as unknown as Parameters<typeof resolvePhiBuilderPublicRouteCollisionAnswers>[0];
}

/*
 * Moving an address nobody has been served is a rename; moving one that stands in an index costs links.
 * The dialog says which it is.
 */
describe("whether a contested Public address is live", () => {
  it("says a Site Page holds it live once the Page is published, and not before", () => {
    const live = resolvePhiBuilderPublicRouteCollisionAnswers(state({ pagePublished: true }), WANTS);
    expect(live.find((answer) => answer.presetKey === "contact")?.published).toBe(true);
    const draft = resolvePhiBuilderPublicRouteCollisionAnswers(state({ pagePublished: false }), WANTS);
    expect(draft.find((answer) => answer.presetKey === "contact")?.published).toBe(false);
  });

  it("says a Module holds it live only where the published Area runs the Module", () => {
    const live = resolvePhiBuilderPublicRouteCollisionAnswers(state({ live: true }), WANTS);
    expect(live.find((answer) => answer.presetKey === "help")?.published).toBe(true);
    const draftOnly = resolvePhiBuilderPublicRouteCollisionAnswers(state({ live: false }), WANTS);
    expect(draftOnly.find((answer) => answer.presetKey === "help")?.published).toBe(false);
  });
});
