// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PhiIntlLocaleProvider } from "../../root/phi-intl-locale";
import type { PhiControlOption } from "../../controls/phi-control-options";
import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../controls/phi-options-provider";
import type { PhiTableFilterDefinition } from "../../../types/table-widget";
import { usePhiTableFilterOptions } from "./phi-table-filter-options";

/**
 * A Table filter whose choices an Options Provider answers a page at a time.
 *
 * The filter used to ask its source without what was typed and without what it held, so it offered the
 * first page and nothing else, and a chosen value on no page showed as its id. It asks as a Form field
 * does now: the route is searched, and the chosen value is named.
 */
// A third-party key: a first-party one would need an owner in runtime-module-ownership.ts.
const providerKey = "@acme/table-filter-test/options/categories" as const;

const CATEGORIES: PhiControlOption<number>[] = [
  { value: 1, label: "Alpine" },
  { value: 2, label: "Beach" },
  { value: 42, label: "Glacier" },
];

type LoadContext = Omit<PhiControlOptionsProviderContext<number>, "asyncData">;

function mountCategories() {
  const loads: LoadContext[] = [];
  const Provider = createPhiControlOptionsProviderClient<number>({
    key: providerKey,
    // One "page" of two, searched by the route; the chosen one is read beside it, as the Shop's does.
    load: vi.fn(async (context: LoadContext) => {
      loads.push(context);
      const page = CATEGORIES
        .filter((category) => category.label.toLowerCase().includes(context.search.toLowerCase()))
        .slice(0, 2);
      const chosen = context.search
        ? []
        : CATEGORIES.filter((category) => context.selected.includes(category.value) && !page.includes(category));
      return [...chosen, ...page];
    }),
    resolveLoadKey: (context) => `${context.search}:${context.search ? "" : context.selected.join(",")}`,
    resolve: (context) => ({ options: (context.asyncData as PhiControlOption<number>[] | null) ?? [] }),
  });
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <PhiIntlLocaleProvider locale="en" timeZone="UTC" renderedAt={0}>
        <Provider>{children}</Provider>
      </PhiIntlLocaleProvider>
    );
  }
  return { loads, wrapper };
}

const serverFilter: PhiTableFilterDefinition = {
  key: "categoryId",
  type: "select",
  label: "Category",
  optionsProvider: { providerKey, loadMode: "server", search: { enabled: true, minChars: 1 } },
};

describe("a select filter on a searching Options Provider", () => {
  it("tells the provider the value it holds, so a chosen value on no page is named", async () => {
    const { loads, wrapper } = mountCategories();
    const hook = renderHook(() => usePhiTableFilterOptions({ filter: serverFilter, value: 42 }), { wrapper });
    await waitFor(() => expect(hook.result.current.options.map((option) => option.label)).toContain("Glacier"));
    expect(loads.at(-1)?.selected).toEqual([42]);
  });

  it("has the route search what is typed, and keeps the chosen name while the answer leaves it out", async () => {
    const { loads, wrapper } = mountCategories();
    const hook = renderHook(() => usePhiTableFilterOptions({ filter: serverFilter, value: 42 }), { wrapper });
    await waitFor(() => expect(hook.result.current.options.map((option) => option.label)).toContain("Glacier"));
    expect(hook.result.current.onSearch).toBeTypeOf("function");
    // The route answered the search: the Select does not narrow it again.
    expect(hook.result.current.filterOptionsLocally).toBe(false);

    act(() => hook.result.current.onSearch?.("be"));
    await waitFor(() => expect(loads.at(-1)?.search).toBe("be"));
    await waitFor(() => expect(hook.result.current.options.map((option) => option.value)).toContain(2));
    // "Glacier" is not among what the search answered, and is still named.
    expect(hook.result.current.options.find((option) => option.value === 42)?.label).toBe("Glacier");
  });

  it("offers no search where its source declares none", () => {
    const { wrapper } = mountCategories();
    const hook = renderHook(() => usePhiTableFilterOptions({
      filter: { ...serverFilter, optionsProvider: { providerKey } },
      value: undefined,
    }), { wrapper });
    expect(hook.result.current.onSearch).toBeUndefined();
    expect(hook.result.current.filterOptionsLocally).toBe(true);
  });

  it("hands a filter that is not a choice no value as selected", async () => {
    const { loads, wrapper } = mountCategories();
    renderHook(() => usePhiTableFilterOptions({
      filter: { key: "title", type: "text", label: "Title" },
      value: "Alp",
    }), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(loads).toHaveLength(0);
  });
});
