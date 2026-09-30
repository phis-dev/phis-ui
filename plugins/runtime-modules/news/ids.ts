import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_NEWS_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/news` as const satisfies PhiRuntimeModuleId;

/**
 * What this Module answers, and what a Widget binds to by name.
 *
 * The table is the Site's own entries, read through the editor endpoint, so every surface that shows them
 * -- the editor page, and any Page a Site composes in the Builder -- reads one thing. The options key is
 * the offer a tag field picks from, which is the set of tags the Site already uses rather than a
 * vocabulary anybody keeps.
 */
export const PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "news"),
  tags: createPhiSharedRuntimeDataProviderKey("options", "news-tags"),
} as const;

/** The one resource the table provider answers. */
export const PHI_NEWS_TABLE_RESOURCE_KEY = "entries";

/** The preset key of the Page this Module contributes to the Editor Area, and the Table on it. */
export const PHI_EDITOR_NEWS_PAGE_PRESET_KEY = "editor-news-page";

export const PHI_EDITOR_NEWS_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "widgetNews",
});

/**
 * The nodes of that Page: the Table, and the three dialogs one writes in.
 *
 * Three, because writing a new entry and correcting an existing one are two dialogs and not one. A Form
 * bound to a record waits for the row it was opened with and shows its skeleton until it arrives; a new
 * entry has no row, so the same Form would wait for ever. The publication is the third act, with its own
 * Form and its own authority. The Controller tells them apart by which of these addresses a signal came
 * from, not by a word in the signal's value: an address cannot drift out of step with itself.
 */
export const PHI_EDITOR_NEWS_CREATE_OVERLAY_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "overlayCreate",
});

export const PHI_EDITOR_NEWS_CREATE_OVERLAY_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "layoutCreate",
});

export const PHI_EDITOR_NEWS_CREATE_OVERLAY_FOOTER_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "layoutCreateFooter",
});

export const PHI_EDITOR_NEWS_CREATE_FORM_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "widgetCreateForm",
});

export const PHI_EDITOR_NEWS_CREATE_COMMANDS_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "widgetCreateCommands",
});

export const PHI_EDITOR_NEWS_ENTRY_OVERLAY_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "overlayEntry",
});

export const PHI_EDITOR_NEWS_ENTRY_OVERLAY_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "layoutEntry",
});

export const PHI_EDITOR_NEWS_ENTRY_OVERLAY_FOOTER_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "layoutEntryFooter",
});

export const PHI_EDITOR_NEWS_ENTRY_FORM_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "widgetEntryForm",
});

export const PHI_EDITOR_NEWS_ENTRY_COMMANDS_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "widgetEntryCommands",
});

export const PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "overlayPublication",
});

export const PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "layoutPublication",
});

export const PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_FOOTER_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "layoutPublicationFooter",
});

export const PHI_EDITOR_NEWS_PUBLICATION_FORM_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "widgetPublicationForm",
});

export const PHI_EDITOR_NEWS_PUBLICATION_COMMANDS_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "widgetPublicationCommands",
});
