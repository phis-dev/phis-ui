import { describe, expect, it } from "vitest";

import { validatePhiTableWidgetBinding } from "../../../../../helpers/table-widget-binding";
import type { PhiTableProviderResourceDescriptor } from "../../../../../types/table-widget";
import { PHI_TABLE_WIDGET_DEFINITION, parsePhiTableWidgetConfig } from "./config";

/* A column's second line: another field of the row under the column's own (TABLES.md, "Columns"). */

const resource: PhiTableProviderResourceDescriptor = {
  resourceKey: "products",
  title: "Products",
  rowIdentityPath: "id",
  fields: [
    { key: "id", title: "ID", type: "string", required: true },
    { key: "title", title: "Title", type: "string" },
    { key: "state", title: "State", type: "enum", options: [{ value: "draft", label: "Draft" }] },
    { key: "updatedAt", title: "Updated", type: "datetime" },
    { key: "active", title: "Active", type: "boolean" },
  ],
  query: { search: false, sorting: "single", pagination: "offset", total: true },
};

const parse = (secondary: unknown) => parsePhiTableWidgetConfig({
  presentation: { columns: [{ key: "title", title: "Title", fieldKey: "title", secondary }] },
});

describe("a Table column's second line", () => {
  it("is read with its own renderer, words, colours and empty text", () => {
    const column = parse({
      fieldKey: "state",
      renderer: "badge",
      valueMap: { draft: "Draft" },
      tagColorMap: { draft: "warning" },
      emptyText: "No state",
    }).presentation.columns[0]!;
    expect(column.secondary).toEqual({
      fieldKey: "state",
      renderer: "badge",
      valueMap: { draft: "Draft" },
      tagColorMap: { draft: "warning" },
      tagVariant: "outlined",
      emptyText: "No state",
    });
    expect(parse(undefined).presentation.columns[0]!.secondary).toBeUndefined();
    expect(parse({ fieldKey: "state" }).presentation.columns[0]!.secondary?.renderer).toBe("text");
  });

  it("refuses what it cannot read rather than drawing nothing", () => {
    expect(() => parse("state")).toThrow(/secondary/u);
    expect(() => parse({ renderer: "badge" })).toThrow(/secondary\.fieldKey/u);
    expect(() => parse({ fieldKey: "state", renderer: "sparkline" })).toThrow(/secondary\.renderer/u);
    expect(() => parse({ fieldKey: "state", valueMap: { draft: 1 } })).toThrow(/valueMap/u);
    expect(() => parse({ fieldKey: "state", emptyText: 0 })).toThrow(/emptyText/u);
  });

  it("is held to the resource where the config is made, as the column's own field is", () => {
    expect(validatePhiTableWidgetBinding(parse({ fieldKey: "state", renderer: "badge" }), resource)).toEqual([]);
    expect(validatePhiTableWidgetBinding(parse({ fieldKey: "updatedAt", renderer: "datetime" }), resource)).toEqual([]);
    expect(validatePhiTableWidgetBinding(parse({ fieldKey: "missing" }), resource))
      .toEqual(['Table column "title" second line references undeclared field "missing".']);
    expect(validatePhiTableWidgetBinding(parse({ fieldKey: "active", renderer: "datetime" }), resource))
      .toEqual(['Table column "title" second line renderer is incompatible with field "active".']);
  });

  it("is offered in the Inspector, its empty text a label for the text pass", () => {
    const columns = PHI_TABLE_WIDGET_DEFINITION.fields.find((field) => field.key === "presentation.columns");
    if (columns?.type !== "collection") throw new Error("The Table has no columns collection.");
    const keys = columns.itemFields.map((field) => field.key);
    expect(keys).toEqual(expect.arrayContaining(["secondary.fieldKey", "secondary.renderer", "secondary.emptyText"]));
    expect(columns.itemFields.find((field) => field.key === "secondary.emptyText")).toMatchObject({ text: "label" });
  });
});
