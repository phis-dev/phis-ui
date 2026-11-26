import { describe, expect, it } from "vitest";

import { evaluatePhiRuntimeConditionExpression } from "../../../../../types/runtime-condition";
import { PHI_TABLE_WIDGET_DEFINITION } from "./config";

/* The Table's condition editor and what the conditions it writes mean (contracts 0.8.15, TABLES.md). */

function conditionFields() {
  const stack = [...PHI_TABLE_WIDGET_DEFINITION.fields];
  while (stack.length > 0) {
    const field = stack.pop()!;
    if (field.type === "condition-group") return field.conditionFields;
    if (field.type === "collection") stack.push(...field.itemFields);
  }
  throw new Error("The Table offers no condition group.");
}

describe("the Table's condition editor", () => {
  it("offers notEquals beside equals, and a value only where the operator compares with one", () => {
    const operator = conditionFields().find((field) => field.key === "operator");
    if (operator?.type !== "choice") throw new Error("No operator choice.");
    expect(operator.options.map((option) => option.value)).toEqual(["truthy", "falsy", "equals", "notEquals", "contains"]);
    expect(conditionFields().find((field) => field.key === "value")?.visibleWhen).toEqual([
      { field: "operator", notEquals: "truthy" },
      { field: "operator", notEquals: "falsy" },
    ]);
  });
});

describe("what a condition means now", () => {
  const row = (value: unknown) => ({ row: { value } });
  const leaf = (operator: "truthy" | "notEquals", value?: string | number | boolean | null) =>
    ({ source: "row", valuePath: "value", operator, ...(value === undefined ? {} : { value }) }) as const;

  it("reads an empty list as no choice made: truthy does not hold", () => {
    expect(evaluatePhiRuntimeConditionExpression(leaf("truthy"), row([]))).toBe("not-matched");
    expect(evaluatePhiRuntimeConditionExpression(leaf("truthy"), row(["a"]))).toBe("matched");
  });

  it("compares notEquals by type, a number not being its text", () => {
    expect(evaluatePhiRuntimeConditionExpression(leaf("notEquals", 2), row("2"))).toBe("matched");
    expect(evaluatePhiRuntimeConditionExpression(leaf("notEquals", 2), row(2))).toBe("not-matched");
    expect(evaluatePhiRuntimeConditionExpression(leaf("notEquals", null), row(null))).toBe("not-matched");
  });
});
