import { describe, expect, it } from "vitest";

import { PHI_FORM_TABLE_DEFAULT_LABELS, PHI_FORM_TABLE_LABEL_KEYS } from "./table-field-labels";
import { readPhiFormTableFieldText } from "./table-field-text";

/**
 * The table field's add, remove and empty words: a text its config names (a label reference read from
 * the Form's labels, or a literal), else the Form's word under the table keys -- Core's `widget:table`
 * words, put there by the Form Widget -- else the English source. A plain string is no text.
 */
describe("readPhiFormTableFieldText", () => {
  const formLabels = {
    [PHI_FORM_TABLE_LABEL_KEYS.add]: "Hinzufügen",
    [PHI_FORM_TABLE_LABEL_KEYS.empty]: "Noch keine Zeilen.",
    "rows.add": "Zeile hinzufügen",
  };

  it("reads a label reference from the Form's labels, its fallback where they have none", () => {
    expect(readPhiFormTableFieldText({ kind: "label", key: "rows.add", fallback: "Add a row" }, formLabels, "add"))
      .toBe("Zeile hinzufügen");
    expect(readPhiFormTableFieldText({ kind: "label", key: "rows.remove", fallback: "Remove a row" }, formLabels, "remove"))
      .toBe("Remove a row");
  });

  it("reads a literal as written", () => {
    expect(readPhiFormTableFieldText({ kind: "literal", value: "Drop" }, formLabels, "remove")).toBe("Drop");
  });

  it("says the Form's word under the table keys where the config names none", () => {
    expect(readPhiFormTableFieldText(undefined, formLabels, "add")).toBe("Hinzufügen");
    expect(readPhiFormTableFieldText(undefined, formLabels, "empty")).toBe("Noch keine Zeilen.");
  });

  it("says the English source without labels, and does not read a plain string", () => {
    expect(readPhiFormTableFieldText(undefined, undefined, "remove")).toBe(PHI_FORM_TABLE_DEFAULT_LABELS.remove);
    expect(readPhiFormTableFieldText("Add row", undefined, "add")).toBe(PHI_FORM_TABLE_DEFAULT_LABELS.add);
    expect(readPhiFormTableFieldText("Nothing", formLabels, "empty")).toBe("Noch keine Zeilen.");
  });
});
