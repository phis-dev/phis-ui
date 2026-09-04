import { PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION } from "../../../components/media/asset-controller-definition";
import { PHI_ASSET_CONTROLLER_TYPE } from "../../../components/media/asset-controller-address";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_CMS_AREA_KEYS } from "../../../constants/cms-areas";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import {
  PHI_ASSET_FOLDER_FORM_HANDLER_PROVIDER_DESCRIPTOR,
  PHI_ASSET_METADATA_FORM_HANDLER_PROVIDER_DESCRIPTOR,
} from "../../../components/media/asset-metadata-form";
import { PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR } from "../../../components/media/asset-form-field-providers";
import { PHI_MEDIA_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTOR } from "../../../components/media/media-settings-forms";

export const PHI_ASSET_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_ASSET_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: PHI_CMS_AREA_KEYS,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_ASSET_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION),
  title: "Assets",
  description: "Media, upload, asset picking, and asset-backed data orchestration.",
  category: "media",
  iconFamily: "media",
  controllerMountPolicy: "area",
  dataProviders: PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
  formProviders: {
    fieldTypes: [PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR],
    handlers: [
      PHI_ASSET_METADATA_FORM_HANDLER_PROVIDER_DESCRIPTOR,
      PHI_ASSET_FOLDER_FORM_HANDLER_PROVIDER_DESCRIPTOR,
      PHI_MEDIA_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTOR,
    ],
  },
} satisfies PhiRuntimeModuleDefinition;
