// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PhiIntlLocaleProvider } from "../root/phi-intl-locale";
import type { PhiControlOption, PhiControlOptionsProviderConfig } from "./phi-control-options";
import {
  createPhiControlOptionsProviderClient,
  usePhiControlOptionsProvider,
  type PhiControlOptionsProviderContext,
  type PhiControlOptionsProviderRegistration,
} from "./phi-options-provider";

/**
 * What the options hook tells a provider about the control's value, and what it keeps of it.
 *
 * A provider that answers with one page of a longer list cannot name a chosen value that is not on the
 * page unless it hears which values are chosen (`selected`); and any answer that leaves a chosen value
 * out would show the raw value where its name was, so the hook keeps the last option it saw for it.
 */
// A third-party key: a first-party one would need an owner in runtime-module-ownership.ts.
const providerKey = "@acme/options-hook-test/options/page" as const;

type Page = { page: string; options: PhiControlOption[] };

function mountProvider(registration: Omit<PhiControlOptionsProviderRegistration, "key">) {
  const Provider = createPhiControlOptionsProviderClient({ key: providerKey, ...registration });
  return function wrapper({ children }: { children: ReactNode }) {
    return (
      <PhiIntlLocaleProvider locale="en" timeZone="UTC" renderedAt={0}>
        <Provider>{children}</Provider>
      </PhiIntlLocaleProvider>
    );
  };
}

function localeWrapper({ children }: { children: ReactNode }) {
  return <PhiIntlLocaleProvider locale="en" timeZone="UTC" renderedAt={0}>{children}</PhiIntlLocaleProvider>;
}

function providerConfig(page: string): PhiControlOptionsProviderConfig {
  return { providerKey, params: { page } };
}

/** A provider that loads one page per `params.page`, and hands back what it was asked with. */
function createPagedProvider(pages: Record<string, PhiControlOption[]>) {
  const loads: Omit<PhiControlOptionsProviderContext, "asyncData">[] = [];
  const resolves: PhiControlOptionsProviderContext[] = [];
  const pending = new Map<string, (page: Page) => void>();
  const registration: Omit<PhiControlOptionsProviderRegistration, "key"> = {
    load: vi.fn((context) => {
      loads.push(context);
      const page = String(context.optionsProvider?.params?.page ?? "");
      return new Promise<Page>((resolve) => pending.set(page, resolve));
    }),
    resolveLoadKey: (context) => String(context.optionsProvider?.params?.page ?? ""),
    resolve: (context) => {
      resolves.push(context);
      return { options: (context.asyncData as Page | null)?.options ?? [] };
    },
  };
  function answer(page: string) {
    pending.get(page)?.({ page, options: pages[page] ?? [] });
    pending.delete(page);
  }
  return { registration, loads, resolves, answer };
}

const alpha = { value: "a", label: "Alpha" };
const beta = { value: "b", label: "Beta" };
const gamma = { value: "c", label: "Gamma" };

