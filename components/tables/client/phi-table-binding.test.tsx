// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PhiIntlLocaleProvider } from "../../root/phi-intl-locale";

import type {
  PhiTableProviderQueryRequest,
  PhiTableProviderResourceDescriptor,
  PhiTableQuery,
} from "../../../types/table-widget";

/**
 * Paging a resource the Provider pages by cursor.
 *
 * Such a Provider cannot be asked for a page by its number: page N+1 is read with the `nextCursor` page N
 * answered. The Table used to send the page number alone and `cursor: null`, so page 2 was page 1 again.
 * What is proven here is that every page is read with its own cursor, forward and back; that a page whose
 * cursor is not known cannot be reached; that another search, sort, filter or page size starts a new list
 * at its first page; that a reload stays where it is; and that an offset-paged resource still pages by
 * number.
 */
const ITEMS = Array.from({ length: 55 }, (_, index) => ({ id: index + 1 }));

/** Which list a query reads: a cursor is a place in one list, and the Provider refuses it in another. */
function listOf(query: PhiTableQuery) {
  return query.search || query.sorts?.[0]?.key || Object.keys(query.filters ?? {})[0] || "all";
}

/** What the Provider answered, last one last, so a test can wait for the rows of the latest answer. */
const answers: { rows: readonly { id: number }[] }[] = [];
/** Whether the Provider counts the list (`query.total`), answering how many rows it has beside each page. */
let counted = false;

const provider = {
  key: "test-table",
  resources: [] as PhiTableProviderResourceDescriptor[],
  query: vi.fn(async ({ query }: PhiTableProviderQueryRequest) => {
    const list = listOf(query);
    const pageSize = query.pageSize ?? 20;
    let start = 0;
    if (query.cursor) {
      const [cursorList, cursorStart] = query.cursor.split(":");
      if (cursorList !== list) throw new Error(`Cursor "${query.cursor}" belongs to another list.`);
      start = Number(cursorStart);
    }
    const answer = {
      rows: ITEMS.slice(start, start + pageSize),
      nextCursor: start + pageSize < ITEMS.length ? `${list}:${start + pageSize}` : null,
      ...(counted ? { total: ITEMS.length } : {}),
    };
    answers.push(answer);
    return answer;
  }),
};

function resourceWith(pagination: "offset" | "cursor", total = false): PhiTableProviderResourceDescriptor {
  return {
    resourceKey: "rows",
    title: "Rows",
    rowIdentityPath: "id",
    fields: [{ key: "id", title: "ID", type: "number" }],
    query: { search: true, sorting: "single", filterFields: ["status"], pagination, ...(total ? { total } : {}) },
  };
}

let binding: { provider: typeof provider; resource: PhiTableProviderResourceDescriptor; bindingError: null };

vi.mock("../../widgets/client/shared/phi-table-provider", () => ({
  usePhiTableProvider: () => binding,
}));

const { usePhiTableBinding } = await import("./phi-table-binding");

const source = { providerKey: "test-table", resourceKey: "rows" };

function wrapper({ children }: { children: ReactNode }) {
  return <PhiIntlLocaleProvider locale="en" timeZone="UTC" renderedAt={0}>{children}</PhiIntlLocaleProvider>;
}

function lastQuery() {
  return provider.query.mock.lastCall?.[0].query;
}

type Hook = ReturnType<typeof renderHook<ReturnType<typeof usePhiTableBinding>, unknown>>;

/** Waits until the Table shows the rows of the Provider's latest answer. */
async function settled(hook: Hook) {
  await waitFor(() => {
    expect(hook.result.current.rows).toBe(answers.at(-1)?.rows);
    expect(hook.result.current.loading).toBe(false);
  });
}

async function mountTable(pagination: "offset" | "cursor", total = false) {
  binding = { provider, resource: resourceWith(pagination, total), bindingError: null };
  const hook = renderHook(() => usePhiTableBinding({ source: source as never, defaultPageSize: 20 }), { wrapper });
  await settled(hook);
  return hook;
}

/** Turns to `page` and waits for its rows. */
async function turnTo(hook: Hook, page: number, pageSize = 20) {
  act(() => hook.result.current.changePage(page, pageSize));
  await settled(hook);
}

beforeEach(() => {
  provider.query.mockClear();
  answers.length = 0;
  counted = false;
});

