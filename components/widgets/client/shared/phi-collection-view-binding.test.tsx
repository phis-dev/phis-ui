// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMemo, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhiIntlLocaleProvider } from "../../../root/phi-intl-locale";
import type { PhiCollectionProviderData, PhiCollectionProviderQueryRequest } from "../../../../types/collection-provider";
import type { PhiCollectionProviderRegistration } from "./phi-collection-provider";

/**
 * The binding a Collection View reads: one object while nothing in it changes, and a list that only
 * the newest request may write.
 */

type Deferred = { resolve: (data: PhiCollectionProviderData) => void };

const pending: { query: Deferred[]; action: Deferred[] } = { query: [], action: [] };
const queryRequests: PhiCollectionProviderQueryRequest[] = [];

/** The page's language, which a test switches the way the Root does when the reader picks another. */
const intl = { locale: "en", timeZone: "UTC" };
function wrapper({ children }: { children: ReactNode }) {
  return <PhiIntlLocaleProvider locale={intl.locale} timeZone={intl.timeZone} renderedAt={0}>{children}</PhiIntlLocaleProvider>;
}

function defer(bucket: Deferred[]) {
  return new Promise<PhiCollectionProviderData>((resolve) => bucket.push({ resolve }));
}

const provider = {
  key: "@phis/test/collection",
  query: (request: PhiCollectionProviderQueryRequest) => {
    queryRequests.push(request);
    return defer(pending.query);
  },
  action: () => defer(pending.action),
  resources: [{ resourceKey: "items", itemRendererKey: "@phis/test/item" }],
} as unknown as PhiCollectionProviderRegistration;

vi.mock("./phi-collection-provider", () => ({
  usePhiCollectionProvider: () => ({ provider, resource: provider.resources[0], bindingError: null }),
}));

const { usePhiCollectionViewBinding } = await import("./phi-collection-view-binding");

function data(label: string): PhiCollectionProviderData {
  return { items: [{ label }], total: 1, error: null } as unknown as PhiCollectionProviderData;
}

afterEach(() => vi.restoreAllMocks());

const source = { providerKey: "@phis/test/collection", resourceKey: "items" } as const;

describe("usePhiCollectionViewBinding", () => {
  it("keeps the binding object while nothing in it changes", async () => {
    pending.query.length = 0;
    const { result, rerender } = renderHook(() => usePhiCollectionViewBinding({ source }), { wrapper });
    await waitFor(() => expect(pending.query.length).toBeGreaterThan(0));
    await act(async () => pending.query.at(-1)?.resolve(data("first")));
    const before = result.current.binding;
    rerender();
    expect(result.current.binding).toBe(before);
  });

  it("does not let an older action answer overwrite a newer query", async () => {
    pending.query.length = 0;
    pending.action.length = 0;
    const { result } = renderHook(() => usePhiCollectionViewBinding({ source }), { wrapper });
    await waitFor(() => expect(pending.query.length).toBeGreaterThan(0));
    await act(async () => pending.query.at(-1)?.resolve(data("first")));

    let action: Promise<PhiCollectionProviderData> | undefined;
    act(() => {
      action = result.current.binding.activate({ actionKey: "delete", itemKey: 1 });
    });
    const queriesBefore = pending.query.length;
    act(() => result.current.binding.setQuery((current) => ({ ...current, search: "chair" })));
    await waitFor(() => expect(pending.query.length).toBeGreaterThan(queriesBefore));
    await act(async () => pending.query.at(-1)?.resolve(data("chair")));
    expect(result.current.binding.data?.items).toEqual([{ label: "chair" }]);

    await act(async () => {
      pending.action.at(-1)?.resolve(data("after delete"));
      await action;
    });
    expect(result.current.binding.data?.items).toEqual([{ label: "chair" }]);
  });

  it("asks with the reader's language and asks again when it changes", async () => {
    pending.query.length = 0;
    queryRequests.length = 0;
    const { rerender } = renderHook(() => usePhiCollectionViewBinding({ source }), { wrapper });
    await waitFor(() => expect(queryRequests.length).toBeGreaterThan(0));
    expect(queryRequests.at(-1)).toMatchObject({ locale: "en", timeZone: "UTC" });
    await act(async () => pending.query.at(-1)?.resolve(data("first")));

    intl.locale = "de-CH";
    intl.timeZone = "Europe/Zurich";
    try {
      rerender();
      await waitFor(() => expect(queryRequests.at(-1)).toMatchObject({ locale: "de-CH", timeZone: "Europe/Zurich" }));
    } finally {
      intl.locale = "en";
      intl.timeZone = "UTC";
    }
  });
});