describe("usePhiControlOptionsProvider: selected", () => {
  it("hands a provider one value for a single choice and none while nothing is chosen", async () => {
    const provider = createPagedProvider({ one: [alpha] });
    const hook = renderHook(
      ({ selectedValues }: { selectedValues: unknown }) => usePhiControlOptionsProvider({
        optionsProvider: providerConfig("one"),
        selectedValues,
      }),
      { wrapper: mountProvider(provider.registration), initialProps: { selectedValues: "b" as unknown } },
    );
    expect(provider.loads.at(-1)?.selected).toEqual(["b"]);
    provider.answer("one");
    await waitFor(() => expect(provider.resolves.at(-1)?.selected).toEqual(["b"]));

    for (const empty of [undefined, null, ""]) {
      hook.rerender({ selectedValues: empty });
      expect(provider.resolves.at(-1)?.selected).toEqual([]);
    }
  });

  it("hands a provider every value of a multiple choice, and the same list while they stay the same", async () => {
    const provider = createPagedProvider({ one: [alpha] });
    const hook = renderHook(
      ({ selectedValues }: { selectedValues: unknown }) => usePhiControlOptionsProvider({
        optionsProvider: providerConfig("one"),
        selectedValues,
      }),
      { wrapper: mountProvider(provider.registration), initialProps: { selectedValues: ["a", 7, "", null] as unknown } },
    );
    provider.answer("one");
    await waitFor(() => expect(provider.resolves.at(-1)?.selected).toEqual(["a", 7]));
    const first = provider.resolves.at(-1)?.selected;

    // A list built afresh with the same values is the same `selected`.
    hook.rerender({ selectedValues: ["a", 7] });
    expect(provider.resolves.at(-1)?.selected).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("does not ask again when only the choice changes", async () => {
    const provider = createPagedProvider({ one: [alpha, beta] });
    const hook = renderHook(
      ({ selectedValues }: { selectedValues: unknown }) => usePhiControlOptionsProvider({
        optionsProvider: providerConfig("one"),
        selectedValues,
      }),
      { wrapper: mountProvider(provider.registration), initialProps: { selectedValues: "a" as unknown } },
    );
    provider.answer("one");
    await waitFor(() => expect(hook.result.current.options).toEqual([alpha, beta]));

    hook.rerender({ selectedValues: "b" });
    hook.rerender({ selectedValues: ["a", "b"] });
    expect(provider.registration.load).toHaveBeenCalledTimes(1);
    expect(hook.result.current.options).toEqual([alpha, beta]);
    expect(provider.resolves.at(-1)?.selected).toEqual(["a", "b"]);
  });

  it("asks again where the provider takes the choice into its own load key", async () => {
    const load = vi.fn(async (context: Omit<PhiControlOptionsProviderContext, "asyncData">) => context.selected);
    const hook = renderHook(
      ({ selectedValues }: { selectedValues: unknown }) => usePhiControlOptionsProvider({
        optionsProvider: providerConfig("one"),
        selectedValues,
      }),
      {
        wrapper: mountProvider({
          load,
          resolveLoadKey: (context) => JSON.stringify(context.selected),
          resolve: (context) => ({
            options: ((context.asyncData as string[] | null) ?? []).map((value) => ({ value, label: `Named ${value}` })),
          }),
        }),
        initialProps: { selectedValues: "a" as unknown },
      },
    );
    await waitFor(() => expect(hook.result.current.options).toEqual([{ value: "a", label: "Named a" }]));

    hook.rerender({ selectedValues: "b" });
    await waitFor(() => expect(hook.result.current.options).toEqual([{ value: "b", label: "Named b" }]));
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("usePhiControlOptionsProvider: the last known option of a chosen value", () => {
  it("keeps a chosen value's option through a reload that leaves it out, and forgets it once it is no longer chosen", async () => {
    const provider = createPagedProvider({ one: [alpha, beta], two: [gamma] });
    const hook = renderHook(
      ({ page, selectedValues }: { page: string; selectedValues: unknown }) => usePhiControlOptionsProvider({
        optionsProvider: providerConfig(page),
        selectedValues,
      }),
      { wrapper: mountProvider(provider.registration), initialProps: { page: "one", selectedValues: "b" as unknown } },
    );
    provider.answer("one");
    await waitFor(() => expect(hook.result.current.options).toEqual([alpha, beta]));

    // While the next page loads, and once it has: the chosen value keeps its name.
    hook.rerender({ page: "two", selectedValues: "b" });
    expect(hook.result.current.options).toEqual([beta]);
    provider.answer("two");
    await waitFor(() => expect(hook.result.current.options).toEqual([gamma, beta]));

    // A value nobody named again is gone once it is no longer chosen, and does not come back with it.
    hook.rerender({ page: "two", selectedValues: "c" });
    expect(hook.result.current.options).toEqual([gamma]);
    hook.rerender({ page: "two", selectedValues: "b" });
    expect(hook.result.current.options).toEqual([gamma]);
  });

  it("keeps the options of every chosen value of a multiple choice, and leaves the answer alone while nothing is missing", () => {
    const all = [alpha, beta, gamma];
    const hook = renderHook(
      ({ options, selectedValues }: { options: PhiControlOption[]; selectedValues: unknown }) =>
        usePhiControlOptionsProvider({ options, selectedValues }),
      { wrapper: localeWrapper, initialProps: { options: all, selectedValues: ["a", "c"] as unknown } },
    );
    const complete = hook.result.current;
    expect(complete.options).toEqual([alpha, beta, gamma]);
    hook.rerender({ options: all, selectedValues: ["a", "c"] });
    expect(hook.result.current).toBe(complete);

    hook.rerender({ options: [beta], selectedValues: ["a", "c"] });
    expect(hook.result.current.options).toEqual([beta, alpha, gamma]);

    hook.rerender({ options: [beta], selectedValues: ["c"] });
    expect(hook.result.current.options).toEqual([beta, gamma]);
  });

  it("keeps the newest option a value was seen with", () => {
    const hook = renderHook(
      ({ options }: { options: PhiControlOption[] }) => usePhiControlOptionsProvider({ options, selectedValues: "a" }),
      { wrapper: localeWrapper, initialProps: { options: [alpha] } },
    );
    hook.rerender({ options: [{ value: "a", label: "Alpha, renamed" }] });
    hook.rerender({ options: [] });
    expect(hook.result.current.options).toEqual([{ value: "a", label: "Alpha, renamed" }]);
  });

  it("renders on the server what it hydrates with: nothing kept before an option is known", () => {
    function Probe() {
      const { options } = usePhiControlOptionsProvider({ options: [alpha, beta], selectedValues: "b" });
      return createElement("span", null, options.map((option) => option.label).join(","));
    }
    expect(renderToString(createElement(localeWrapper, null, createElement(Probe)))).toBe("<span>Alpha,Beta</span>");
  });
});
