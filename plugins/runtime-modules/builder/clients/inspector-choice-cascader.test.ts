import { describe, expect, it } from "vitest";

import { readPhiControlOptions, type PhiControlOption } from "../../../../components/controls/phi-control-options";
import {
  PHI_INSPECTOR_CHOICE_CASCADER_SEPARATOR as SEP,
  buildPhiInspectorChoiceCascader,
  readPhiInspectorChoiceCascaderPath,
  readPhiInspectorChoiceCascaderValue,
} from "./inspector-choice-cascader";

const path = (...values: string[]) => values.join(SEP);

describe("buildPhiInspectorChoiceCascader", () => {
  const options: PhiControlOption[] = [
    { value: "3", label: "Summer", parentValue: "2" },
    { value: "1", label: "Shop" },
    { value: "2", label: "Events", parentValue: "1", icon: "lock", description: "Locked" },
    { value: "4", label: "Press" },
  ];

  it("builds each option's path from its parentValue chain, parents first, with its own label", () => {
    const cascader = buildPhiInspectorChoiceCascader(options);
    expect(cascader.options).toEqual([
      { value: "1", label: "Shop" },
      { value: "4", label: "Press" },
      { value: path("1", "2"), label: "Events", icon: "lock", description: "Locked" },
      { value: path("1", "2", "3"), label: "Summer" },
    ]);
    expect(readPhiInspectorChoiceCascaderPath(cascader, "3")).toBe(path("1", "2", "3"));
  });

  it("writes back the chosen option's own value at every level", () => {
    const cascader = buildPhiInspectorChoiceCascader(options);
    expect(readPhiInspectorChoiceCascaderValue(cascader, path("1", "2", "3"))).toBe("3");
    expect(readPhiInspectorChoiceCascaderValue(cascader, path("1", "2"))).toBe("2");
    expect(readPhiInspectorChoiceCascaderValue(cascader, "1")).toBe("1");
  });

  it("writes nothing for a path no option has or a disabled option", () => {
    const cascader = buildPhiInspectorChoiceCascader([...options, { value: "5", label: "Old", disabled: true }]);
    expect(readPhiInspectorChoiceCascaderValue(cascader, "typed search")).toBeNull();
    expect(readPhiInspectorChoiceCascaderValue(cascader, "5")).toBeNull();
  });

  it("keeps a list without parentValue flat", () => {
    const cascader = buildPhiInspectorChoiceCascader([
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ]);
    expect(cascader.options.map((option) => option.value)).toEqual(["a", "b"]);
  });

  it("puts an option whose parent is missing at the top level", () => {
    const cascader = buildPhiInspectorChoiceCascader([{ value: "7", label: "Orphan", parentValue: "99" }]);
    expect(cascader.options).toEqual([{ value: "7", label: "Orphan" }]);
    expect(readPhiInspectorChoiceCascaderValue(cascader, "7")).toBe("7");
  });

  it("puts the options of a cycle at the top level, and keeps what stands below them", () => {
    const cascader = buildPhiInspectorChoiceCascader([
      { value: "a", label: "A", parentValue: "b" },
      { value: "b", label: "B", parentValue: "a" },
      { value: "c", label: "C", parentValue: "a" },
      { value: "d", label: "D", parentValue: "d" },
    ]);
    expect(Object.fromEntries(cascader.pathByValue)).toEqual({
      a: "a",
      b: "b",
      c: path("a", "c"),
      d: "d",
    });
  });

  it("keeps a value that is itself a path as one level", () => {
    const cascader = buildPhiInspectorChoiceCascader([
      { value: "/shop", label: "Shop" },
      { value: "/shop/cart", label: "Cart", parentValue: "/shop" },
    ]);
    expect(readPhiInspectorChoiceCascaderPath(cascader, "/shop/cart")).toBe(path("/shop", "/shop/cart"));
    expect(readPhiInspectorChoiceCascaderValue(cascader, path("/shop", "/shop/cart"))).toBe("/shop/cart");
  });

  it("hands the Cascader a stored value no option has as it is", () => {
    const cascader = buildPhiInspectorChoiceCascader(options);
    expect(readPhiInspectorChoiceCascaderPath(cascader, "42")).toBe("42");
    expect(readPhiInspectorChoiceCascaderPath(cascader, undefined)).toBeUndefined();
  });
});

describe("readPhiControlOptions", () => {
  it("keeps an option's parentValue", () => {
    expect(readPhiControlOptions([{ value: "2", label: "Events", parentValue: "1" }])[0]?.parentValue).toBe("1");
    expect(readPhiControlOptions([{ value: "1", label: "Shop" }])[0]?.parentValue).toBeUndefined();
  });
});
