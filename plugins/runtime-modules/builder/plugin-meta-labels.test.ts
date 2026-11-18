import { describe, expect, it } from "vitest";

import type { PhiBuilderPluginMeta } from "../../../types/builder";
import { mapPhiBuilderPluginMetaText } from "./plugin-meta-labels";

/*
 * Every text the Inspector shows of a field goes through the same map, so the translation pass sees it:
 * a placeholder left out was never asked for, never stored, and stayed English in every language.
 */
describe("the texts of a plugin the Inspector translates", () => {
  it("include the placeholders of text and size fields and the labels of flags", () => {
    const meta = {
      title: "Widget",
      fields: [
        { key: "a", type: "string", label: "Name", placeholder: "Your name" },
        { key: "b", type: "dimension", label: "Collapsed Size", widthPlaceholder: "Collapsed width", heightPlaceholder: "Collapsed height" },
        { key: "c", type: "flags", label: "Flags", options: [{ value: 1, label: "Hidden" }] },
      ],
    } as unknown as PhiBuilderPluginMeta;
    const seen: string[] = [];
    const mapped = mapPhiBuilderPluginMetaText(meta, (text) => {
      seen.push(text);
      return `«${text}»`;
    });
    expect(seen).toEqual(expect.arrayContaining(["Your name", "Collapsed width", "Collapsed height", "Hidden"]));
    expect(mapped.fields).toMatchObject([
      { placeholder: "«Your name»" },
      { widthPlaceholder: "«Collapsed width»", heightPlaceholder: "«Collapsed height»" },
      { options: [{ value: 1, label: "«Hidden»" }] },
    ]);
  });
});
