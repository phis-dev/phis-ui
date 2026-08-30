import { PHI_EDITOR_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/editor/ids";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { createPhiSignalAddress, createPhiSignalSubcontrolAddress } from "../../../types/signals";
import {
  PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID,
  PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID,
  PHI_EDITOR_TRANSLATION_OVERLAY_ID,
  PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID,
  PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID,
  PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID,
  PHI_EDITOR_TRANSLATIONS_WIDGET_ID,
} from "./editor-shell";
import { getPhiEditorTranslationsPageLabels } from "./editor-translations-label-set";
import { getPhiEditorTranslationsWidgetLabels } from "../../widgets/label-sets/editor-translations";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/localization/ids";
import { PHI_LOCALIZATION_FORM_IDS } from "../../../plugins/runtime-modules/localization/forms";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { createPhiLocalizationControllerAddress } from "../../../plugins/runtime-modules/localization/controller/address";

const SYNTHETIC_EDITOR_TRANSLATIONS_REGION_IDS = { regionContent: -561 } as const;
const SYNTHETIC_EDITOR_TRANSLATIONS_CONTENT_LAYOUT_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-translations-page",
  nodeKey: "layoutContent",
});
export async function buildPhiDefaultEditorTranslationsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiEditorTranslationsPageLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const widgetLabels = await getPhiEditorTranslationsWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [{
      id: PHI_EDITOR_TRANSLATION_OVERLAY_ID,
      overlayType: "modal",
      headerLayoutNodeId: null,
      bodyLayoutNodeId: PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID,
      footerPresentation: "actions",
      footerLayoutNodeId: PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 0,
      label: "editor translation edit modal",
      config: {
        title: widgetLabels.actions.edit,
        width: { compact: "calc(100vw - 32px)", medium: 640, wide: 720 },
        mountPolicy: "on-open",
        closeMode: "request",
        signalRoutes: {
          emits: [
            { routeKey: "editor-translation-overlay-state", capabilityId: "openChange", scope: "page", channel: "state", action: "change", valueType: "boolean", receiver: createPhiLocalizationControllerAddress() },
            { routeKey: "editor-translation-overlay-close-request", capabilityId: "closeRequest", scope: "page", channel: "dialog", action: "close", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest, receiver: createPhiLocalizationControllerAddress() },
          ],
          listens: [
            { routeKey: "editor-translation-overlay-open", capabilityId: "open", scope: "page", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_OVERLAY_ID) },
            { routeKey: "editor-translation-overlay-close", capabilityId: "close", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_OVERLAY_ID) },
          ],
        },
      },
    }],
    regions: [
      {
        id: SYNTHETIC_EDITOR_TRANSLATIONS_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_EDITOR_TRANSLATIONS_CONTENT_LAYOUT_ID,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          maxSize: { width: 1600 },
          margin: "0 auto",
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        id: SYNTHETIC_EDITOR_TRANSLATIONS_CONTENT_LAYOUT_ID,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.contentLabel,
        config: {
          anchor: { horizontal: "left", vertical: "top" },
          gap: PHI_SPACE.base,
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          padding: PHI_SPACE.base,
        },
      }),
      buildPhiCmsLayoutNode({
        id: PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor translation modal content",
        config: { anchor: { horizontal: "left", vertical: "top" }, gap: PHI_SPACE.base, width: "100%", padding: 0, border: false },
      }),
      buildPhiCmsLayoutNode({
        id: PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor translation modal footer",
        config: {},
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        id: PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_EDITOR_TRANSLATIONS_CONTENT_LAYOUT_ID,
        typeKey: "input",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor source locale",
        config: {
          text: "",
          placeholder: widgetLabels.sourceLocaleLabel,
          readOnly: true,
          allowClear: false,
          controlSize: "small",
          signalRoutes: {
            listens: [{
              routeKey: "editor-translations-source-locale",
              capabilityId: "change",
              scope: "area",
              channel: "text",
              action: "change",
              valueType: "string",
              receiver: createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID),
            }],
          },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        id: PHI_EDITOR_TRANSLATIONS_WIDGET_ID,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_EDITOR_TRANSLATIONS_CONTENT_LAYOUT_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 10,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.widgetLabel,
        config: {
          source: {
            providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "editorTranslations",
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "source", fieldKey: "source", title: widgetLabels.columns.source, sizing: { mode: "content", minWidth: 320, maxWidth: 480 } },
              { key: "sourceContext", fieldKey: "sourceContext", title: widgetLabels.columns.context, renderer: "code", sizing: { mode: "content", minWidth: 144 } },
              {
                key: "status",
                fieldKey: "status",
                title: widgetLabels.columns.status,
                renderer: "badge",
                valueMap: { missing: widgetLabels.rowStatus.missing, translated: widgetLabels.rowStatus.translated },
                sizing: { mode: "content", minWidth: 104 },
              },
              { key: "translation", fieldKey: "translation", title: widgetLabels.columns.translation, sizing: { mode: "fill", minWidth: 480 } },
              { key: "createdAt", fieldKey: "createdAt", title: widgetLabels.columns.created, renderer: "datetime", sizing: { mode: "content", minWidth: 168 } },
              { key: "updatedAt", fieldKey: "updatedAt", title: widgetLabels.columns.updated, renderer: "datetime", sizing: { mode: "content", minWidth: 168 } },
            ],
            emptyState: { title: widgetLabels.empty.title, description: widgetLabels.empty.text },
            controlSize: "small",
          },
          features: {
            search: { enabled: true, placeholder: widgetLabels.searchPlaceholder },
            filters: [
              {
                key: "locale",
                type: "select",
                label: widgetLabels.targetLocaleLabel,
                optionsProvider: { providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.siteLocales },
              },
              {
                key: "context",
                type: "select",
                label: widgetLabels.contextLabel,
                optionsProvider: { providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.translationContexts },
                defaultValue: "all",
              },
              {
                key: "status",
                type: "select",
                label: widgetLabels.statusLabel,
                options: [
                  { value: "all", label: widgetLabels.statuses.all },
                  { value: "missing", label: widgetLabels.statuses.missing },
                  { value: "translated", label: widgetLabels.statuses.translated },
                ],
                defaultValue: "all",
              },
            ],
            pagination: { enabled: true, pageSize: 25, pageSizeOptions: [25, 50, 100], showSizeChanger: true },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reset: true, reload: true },
            actions: {
              row: [
                {
                  key: "edit",
                  label: widgetLabels.actions.edit,
                  icon: "edit",
                  display: "icon",
                  execution: "signal",
                  disabledWhen: { source: "row", valuePath: "protected", operator: "truthy" },
                },
                {
                  key: "delete",
                  label: widgetLabels.actions.delete,
                  icon: "antd:delete",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  confirm: {
                    title: widgetLabels.delete.title,
                    description: widgetLabels.delete.description,
                    okText: widgetLabels.actions.delete,
                  },
                },
              ],
            },
          },
          initialQuery: { filters: { context: "", status: "all" } },
          signalRoutes: {
            emits: [
              {
                routeKey: "editor-translations-table-action",
                capabilityId: "actionActivate",
                scope: "page",
                channel: "action",
                action: "activate",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
                receiver: createPhiLocalizationControllerAddress(),
              },
              {
                routeKey: "editor-translations-table-query",
                capabilityId: "queryChange",
                scope: "page",
                channel: "query",
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableQuery,
                receiver: createPhiLocalizationControllerAddress(),
              },
            ],
            listens: [
              {
                routeKey: "editor-translations-table-filters",
                capabilityId: "filtersChange",
                scope: "page",
                channel: "filters",
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
                receiver: createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATIONS_WIDGET_ID),
              },
              {
                routeKey: "editor-translations-table-reload",
                capabilityId: "reload",
                scope: "page",
                channel: "reload",
                action: "activate",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATIONS_WIDGET_ID),
              },
            ],
          },
        },
      }),
      buildPhiCmsWidgetNode({
        id: PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 10,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor translation form",
        config: {
          formId: PHI_LOCALIZATION_FORM_IDS.editorTranslation,
          source: {
            providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "editorTranslations",
          },
          openActionKey: "edit",
          signalRoutes: {
            emits: [
              { routeKey: "editor-translations-form-submit-success", capabilityId: "submitSuccess", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiLocalizationControllerAddress() },
              { routeKey: "editor-translations-form-submitting", capabilityId: "submitting", scope: "page", channel: "submitting", action: "change", valueType: "boolean", receiver: createPhiLocalizationControllerAddress() },
            ],
            listens: [
              { routeKey: "editor-translations-form-open", capabilityId: "recordOpen", scope: "page", channel: "action", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction, receiver: createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID) },
              { routeKey: "editor-translations-form-submit", capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID) },
              { routeKey: "editor-translations-form-reset", capabilityId: "reset", scope: "page", channel: "reset", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID) },
            ],
          },
        },
      }),
      buildPhiCmsWidgetNode({
        id: PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID,
        typeKey: "command-toolbar",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor translation commands",
        config: {
          key: "editor-translation-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: widgetLabels.actions.cancel },
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", label: widgetLabels.actions.save, buttonType: "primary" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: "editor-translation-command",
              capabilityId: "command",
              scope: "page",
              channel: "command",
              action: "activate",
              valueType: "string",
              receiver: createPhiLocalizationControllerAddress(),
            }],
            listens: [{
              routeKey: "editor-translation-save-loading",
              capabilityId: "loading",
              scope: "page",
              channel: "submitting",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalSubcontrolAddress("cms", PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID, "save"),
            }],
          },
        },
      }),
    ],
  };
}
