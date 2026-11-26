import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// The words stay the source's: English is the Module's source language, so nothing asks Core.
vi.stubGlobal("fetch", async (input: unknown) => {
  throw new Error(`no Core in this test: ${String(input)}`);
});

import { parsePhiFormDescriptor } from "@phis/contracts/forms";

import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS } from "../../../components/forms/form-provider-contract";
import { checkPhiPresetForms } from "../../../module-page-check";
import type { PhiFormFieldDescriptor, PhiFormTextDescriptor } from "../../../types";
import { PHI_CDN_FORM_IDS, PHI_CDN_RUNTIME_MODULE_FORMS, PHI_CDN_UPLOAD_FORM } from "./forms";
import { PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_CDN_ARCH_KEYS, PHI_CDN_OS_KEYS } from "./platform";
import { PHI_CDN_UPLOAD_FIELD_KEYS, isPhiCdnUploadSegmentValid } from "./upload-fields";
import { getPhiCdnUploadWidgetLabels } from "./widgets/upload/labels";

const descriptor = PHI_CDN_UPLOAD_FORM.descriptor;

function field(key: string): PhiFormFieldDescriptor {
  const found = descriptor.fields.find((entry) => entry.key === key);
  if (!found) throw new Error(`no field ${key}`);
  return found;
}

/** What the field's `required` and `pattern` rules answer for a value, as the Form runs them. */
function refusals(key: string, value: string): string[] {
  return (field(key).validation ?? []).flatMap((rule) => {
    const message = (rule.message as PhiFormTextDescriptor & { key: string }).key;
    if (rule.providerKey === PHI_FORM_VALIDATION_PROVIDER_KEYS.required) return value === "" ? [message] : [];
    if (rule.providerKey !== PHI_FORM_VALIDATION_PROVIDER_KEYS.pattern) throw new Error(`unexpected rule ${rule.providerKey}`);
    const config = rule.config as { source: string; flags: string };
    // Ant Design leaves an empty value to `required`, as for every pattern.
    return value !== "" && !new RegExp(config.source, config.flags).test(value) ? [message] : [];
  });
}

const SAMPLES = [
  "", " ", "   ", "tool", " tool ", "Tool_1+2~x-y", "1.0.0", "2.0:beta", "a/b", ".hidden", "~x", ":x", "x y",
  "api", " api ", "apis", "x".repeat(200), "x".repeat(201), "tool.deb", "Tool Setup.exe",
];

describe("the CDN upload Form", () => {
  it("is registered under the CDN Module with no handler, and passes the preset Form checks", () => {
    expect(PHI_CDN_RUNTIME_MODULE_FORMS).toEqual([PHI_CDN_UPLOAD_FORM]);
    expect(PHI_CDN_UPLOAD_FORM.formId).toBe("@phis/ui/modules/cdn/forms/upload");
    expect(PHI_CDN_UPLOAD_FORM.formId).toBe(PHI_CDN_FORM_IDS.upload);
    expect(PHI_CDN_UPLOAD_FORM.submitHandlerKey).toBeNull();
    expect(PHI_CDN_UPLOAD_FORM.areas).toEqual(["admin"]);
    expect(parsePhiFormDescriptor(descriptor)).toEqual(descriptor);
    expect(checkPhiPresetForms(PHI_CDN_RUNTIME_MODULE_FORMS)).toEqual([]);
  });

  it("has a field for every value the widget sends, plus the hidden held file", () => {
    expect(descriptor.fields.map((entry) => entry.key)).toEqual(Object.values(PHI_CDN_UPLOAD_FIELD_KEYS));
    expect(field("heldFile").fieldProviderKey).toBe(PHI_FORM_FIELD_PROVIDER_KEYS.hidden);
    expect(field("fileName").disabledWhen).toEqual({ source: "form", valuePath: "heldFile", operator: "falsy" });
  });

  it("offers the catalogue's names and takes a new one", () => {
    expect(field("name").fieldProviderKey).toBe(PHI_FORM_FIELD_PROVIDER_KEYS.select);
    expect(field("name").config).toEqual({ allowCustom: true });
    expect(field("name").optionsProvider).toEqual({ providerKey: PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.names });
  });

  it("offers every OS and architecture the contract has", () => {
    expect(field("os").options?.map((option) => option.value)).toEqual(PHI_CDN_OS_KEYS.map(([key]) => key));
    expect(field("arch").options?.map((option) => option.value)).toEqual(PHI_CDN_ARCH_KEYS.map(([key]) => key));
  });

  it.each(SAMPLES)("refuses %j exactly where the widget's Upload stays disabled, with one sentence", (value) => {
    for (const [key, kind] of [["name", "name"], ["version", "version"], ["fileName", "fileName"]] as const) {
      const found = refusals(key, value);
      expect(found.length, `${key} ${JSON.stringify(value)}: ${found.join(", ")}`).toBeLessThanOrEqual(1);
      expect(found.length === 0, `${key} ${JSON.stringify(value)}`).toBe(isPhiCdnUploadSegmentValid(value, kind));
    }
  });

  it("says which rule a value breaks", () => {
    expect(refusals("name", "")).toEqual(["required"]);
    expect(refusals("name", "  ")).toEqual(["required"]);
    expect(refusals("name", "a/b")).toEqual(["invalidSegment"]);
    expect(refusals("name", " api ")).toEqual(["reservedName"]);
    expect(refusals("fileName", "api")).toEqual([]);
    expect(refusals("version", ":1")).toEqual(["invalidVersion"]);
  });

  it("names only keys the upload widget's Label Set has, with its source words as fallbacks", async () => {
    const labels = flattenPhiFormLabels(await getPhiCdnUploadWidgetLabels({
      apiBaseUrl: "https://core.test",
      internalToken: "token",
      locale: "en",
    }));
    const texts: PhiFormTextDescriptor[] = descriptor.fields.flatMap((entry) => [
      ...(entry.label ? [entry.label] : []),
      ...(entry.description ? [entry.description] : []),
      ...(entry.options ?? []).map((option) => option.label),
      ...(entry.validation ?? []).flatMap((rule) => (rule.message ? [rule.message] : [])),
    ]);
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text.kind).toBe("label");
      if (text.kind !== "label") continue;
      expect(labels[text.key], text.key).toBe(text.fallback);
    }
  });
});
