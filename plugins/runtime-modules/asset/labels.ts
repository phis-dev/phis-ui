import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_ASSET_MODULE_DEFAULT_LABELS,
  type PhiAssetModuleLabels,
} from "../../../components/media/media-widget-labels";
import { PHI_ASSET_RUNTIME_MODULE_IDENTITY } from "./ids";

/**
 * What the Asset Module's own surfaces say: the Inspector's sections (titles, variants, the public URL and
 * the rest of an Asset's facts) and the metadata editor (the metadata form, the focal rect and the folder
 * create form).
 *
 * The Foundation owns the types and the English defaults (`components/media/media-widget-labels.ts`)
 * because Foundation components draw them; the set that translates them is the Module's. What Core's
 * collection view also reads -- the toolbar's words and the four flag words -- is the Foundation's
 * `widget:media`, which this Module reads like any other reader.
 */
const PHI_ASSET_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_ASSET_RUNTIME_MODULE_IDENTITY, {
  key: "widget:asset",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    inspector_inspector_title: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.inspectorTitle,
    inspector_preview_title: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.previewTitle,
    inspector_metadata_title: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.metadataTitle,
    inspector_variants_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.variantsLabel,
    inspector_original_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.originalVariantLabel,
    inspector_thumbnail_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.thumbnailVariantLabel,
    inspector_preview_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.previewVariantLabel,
    inspector_banner_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.bannerVariantLabel,
    inspector_header_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.headerVariantLabel,
    inspector_card_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.cardVariantLabel,
    inspector_hero_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.heroVariantLabel,
    inspector_avatar_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.avatarVariantLabel,
    inspector_logo_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.logoVariantLabel,
    inspector_landscape_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.landscapeVariantLabel,
    inspector_portrait_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.portraitVariantLabel,
    inspector_icon_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.iconVariantLabel,
    inspector_share_variant_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.shareVariantLabel,
    inspector_public_url_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.publicUrlLabel,
    inspector_content_type_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.contentTypeLabel,
    inspector_original_name_label: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.originalNameLabel,
    inspector_copy_label_template: PHI_ASSET_MODULE_DEFAULT_LABELS.inspector.copyLabelTemplate,
    editor_title_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.titleLabel,
    editor_alt_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.altLabel,
    editor_folder_path_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.folderPathLabel,
    editor_folder_path_placeholder: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.folderPathPlaceholder,
    editor_create_folder_title: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.createFolderTitle,
    editor_folder_name_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.folderNameLabel,
    editor_folder_name_placeholder: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.folderNamePlaceholder,
    editor_folder_name_required: definePhiMessageLabel(PHI_ASSET_MODULE_DEFAULT_LABELS.editor.folderNameRequired),
    editor_parent_folder_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.parentFolderLabel,
    editor_top_level_folder_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.topLevelFolderLabel,
    editor_flags_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.flagsLabel,
    editor_focal_rect_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.focalRectLabel,
    editor_focal_rect_button_label: PHI_ASSET_MODULE_DEFAULT_LABELS.editor.focalRectButtonLabel,
  },
});

export async function getPhiAssetModuleLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiAssetModuleLabels> {
  const labels = await getPhiLabelSet(options, PHI_ASSET_LABEL_SET);
  return {
    inspector: {
      inspectorTitle: labels.inspector_inspector_title,
      previewTitle: labels.inspector_preview_title,
      metadataTitle: labels.inspector_metadata_title,
      variantsLabel: labels.inspector_variants_label,
      originalVariantLabel: labels.inspector_original_variant_label,
      thumbnailVariantLabel: labels.inspector_thumbnail_variant_label,
      previewVariantLabel: labels.inspector_preview_variant_label,
      bannerVariantLabel: labels.inspector_banner_variant_label,
      headerVariantLabel: labels.inspector_header_variant_label,
      cardVariantLabel: labels.inspector_card_variant_label,
      heroVariantLabel: labels.inspector_hero_variant_label,
      avatarVariantLabel: labels.inspector_avatar_variant_label,
      logoVariantLabel: labels.inspector_logo_variant_label,
      landscapeVariantLabel: labels.inspector_landscape_variant_label,
      portraitVariantLabel: labels.inspector_portrait_variant_label,
      iconVariantLabel: labels.inspector_icon_variant_label,
      shareVariantLabel: labels.inspector_share_variant_label,
      publicUrlLabel: labels.inspector_public_url_label,
      contentTypeLabel: labels.inspector_content_type_label,
      originalNameLabel: labels.inspector_original_name_label,
      copyLabelTemplate: labels.inspector_copy_label_template,
    },
    editor: {
      titleLabel: labels.editor_title_label,
      altLabel: labels.editor_alt_label,
      folderPathLabel: labels.editor_folder_path_label,
      folderPathPlaceholder: labels.editor_folder_path_placeholder,
      createFolderTitle: labels.editor_create_folder_title,
      folderNameLabel: labels.editor_folder_name_label,
      folderNamePlaceholder: labels.editor_folder_name_placeholder,
      folderNameRequired: labels.editor_folder_name_required,
      parentFolderLabel: labels.editor_parent_folder_label,
      topLevelFolderLabel: labels.editor_top_level_folder_label,
      flagsLabel: labels.editor_flags_label,
      focalRectLabel: labels.editor_focal_rect_label,
      focalRectButtonLabel: labels.editor_focal_rect_button_label,
    },
  };
}
