import { describe, expect, it } from "vitest";

import { PHI_FORM_FIELD_PROVIDER_KEYS } from "../../components/forms/form-provider-contract";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import {
  PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY,
  PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY,
  PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS,
} from "../../constants/media-library-provider-keys";
import { PHI_USER_MANAGEMENT_FORM_IDS } from "./user-management/forms";
import { collectPhiRuntimeDataProviderKeys } from "./resolver";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./asset/ids";
import {
  PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR,
  PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR,
} from "./asset/form-providers";

// Any registered Form id will do: the scan reads the descriptor the Module set holds under it.
const FORM_ID = PHI_USER_MANAGEMENT_FORM_IDS.edit;

function scan(fieldProviderKey: string, providerKnown = true) {
  const collection = PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection;
  const moduleSet = {
    dataProviderDescriptorsByKey: new Map(providerKnown ? [[collection, { key: collection, kind: "collection" }]] : []),
    widgetDefinitionsByType: new Map(),
    formDefinitionsById: new Map([[FORM_ID, { descriptor: { fields: [{ key: "logo", fieldProviderKey }] } }]]),
  };
  return collectPhiRuntimeDataProviderKeys({
    moduleSet: moduleSet as never,
    trees: [{
      contentWidgets: [{ widgetType: PhiCmsWidgetType.Form, config: { formId: FORM_ID } }],
      layoutNodes: [],
    }] as never,
  });
}

describe("the Media library a media-asset field reads", () => {
  it("is mounted for a Page whose Form has a media-asset field", () => {
    expect(scan(PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY).has(PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection)).toBe(true);
  });

  it("is mounted for a Page whose Form has a media-assets field", () => {
    expect(scan(PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY).has(PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection)).toBe(true);
  });

  it("is not mounted for a Form without one", () => {
    expect(scan(PHI_FORM_FIELD_PROVIDER_KEYS.text).has(PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection)).toBe(false);
  });

  it("is left alone where no Module in the Area serves it", () => {
    expect(scan(PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY, false).size).toBe(0);
  });
});

describe("the media-asset field type", () => {
  it("is the Asset Module's, under the key the Foundation names", () => {
    expect(PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR.key).toBe(PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY);
    expect(PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR.ownerModuleId).toBe(PHI_ASSET_RUNTIME_MODULE_ID);
    expect(PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY).toBe(`${PHI_ASSET_RUNTIME_MODULE_ID}/form-field/media-asset`);
  });
});

describe("the media-assets field type", () => {
  it("is the Asset Module's, under the key the Foundation names, with a list for its value", () => {
    expect(PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR.key).toBe(PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY);
    expect(PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR.ownerModuleId).toBe(PHI_ASSET_RUNTIME_MODULE_ID);
    expect(PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY).toBe(`${PHI_ASSET_RUNTIME_MODULE_ID}/form-field/media-assets`);
    expect(PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR.valueType).toBe("json");
  });
});