describe("binding params", () => {
  it("asks with the source's params, and starts the list over on the first page when they change", async () => {
    pending.query.length = 0;
    queryRequests.length = 0;
    const withParams = (id: number) => ({ ...source, params: { id } });
    const { result, rerender } = renderHook(
      ({ current }: { current: ReturnType<typeof withParams> }) => usePhiCollectionViewBinding({ source: current }),
      { wrapper, initialProps: { current: withParams(1) } },
    );
    await waitFor(() => expect(queryRequests.length).toBeGreaterThan(0));
    expect(queryRequests.at(-1)?.params).toEqual({ id: 1 });
    await act(async () => pending.query.at(-1)?.resolve(data("listing 1")));
    act(() => result.current.binding.setQuery((current) => ({ ...current, page: 3 })));
    await waitFor(() => expect(queryRequests.at(-1)?.query.page).toBe(3));
    await act(async () => pending.query.at(-1)?.resolve(data("listing 1, page 3")));

    rerender({ current: withParams(2) });
    await waitFor(() => expect(queryRequests.at(-1)).toMatchObject({ params: { id: 2 }, query: { page: 1 } }));
    // Nothing of the other listing stands while this one is read.
    expect(result.current.binding.data).toBeNull();
    await act(async () => pending.query.at(-1)?.resolve(data("listing 2")));
    expect(result.current.binding.data?.items).toEqual([{ label: "listing 2" }]);
  });
});


describe("immediate collection answers", () => {
  it("keeps an immediate empty answer settled without a loading flash", async () => {
    const empty = { resourceKey: "items", items: [], total: 0, loading: false, error: null };
    vi.spyOn(provider, "query").mockResolvedValue(empty);
    const states: boolean[] = [];
    const { result, unmount } = renderHook(() => {
      const state = usePhiCollectionViewBinding({ source });
      states.push(state.binding.loading);
      return state;
    }, { wrapper });
    await waitFor(() => expect(result.current.binding.data).toEqual(empty));
    // Let the source-reset and loading timers finish as well: neither may erase the answer.
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 0)); });
    expect(result.current.binding.data).toEqual(empty);
    expect(result.current.binding.loading).toBe(false);
    expect(states).not.toContain(true);
    unmount();
  });

  it("keeps an immediate populated answer after binding params change", async () => {
    vi.spyOn(provider, "query").mockImplementation(async ({ params }) => data(String(params?.id)));
    const { result, rerender, unmount } = renderHook(
      ({ id }) => {
        const current = useMemo(() => ({ ...source, params: { id } }), [id]);
        return usePhiCollectionViewBinding({ source: current });
      },
      { wrapper, initialProps: { id: 1 } },
    );
    await waitFor(() => expect(result.current.binding.data?.items).toEqual([{ label: "1" }]));
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.binding.data?.items).toEqual([{ label: "2" }]));
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 0)); });
    expect(result.current.binding.data?.items).toEqual([{ label: "2" }]);
    expect(result.current.binding.loading).toBe(false);
    unmount();
  });

  it("loads only for a chosen record and ignores its answer after the choice is cleared", async () => {
    const empty = { resourceKey: "items", items: [], total: 0, loading: false, error: null };
    let resolveRead: ((value: PhiCollectionProviderData) => void) | undefined;
    vi.spyOn(provider, "query").mockImplementation(({ params }) => params?.id
      ? new Promise((resolve) => { resolveRead = resolve; })
      : Promise.resolve(empty));
    const { result, rerender, unmount } = renderHook(
      ({ id }: { id: number | null }) => {
        const current = useMemo(() => ({ ...source, params: { id } }), [id]);
        return usePhiCollectionViewBinding({ source: current });
      },
      { wrapper, initialProps: { id: null as number | null } },
    );
    await waitFor(() => expect(result.current.binding.data).toEqual(empty));
    expect(result.current.binding.loading).toBe(false);
    rerender({ id: 17 });
    await waitFor(() => expect(result.current.binding.loading).toBe(true));
    expect(result.current.binding.data).toBeNull();
    await act(async () => resolveRead?.(data("record 17")));
    expect(result.current.binding.data?.items).toEqual([{ label: "record 17" }]);
    expect(result.current.binding.loading).toBe(false);
    rerender({ id: 18 });
    await waitFor(() => expect(result.current.binding.loading).toBe(true));
    rerender({ id: null });
    await waitFor(() => expect(result.current.binding.data).toEqual(empty));
    expect(result.current.binding.loading).toBe(false);
    await act(async () => resolveRead?.(data("obsolete record")));
    expect(result.current.binding.data).toEqual(empty);
    unmount();
  });
});
