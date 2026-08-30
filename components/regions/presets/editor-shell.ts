import { PHI_EDITOR_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/editor/ids";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";

export const PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-translations-page",
  nodeKey: "widgetTranslationForm",
});

export const PHI_EDITOR_TRANSLATIONS_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-translations-page",
  nodeKey: "widgetTranslations",
});

export const PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-translations-page",
  nodeKey: "widgetSourceLocale",
});

export const PHI_EDITOR_TRANSLATION_OVERLAY_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-translations-page",
  nodeKey: "overlayTranslationEdit",
});

export const PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-translations-page",
  nodeKey: "layoutTranslationEdit",
});

export const PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-translations-page",
  nodeKey: "layoutTranslationEditFooter",
});

export const PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-translations-page",
  nodeKey: "widgetTranslationCommands",
});
