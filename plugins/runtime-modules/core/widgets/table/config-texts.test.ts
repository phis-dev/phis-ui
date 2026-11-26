import { describe, expect, it } from "vitest";

import { collectPhiConfigTexts, writePhiConfigTexts } from "../../../../../helpers/config-text-fields";
import { PHI_TABLE_WIDGET_DEFINITION } from "./config";

/*
 * A Table's words where the Builder writes them, found by the Widget text pass (TRANSLATIONS.md, "Widget
 * config text"). Its Inspector fields are dot paths -- `presentation.columns`, an entry's
 * `secondary.emptyText` -- and the pass read them as flat keys once, so none of them was translated
 * (owner, 2026-11-26).
 */
const config = {
  presentation: {
    title: "Licences",
    columns: [{
      key: "expires",
      fieldKey: "expiresAt",
      title: "Expires",
      description: "When the licence ends",
      renderer: "datetime",
      emptyText: "Unlimited",
      secondary: { fieldKey: "state", emptyText: "No state" },
    }],
    emptyState: { title: "No licence yet" },
    footer: { template: "%1 licences", values: [{ key: "rows", value: { source: "core", fieldKey: "totalRows" } }] },
  },
  features: { filters: [{ key: "state", type: "text", label: "State" }] },
};

describe("a Table's texts for the Widget text pass", () => {
  const texts = collectPhiConfigTexts(PHI_TABLE_WIDGET_DEFINITION.fields, config);

  it("finds every word the Builder writes under a dot path, through the lists", () => {
    expect(texts).toEqual(expect.arrayContaining([
      { path: ["presentation", "title"], register: "label", text: "Licences" },
      { path: ["presentation", "columns", 0, "title"], register: "label", text: "Expires" },
      { path: ["presentation", "columns", 0, "description"], register: "message", text: "When the licence ends" },
      { path: ["presentation", "columns", 0, "emptyText"], register: "label", text: "Unlimited" },
      { path: ["presentation", "columns", 0, "secondary", "emptyText"], register: "label", text: "No state" },
      { path: ["presentation", "emptyState", "title"], register: "label", text: "No licence yet" },
      { path: ["presentation", "footer", "template"], register: "message", text: "%1 licences" },
      { path: ["features", "filters", 0, "label"], register: "label", text: "State" },
    ]));
  });

  it("finds no key, field or value a Table works with", () => {
    const words = texts.map((text) => text.text);
    for (const notText of ["expires", "expiresAt", "datetime", "state", "rows", "totalRows", "core", "text"]) {
      expect(words).not.toContain(notText);
    }
  });

  it("writes the answers back where it found them, and nothing else", () => {
    const written = writePhiConfigTexts(config, texts.map((text) => ({ path: text.path, text: `de:${text.text}` })));
    const presentation = written.presentation as typeof config.presentation;
    expect(presentation.columns[0]).toMatchObject({
      key: "expires",
      title: "de:Expires",
      emptyText: "de:Unlimited",
      secondary: { fieldKey: "state", emptyText: "de:No state" },
    });
    expect(presentation.footer).toEqual({ ...config.presentation.footer, template: "de:%1 licences" });
    expect((written.features as typeof config.features).filters[0]).toEqual({ key: "state", type: "text", label: "de:State" });
    // The config it was given is left as it was.
    expect(config.presentation.columns[0]!.title).toBe("Expires");
  });
});
