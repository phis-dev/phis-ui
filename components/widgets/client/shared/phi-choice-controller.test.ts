// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * A select whose Options Provider searches on the server hands what is typed to the provider, as a Form
 * field and a Table filter do; without a declared search it narrows the options it holds.
 */

const asked: string[] = [];
let searchEnabled = true;

vi.mock("../../../runtime/runtime-signal-bus", () => ({
  usePhiSignalListener: () => undefined,
}));
vi.mock("./phi-control-signals", () => ({
  usePhiControlSignalController: () => ({
    disabled: false,
    emitCapability: () => undefined,
    emitChange: () => undefined,
    emitFocus: () => undefined,
    emitBlur: () => undefined,
  }),
}));
vi.mock("../../../controls/phi-options-provider", () => ({
  usePhiControlOptionsProvider: ({ searchDraft, options }: { searchDraft?: string; options?: unknown[] }) => {
    asked.push(searchDraft ?? "");
    return {
      options: options ?? [],
      value: null,
      search: { enabled: searchEnabled, minChars: 2, filterLocally: !searchEnabled },
    };
  },
}));

const { usePhiChoiceController } = await import("./phi-choice-controller");

describe("usePhiChoiceController", () => {
  it("hands what is typed to a provider that searches on the server", () => {
    asked.length = 0;
    searchEnabled = true;
    const { result } = renderHook(() => usePhiChoiceController({
      config: { options: [], value: "" },
      typeKey: "select-box",
      defaultKey: "select",
    }));
    expect(result.current.filterOptionsLocally).toBe(false);
    act(() => result.current.onSearch!("ada"));
    expect(asked.at(-1)).toBe("ada");
  });

  it("offers no search where the source declares none", () => {
    searchEnabled = false;
    const { result } = renderHook(() => usePhiChoiceController({
      config: { options: [{ value: "a", label: "A" }] },
      typeKey: "select-box",
      defaultKey: "select",
    }));
    expect(result.current.onSearch).toBeUndefined();
    expect(result.current.filterOptionsLocally).toBe(true);
  });

  it("starts on its first option, or with nothing chosen where it may be cleared", () => {
    searchEnabled = false;
    const options = [{ value: "a", label: "A" }, { value: "b", label: "B" }];
    const held = (allowClear?: boolean) => renderHook(() => usePhiChoiceController({
      config: { options, allowClear },
      typeKey: "select-box",
      defaultKey: "select",
    })).result.current.value;
    expect(held()).toBe("a");
    expect(held(true)).toBe("");
  });
});
