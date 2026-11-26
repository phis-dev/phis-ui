import { describe, expect, it } from "vitest";

import { collectPhiConfigTexts } from "../../../../../helpers/config-text-fields";
import type { PhiCmsConfigField } from "../../../../../types/cms-plugins";
import { PHI_TABLE_WIDGET_DEFINITION, parsePhiTableWidgetConfig } from "./config";

/* A column's `emptyText`: what its cell says where the row holds no value (TABLES.md, "Columns"). */

const column = (extra: Record<string, unknown>) => ({ key: "expires", title: "Expires", fieldKey: "expiresAt", renderer: "datetime", ...extra });
const parseColumn = (extra: Record<string, unknown>) =>
  parsePhiTableWidgetConfig({ presentation: { columns: [column(extra)] } }).presentation.columns[0];

describe("a Table column's emptyText", () => {
  it("is read as the column states it, and absent where it states none", () => {
    expect(parseColumn({ emptyText: "Unlimited" }).emptyText).toBe("Unlimited");
    expect(parseColumn({}).emptyText).toBeUndefined();
    expect(parseColumn({ emptyText: "" }).emptyText).toBeUndefined();
  });

  it("refuses anything but a text", () => {
    expect(() => parseColumn({ emptyText: 0 })).toThrow(/emptyText/u);
    expect(() => parseColumn({ emptyText: { en: "Unlimited" } })).toThrow(/emptyText/u);
    expect(() => parseColumn({ emptyText: true })).toThrow(/emptyText/u);
  });

  it("is a word on the page: the text pass reads it as a label, as it reads the column's title", () => {
    const columns = PHI_TABLE_WIDGET_DEFINITION.fields.find((field) => field.key === "presentation.columns");
    if (columns?.type !== "collection") throw new Error("The Table has no columns collection.");
    const fields: PhiCmsConfigField[] = [{ ...columns, key: "columns" }];
    const texts = collectPhiConfigTexts(fields, { columns: [column({ emptyText: "Unlimited" })] });
    expect(texts).toContainEqual({ path: ["columns", 0, "emptyText"], register: "label", text: "Unlimited" });
    expect(texts).toContainEqual({ path: ["columns", 0, "title"], register: "label", text: "Expires" });
  });
});
