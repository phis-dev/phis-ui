import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import { createPhiFormId } from "../../../types/form-id";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_NEWS_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/news` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`): the id and,
 * where a Module declares one, its source locale. Stated here beside the id and spread into the
 * definition, so a Label Set a tree or a form reads does not import the definition that imports the
 * tree -- and a Module that writes in another language says so once.
 */
export const PHI_NEWS_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_NEWS_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

/**
 * The Module's three Pages. Each key is, with the Module id, the identity of every node on its Page, so
 * they are part of stored placements and do not change.
 */
export const PHI_NEWS_PRESET_KEYS = {
  list: "public-news-page",
  detail: "public-news-entry-page",
  editor: "editor-news-page",
} as const;

export const PHI_NEWS_FORM_IDS = {
  entry: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "news/entry"),
  publication: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "news/publication"),
  curation: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "news/curation"),
  category: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "news/category"),
} as const;
