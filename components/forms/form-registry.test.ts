import { describe, expect, it } from "vitest";

import { definePhiRuntimeModuleForm, type PhiRuntimeModuleFormDefinitionInput } from "./form-registry";

const FORM_ID = "@phis/ui/modules/public/forms/defaults-probe";

const required = {
  ownerModuleId: "@phis/ui/modules/public",
  areas: ["public"],
  formId: FORM_ID,
  version: 1,
  flags: 0,
  title: "Defaults probe",
  description: null,
  category: null,
  tags: [],
  descriptor: { schemaVersion: 1, key: FORM_ID, fields: [] },
  submitHandlerKey: null,
} as const satisfies PhiRuntimeModuleFormDefinitionInput;

/**
 * Nearly every Form leaves its confirm and preview handlers, its configs, and its variant empty, so a
 * Module may leave them out; a defined Form still carries every field for whoever reads it.
 */
describe("definePhiRuntimeModuleForm", () => {
  it("fills in the fields a Form leaves out", () => {
    expect(definePhiRuntimeModuleForm({ ...required, tags: [] })).toMatchObject({
      confirmHandlerKey: null,
      previewHandlerKey: null,
      defaultConfig: {},
      variant: "default",
      config: {},
      previewUpstreamPath: null,
    });
  });

  it("keeps the values a Form states, null included", () => {
    const definition = definePhiRuntimeModuleForm({
      ...required,
      tags: [],
      confirmHandlerKey: "probe.confirm",
      previewHandlerKey: "probe.preview",
      defaultConfig: { rows: 2 },
      variant: null,
      config: { rows: 3 },
      previewUpstreamPath: "/api/v1/forms/probe/preview",
    });
    expect(definition).toMatchObject({
      confirmHandlerKey: "probe.confirm",
      previewHandlerKey: "probe.preview",
      defaultConfig: { rows: 2 },
      variant: null,
      config: { rows: 3 },
      previewUpstreamPath: "/api/v1/forms/probe/preview",
    });
  });
});
