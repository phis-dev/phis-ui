import { describe, expect, it } from "vitest";

import {
  collectPhiConfigTexts,
  readPhiConfigFieldTextRegister,
  readPhiConfigTextRegisterByName,
  writePhiConfigTexts,
} from "./config-text-fields";
import type { PhiCmsConfigField } from "../types/cms-plugins";

describe("which config fields are text", () => {
  it("reads a label, a title or a placeholder as text, and a description as a sentence", () => {
    expect(readPhiConfigTextRegisterByName("label")).toBe("label");
    expect(readPhiConfigTextRegisterByName("title")).toBe("label");
    expect(readPhiConfigTextRegisterByName("placeholder")).toBe("label");
    expect(readPhiConfigTextRegisterByName("checkedLabel")).toBe("label");
    expect(readPhiConfigTextRegisterByName("subTitle")).toBe("label");
    expect(readPhiConfigTextRegisterByName("startPlaceholder")).toBe("label");
    expect(readPhiConfigTextRegisterByName("description")).toBe("message");
    expect(readPhiConfigTextRegisterByName("asideDescription")).toBe("message");
  });

  it("never reads what a Widget works with as text", () => {
    for (const key of ["key", "value", "format", "timeZone", "themeKey", "fieldKey", "separator", "text", "Label"]) {
      expect(readPhiConfigTextRegisterByName(key)).toBeNull();
    }
  });

  it("lets a field say otherwise, and translates nothing but a string", () => {
    expect(readPhiConfigFieldTextRegister({ key: "reason", type: "string", label: "R", text: "message" })).toBe("message");
    expect(readPhiConfigFieldTextRegister({ key: "label", type: "string", label: "L", text: false })).toBeNull();
    expect(readPhiConfigFieldTextRegister({ key: "label", type: "url", label: "L" })).toBeNull();
  });
});

describe("the texts a config holds", () => {
  const fields: PhiCmsConfigField[] = [
    { key: "label", type: "string", label: "Label" },
    { key: "value", type: "string", label: "Value" },
    {
      key: "options",
      type: "collection",
      label: "Options",
      itemKeyField: "value",
      itemFields: [
        { key: "value", type: "string", label: "Value" },
        { key: "label", type: "string", label: "Label" },
        { key: "description", type: "string", label: "Description" },
      ],
    },
  ];
  const config = {
    label: "Area",
    value: "public",
    options: [
      { value: "public", label: "Public" },
      { value: "accounting", label: "Accounting", description: "Books and orders." },
    ],
  };

  it("finds the label and each option's words, and not the values", () => {
    expect(collectPhiConfigTexts(fields, config)).toEqual([
      { path: ["label"], register: "label", text: "Area" },
      { path: ["options", 0, "label"], register: "label", text: "Public" },
      { path: ["options", 1, "label"], register: "label", text: "Accounting" },
      { path: ["options", 1, "description"], register: "message", text: "Books and orders." },
    ]);
  });

  it("writes the answers back without touching the config it was given", () => {
    const written = writePhiConfigTexts(config, [
      { path: ["label"], text: "Bereich" },
      { path: ["options", 1, "label"], text: "Buchhaltung" },
      { path: ["options", 1, "description"], text: "" },
    ]);
    expect(written).toEqual({
      label: "Bereich",
      value: "public",
      options: [
        { value: "public", label: "Public" },
        { value: "accounting", label: "Buchhaltung", description: "Books and orders." },
      ],
    });
    expect(config.options[1]!.label).toBe("Accounting");
    expect(config.label).toBe("Area");
  });
});
