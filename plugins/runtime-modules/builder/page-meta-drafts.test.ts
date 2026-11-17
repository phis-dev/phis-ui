import { PHI_WORKSPACE_CATALOG_SCOPE } from "../../../components/workspace/catalog-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PhiCmsFlags } from "../../../constants/phi-cms";
import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import {
  builderWorkspaceStore,
  mergePhiDeveloperDeletedPageDrafts,
  mergePhiDeveloperPageMetaDrafts,
  setPhiBuilderPageMetaDraft,
  setPhiDeveloperBuilderPageControllerSettings,
} from "./developer-workspace-store";
import { savePhiDeveloperBuilderDraft } from "./persistence";
import { getPhiBuilderPageDraftKey } from "./region-keys";

const PAGES: PhiPresetPageNode[] = [
  {
    key: "error-401",
    title: "401",
    storagePath: "/error/401",
    sourcePreset: { ownerModuleId: "@acme/site/modules/site", presetKey: "public-error-401-page", sourcePresetVersion: 1 },
    defaultPageFlags: PhiCmsFlags.NoIndex,
  },
  {
    key: "imprint",
    title: "Imprint",
    storagePath: "/imprint",
    sourcePreset: { ownerModuleId: "@acme/site/modules/site", presetKey: "phisys-imprint-page", sourcePresetVersion: 1 },
  },
];

const ALLOCATION = {
  revisionId: 1,
  version: 1,
  nextNodeSequence: 1,
  sourcePreset: null,
};

type SavedPage = { path: string; pageMeta: { title: string | null }; page: { flags: number } };

let posted: Array<{ path: string; body: SavedPage }> = [];

beforeEach(() => {
  posted = [];
  builderWorkspaceStore.patch(PHI_WORKSPACE_CATALOG_SCOPE, (current) => ({
    ...current,
    pageMetaDrafts: {},
    deletedPageDrafts: {},
    pageControllerSettings: {},
  }));
  vi.stubGlobal("fetch", async (path: string, init?: { body?: string }) => {
    posted.push({ path, body: JSON.parse(init?.body ?? "{}") as SavedPage });
    return { ok: true, status: 200, json: async () => ALLOCATION };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** What the Pages workspace does for the Page the server rendered it for. */
function openPage(pageKey: string, meta: { title: string | null; description: string | null; index: boolean }) {
  mergePhiDeveloperPageMetaDrafts("public", { [getPhiBuilderPageDraftKey("public", "page_meta", pageKey)]: meta });
  mergePhiDeveloperDeletedPageDrafts("public", {
    [getPhiBuilderPageDraftKey("public", "page_delete", pageKey)]: false,
  });
  setPhiDeveloperBuilderPageControllerSettings(getPhiBuilderPageDraftKey("public", "page_meta", pageKey), []);
}

async function save(pageKey: string) {
  const state = builderWorkspaceStore.getSnapshot(PHI_WORKSPACE_CATALOG_SCOPE);
  await savePhiDeveloperBuilderDraft(
    {
      ...state,
      area: "public",
      pageKey,
      modulePresetPagesByArea: { public: PAGES },
      customPages: {},
      areaPresetSourcesByArea: {},
      persistedPageCatalogByArea: {},
      draftAllocations: {
        ...state.draftAllocations,
        [`public:${pageKey}:page`]: ALLOCATION,
      },
    } as never,
    {},
    "pages",
    { builderPlugins: [] },
  );
  return posted.at(-1)!.body;
}

describe("Page meta drafts are kept per Page", () => {
  it("does not carry the meta of the Page that was open into another Page's save", async () => {
    openPage("error-401", { title: "401", description: "Canonical starter structure for PHIS-powered sites.", index: false });
    openPage("imprint", { title: "Imprint", description: null, index: true });

    const payload = await save("imprint");

    expect(payload.path).toBe("/imprint");
    expect(payload.pageMeta).toEqual({ title: "Imprint", description: null, index: true });
    expect(payload.page.flags).toBe(0);
  });

  it("keeps an edit of one Page off the other", async () => {
    openPage("error-401", { title: "401", description: null, index: false });
    openPage("imprint", { title: "Imprint", description: null, index: true });
    setPhiBuilderPageMetaDraft(getPhiBuilderPageDraftKey("public", "page_meta", "imprint"), { title: "Legal" });

    expect((await save("error-401")).pageMeta.title).toBe("401");
    expect((await save("imprint")).pageMeta.title).toBe("Legal");
  });
});
