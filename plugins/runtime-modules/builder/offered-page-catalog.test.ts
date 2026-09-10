import { describe, expect, it } from "vitest";

import { PHI_BUILDER_AREA_KEYS, type PhiBuilderAreaKey } from "../../../constants/cms-areas";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../public/ids";
import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import type { PhiAreaRootRoute } from "../../../helpers/cms-area-config";
import type { PhiRuntimeModuleId } from "../../../types";
import { createPhiPageReference } from "../../../types/references";
import { createPhiPresetCmsPageId } from "../../../types/cms-instance-id";
import {
  resolvePhiBuilderOfferedPageCatalog,
  type PhiBuilderOfferedCatalogState,
} from "./offered-page-catalog";

const OFFEROR_ID = "@acme/example/modules/site" as unknown as PhiRuntimeModuleId;

function presetPage(
  ownerModuleId: PhiRuntimeModuleId,
  presetKey: string,
  storagePath: string,
  landingPage?: true,
): PhiPresetPageNode {
  return {
    key: createPhiPresetCmsPageId({ ownerModuleId, presetKey }),
    title: presetKey,
    storagePath,
    sourcePreset: { ownerModuleId, presetKey, sourcePresetVersion: 1 },
    ...(landingPage ? { landingPage } : {}),
  };
}

const HOME = presetPage(PHI_PUBLIC_RUNTIME_MODULE_ID, "public-welcome-page", "/");
const TERMS = presetPage(PHI_PUBLIC_RUNTIME_MODULE_ID, "public-terms-page", "/terms");
const OFFERED = presetPage(OFFEROR_ID, "example-landing-page", "/", true);

/**
 * A workspace that has been told two different things about the root, which is the ordinary state of
 * a Builder standing in `/shells` with an unsaved Select in front of them.
 */
function workspace(input: {
  stored: PhiAreaRootRoute | null;
  unsaved?: PhiAreaRootRoute | null;
  pages?: PhiPresetPageNode[];
  moduleIds?: PhiRuntimeModuleId[];
}) {
  const emptyByArea = <TValue>() => Object.fromEntries(
    PHI_BUILDER_AREA_KEYS.map((area) => [area, [] as TValue[]]),
  ) as Record<PhiBuilderAreaKey, TValue[]>;
  const state: PhiBuilderOfferedCatalogState & {
    areaRootRouteDrafts?: Record<string, PhiAreaRootRoute | null>;
  } = {
    modulePresetPagesByArea: { ...emptyByArea<PhiPresetPageNode>(), public: input.pages ?? [HOME, TERMS] },
    customPages: {},
    persistedPageCatalogByArea: {},
    navigationSurfacesByArea: {},
    runtimeModuleIdsByArea: { ...emptyByArea<PhiRuntimeModuleId>(), public: input.moduleIds ?? [] },
    areaRootRoutes: { public: input.stored },
    ...(input.unsaved !== undefined ? { areaRootRouteDrafts: { public: input.unsaved } } : {}),
  };
  return state;
}

const offeredPaths = (state: PhiBuilderOfferedCatalogState) =>
  resolvePhiBuilderOfferedPageCatalog(state, "public").map((node) => node.storagePath);

/**
 * Which `/pages` may open, and on whose word.
 *
 * The root slot is answered in `/shells` and acted on here, and the two workspaces do not share a
 * moment: until the answer is saved it exists in this session only, while the server still serves what
 * the Area stored. Offering a Page on the strength of an unsaved answer means an author edits -- and
 * publishes -- a root nobody is drawn, and with two Modules applying, each can end up holding an edited
 * `/` of its own.
 */
describe("the Pages an Area offers", () => {
  it("follows the stored answer, not the one being typed", () => {
    expect(offeredPaths(workspace({ stored: { mode: "landing" }, unsaved: null })))
      .toContain("/");
  });

  it("does not offer a root the Area still forwards, however the Select stands", () => {
    const forward = {
      mode: "redirect",
      target: createPhiPageReference({
        kind: "module",
        ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
        presetKey: "public-terms-page",
      }),
    } as const;

    expect(offeredPaths(workspace({ stored: forward, unsaved: { mode: "landing" } })))
      .toEqual(["/terms"]);
  });

  it("offers exactly the applicant the stored answer named", () => {
    const pages = [HOME, TERMS, OFFERED];
    const stored = {
      mode: "landing",
      target: createPhiPageReference({
        kind: "module",
        ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
        presetKey: "public-welcome-page",
      }),
    } as const;
    const offered = resolvePhiBuilderOfferedPageCatalog(
      workspace({
        stored,
        // The other applicant is switched on and would be adopted unasked if nobody had answered.
        unsaved: null,
        pages,
        moduleIds: [OFFEROR_ID],
      }),
      "public",
    );

    expect(offered.filter((node) => node.storagePath === "/").map((node) => node.key))
      .toEqual([HOME.key]);
  });
});
