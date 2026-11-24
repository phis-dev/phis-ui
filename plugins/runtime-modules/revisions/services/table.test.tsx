// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMemo, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PhiIntlLocaleProvider } from "../../../../components/root/phi-intl-locale";
import { usePhiTableBinding } from "../../../../components/tables/client/phi-table-binding";
import { usePhiTableBindingParams } from "../../../../components/tables/client/phi-table-binding-params";
import { PHI_BUILDER_REVISIONS_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/revisions";
import {
  phiWorkspaceCatalogStore,
  PHI_WORKSPACE_CATALOG_SCOPE,
} from "../../../../components/workspace/catalog-store";
import { createEmptyPhiBuilderModulePresetPagesByArea } from "../../../../helpers/cms-page-catalog";
import type { PhiCmsPresetSource } from "../../../../types/cms-module-descriptors";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PhiRevisionsTableProviderClient } from "./table";

/*
 * Opening the Builder's Revisions read the same history up to six times, the Table drawing its skeleton
 * between the answers: it read before it was handed a scope, made one up from the catalog meanwhile,
 * read again for every time the Controller handed the same scope and for each of its two selects
 * answering in the same commit. What is pinned here is the number of reads: none before the scope is
 * handed, one when it is, none for the same scope again however often, and one for another scope.
 */
const shellSource = { ownerModuleId: "@phis/dev/modules/site", presetKey: "public-shell", sourcePresetVersion: 1 } as PhiCmsPresetSource;
const welcomeSource = { ownerModuleId: "@phis/ui/modules/public", presetKey: "public-welcome-page", sourcePresetVersion: 1 } as PhiCmsPresetSource;

/** The params the Revisions Page configures its Table with: labels, and nothing to ask about. */
const CONFIGURED = { labels: PHI_BUILDER_REVISIONS_WIDGET_DEFAULT_LABELS, locale: "en", timeZone: "UTC" };

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  void input;
  return new Response(JSON.stringify({
    kind: "area",
    scope: { area: "public", path: null, navKey: null, themeKey: null },
    current: { publishedRevisionId: 7, workingDraftRevisionId: null },
    rows: [{
      revisionId: 7,
      createdAt: "2026-11-24T10:00:00.000Z",
      createdByUserId: null,
      createdByLabel: null,
      savedAt: null,
      savedByLabel: null,
      message: null,
      sourceRevisionId: null,
      isPublished: true,
      isWorkingDraft: false,
      sourcePreset: shellSource,
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});

const reads = () => fetchMock.mock.calls
  .map(([input]) => String(input))
  .filter((url) => url.startsWith("/api/site/cms/revisions?"));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <PhiIntlLocaleProvider locale="en" timeZone="UTC" renderedAt={0}>
      <PhiRevisionsTableProviderClient>{children}</PhiRevisionsTableProviderClient>
    </PhiIntlLocaleProvider>
  );
}

/** The history Table as the Table Widget runs it: its binding params, and the binding they feed. */
function useHistoryTable() {
  const { bindingParams, changeBindingParams } = usePhiTableBindingParams(CONFIGURED);
  const source = useMemo(() => ({
    providerKey: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.table,
    resourceKey: "history",
    params: bindingParams,
  }), [bindingParams]);
  return { table: usePhiTableBinding({ source: source as never }), changeBindingParams };
}

/** Lets queued effects and answers run. */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(null, "", "/builder/phis/ui/revisions?phiBuilderArea=public");
  phiWorkspaceCatalogStore.patch(PHI_WORKSPACE_CATALOG_SCOPE, (current) => ({
    ...current,
    area: "public",
    pageKey: "m-welcome",
    catalogHydrated: true,
    pageCatalogHydratedByArea: { public: true },
    modulePresetPagesByArea: {
      ...createEmptyPhiBuilderModulePresetPagesByArea(),
      public: [{ key: "m-welcome", title: "Welcome", storagePath: "/", sourcePreset: welcomeSource }],
    },
    areaPresetSourcesByArea: { public: shellSource },
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Builder's Revisions history Table", () => {
  it("reads nothing before it is handed a scope, and stays loading meanwhile", async () => {
    const hook = renderHook(useHistoryTable, { wrapper });
    await flush();
    // Its two selects answer in the same commit, the kind and the Area: still no scope handed.
    act(() => {
      hook.result.current.changeBindingParams({ kind: "area" });
      hook.result.current.changeBindingParams({ scopeKey: "public" });
    });
    await flush();
    expect(reads()).toEqual([]);
    expect(hook.result.current.table.loading).toBe(true);
    expect(hook.result.current.table.rows).toEqual([]);
  });

  it("reads once when the scope is handed, not again for the same scope, and once for another", async () => {
    const hook = renderHook(useHistoryTable, { wrapper });
    await flush();
    const area = { area: "public", kind: "area", scopeKey: "public" };
    act(() => {
      hook.result.current.changeBindingParams({ kind: "area" });
      hook.result.current.changeBindingParams({ scopeKey: "public" });
    });
    act(() => {
      expect(hook.result.current.changeBindingParams(area)).not.toBeNull();
    });
    await waitFor(() => expect(hook.result.current.table.rows).toHaveLength(1));
    expect(reads()).toEqual([
      "/api/site/cms/revisions?kind=area&area=public&ownerModuleId=%40phis%2Fdev%2Fmodules%2Fsite&presetKey=public-shell",
    ]);

    // The catalog answers again and again while the Builder opens; each time the same scope is handed.
    for (let handed = 0; handed < 3; handed += 1) {
      act(() => {
        expect(hook.result.current.changeBindingParams({ ...area })).toBeNull();
      });
      await flush();
    }
    expect(reads()).toHaveLength(1);
    expect(hook.result.current.table.loading).toBe(false);

    act(() => {
      hook.result.current.changeBindingParams({ kind: "page", scopeKey: "/" });
    });
    await waitFor(() => expect(reads()).toHaveLength(2));
    expect(reads()[1]).toBe(
      "/api/site/cms/revisions?kind=page&area=public&ownerModuleId=%40phis%2Fui%2Fmodules%2Fpublic&presetKey=public-welcome-page",
    );
    await flush();
    expect(reads()).toHaveLength(2);
  });

  it("reads nothing for a kind chosen beside the scope of the kind before it, until its scope answers", async () => {
    const hook = renderHook(useHistoryTable, { wrapper });
    await flush();
    act(() => {
      hook.result.current.changeBindingParams({ area: "public", kind: "area", scopeKey: "public" });
    });
    await waitFor(() => expect(reads()).toHaveLength(1));
    act(() => {
      hook.result.current.changeBindingParams({ kind: "page" });
    });
    await flush();
    expect(reads()).toHaveLength(1);
    act(() => {
      hook.result.current.changeBindingParams({ scopeKey: "/" });
    });
    await waitFor(() => expect(reads()).toHaveLength(2));
  });
});
