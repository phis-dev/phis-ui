import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";

export const PHI_EDITOR_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/editor` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`): the id and,
 * where a Module declares one, its source locale. Stated here beside the id and spread into the
 * definition, so a Label Set a tree or a form reads does not import the definition that imports the
 * tree -- and a Module that writes in another language says so once.
 */
export const PHI_EDITOR_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_EDITOR_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

/**
 * The Publisher's queue (phis-server CONTENT.md, Submission): what waits for somebody to put it live. A
 * Page of the Editor Area itself rather than of a Module, because every content Module's submissions land
 * in it -- Widget content, News, and whatever content type comes next.
 */
export const PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY = createPhiSharedRuntimeDataProviderKey("tables", "editor-releases");

/** The one resource the queue's Provider answers. */
export const PHI_EDITOR_RELEASES_RESOURCE_KEY = "items";

export const PHI_EDITOR_RELEASES_PAGE_PRESET_KEY = "editor-releases-page";

export const PHI_EDITOR_RELEASES_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_RELEASES_PAGE_PRESET_KEY,
  nodeKey: "widgetReleases",
});