describe("a cursor-paged resource", () => {
  it("reads page 1, 2, 3 and back to 2 each with the cursor that page begins at", async () => {
    const hook = await mountTable("cursor");
    expect(lastQuery()).toMatchObject({ page: 1, cursor: undefined });
    expect(hook.result.current.hasMore).toBe(true);

    await turnTo(hook, 2);
    expect(lastQuery()).toMatchObject({ page: 2, cursor: "all:20" });
    expect(hook.result.current.rows[0]).toEqual({ id: 21 });

    await turnTo(hook, 3);
    expect(lastQuery()).toMatchObject({ page: 3, cursor: "all:40" });
    expect(hook.result.current.rows).toHaveLength(15);
    // The last page answered no cursor, so no page follows it.
    expect(hook.result.current.hasMore).toBe(false);

    await turnTo(hook, 2);
    expect(lastQuery()).toMatchObject({ page: 2, cursor: "all:20" });
    expect(hook.result.current.rows[0]).toEqual({ id: 21 });
    expect(hook.result.current.hasMore).toBe(true);

    await turnTo(hook, 1);
    expect(lastQuery()).toMatchObject({ page: 1, cursor: null });
  });

  it("does not reach a page whose cursor it does not know", async () => {
    const hook = await mountTable("cursor");
    const calls = provider.query.mock.calls.length;
    act(() => hook.result.current.changePage(3, 20));
    act(() => hook.result.current.changePage(7, 20));
    expect(hook.result.current.query.page).toBe(1);
    expect(provider.query.mock.calls).toHaveLength(calls);
  });

  it.each<[string, (query: PhiTableQuery) => PhiTableQuery]>([
    ["search", (query) => ({ ...query, page: 1, cursor: null, search: "x" })],
    ["sort", (query) => ({ ...query, page: 1, cursor: null, sorts: [{ key: "id", direction: "descending" }] })],
    ["filter", (query) => ({ ...query, page: 1, cursor: null, filters: { status: "open" } })],
  ])("starts a new list at its first page after a %s, with none of the old cursors", async (_change, patch) => {
    const hook = await mountTable("cursor");
    await turnTo(hook, 2);
    await turnTo(hook, 3);

    act(() => hook.result.current.setQuery(patch));
    await settled(hook);
    expect(lastQuery()).toMatchObject({ page: 1, cursor: null });
    const list = listOf(lastQuery()!);
    expect(list).not.toBe("all");

    // Page 3 was known in the old list and is not in this one.
    const calls = provider.query.mock.calls.length;
    act(() => hook.result.current.changePage(3, 20));
    expect(provider.query.mock.calls).toHaveLength(calls);

    await turnTo(hook, 2);
    expect(lastQuery()).toMatchObject({ page: 2, cursor: `${list}:20` });
    await turnTo(hook, 1);
    expect(lastQuery()).toMatchObject({ page: 1, cursor: null });
  });

  it("holds the count of a list that is counted, and still reaches no page by its number", async () => {
    counted = true;
    const hook = await mountTable("cursor", true);
    expect(hook.result.current.total).toBe(55);
    // 55 rows are three pages of 20, and page 3 is still no place to go to from page 1: a count says how
    // many pages there are, not where the third begins.
    const calls = provider.query.mock.calls.length;
    act(() => hook.result.current.changePage(3, 20));
    expect(provider.query.mock.calls).toHaveLength(calls);

    await turnTo(hook, 2);
    await turnTo(hook, 3);
    expect(lastQuery()).toMatchObject({ page: 3, cursor: "all:40" });
    expect(hook.result.current.total).toBe(55);
    expect(hook.result.current.hasMore).toBe(false);
  });

  it("starts at the first page of another page size", async () => {
    const hook = await mountTable("cursor");
    await turnTo(hook, 2);
    await turnTo(hook, 2, 50);
    expect(lastQuery()).toMatchObject({ page: 1, pageSize: 50, cursor: null });
    await turnTo(hook, 2, 50);
    expect(lastQuery()).toMatchObject({ page: 2, pageSize: 50, cursor: "all:50" });
  });

  it("reads the page it is on again with its own cursor when it reloads", async () => {
    const hook = await mountTable("cursor");
    await turnTo(hook, 2);
    await turnTo(hook, 3);
    const calls = provider.query.mock.calls.length;

    act(() => hook.result.current.reload());
    await settled(hook);
    expect(provider.query.mock.calls.length).toBeGreaterThan(calls);
    expect(lastQuery()).toMatchObject({ page: 3, cursor: "all:40" });
    expect(hook.result.current.rows[0]).toEqual({ id: 41 });

    // ... and still knows the way back.
    await turnTo(hook, 2);
    expect(lastQuery()).toMatchObject({ page: 2, cursor: "all:20" });
  });
});

describe("an offset-paged resource", () => {
  it("is asked for any page by its number, without a cursor", async () => {
    const hook = await mountTable("offset");
    await turnTo(hook, 3);
    expect(lastQuery()).toMatchObject({ page: 3, pageSize: 20, cursor: null });
    await turnTo(hook, 2, 50);
    expect(lastQuery()).toMatchObject({ page: 2, pageSize: 50, cursor: null });
  });
});
