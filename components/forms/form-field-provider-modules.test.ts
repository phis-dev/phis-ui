import { describe, expect, it } from "vitest";

import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiFormProviderKey } from "../../types/form-descriptor";
import { readPhiFormFieldProviderModules } from "./form-field-provider-modules";

const FORM_OWNER = "@phis/ui/modules/user-management" as PhiRuntimeModuleId;
const ASSET = "@phis/ui/modules/asset" as PhiRuntimeModuleId;
const MEDIA_KEY = "@phis/ui/modules/asset/form-field/media-asset" as PhiFormProviderKey;
const OWN_KEY = "@phis/ui/modules/user-management/form-field/own" as PhiFormProviderKey;
const SHARED_KEY = "@phis/ui/modules/core/form-field/text" as PhiFormProviderKey;
const owners = new Map<PhiFormProviderKey, PhiRuntimeModuleId>([[MEDIA_KEY, ASSET], [OWN_KEY, FORM_OWNER]]);

function read(active: PhiRuntimeModuleId[], withUiProvider: PhiRuntimeModuleId[]) {
  return readPhiFormFieldProviderModules({
    fields: [
      { key: "name", fieldProviderKey: SHARED_KEY },
      { key: "logo", fieldProviderKey: MEDIA_KEY },
      { key: "cover", fieldProviderKey: MEDIA_KEY },
      { key: "own", fieldProviderKey: OWN_KEY },
    ],
    formOwnerModuleId: FORM_OWNER,
    ownerModuleIdByFieldTypeKey: owners,
    activeModuleIds: new Set(active),
    uiProviderModuleIds: new Set(withUiProvider),
  });
}

describe("the Modules a Form's field types belong to", () => {
  it("mounts the provider of an active Module whose field type the Form uses, once", () => {
    expect(read([FORM_OWNER, ASSET], [FORM_OWNER, ASSET])).toEqual({ providerModuleIds: [ASSET], unavailableFieldKeys: [] });
  });

  it("marks the fields of a Module that is not active, and mounts nothing for it", () => {
    expect(read([FORM_OWNER], [FORM_OWNER])).toEqual({ providerModuleIds: [], unavailableFieldKeys: ["logo", "cover"] });
  });

  it("leaves alone the Form's own Module, the shared registry, and an active Module without a provider", () => {
    expect(read([FORM_OWNER, ASSET], [FORM_OWNER])).toEqual({ providerModuleIds: [], unavailableFieldKeys: [] });
  });
});
