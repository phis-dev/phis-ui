import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
} from "../../../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import { createPhiSignalAddress, createPhiSignalSubcontrolAddress } from "../../../../types/signals";
import {
  PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID,
  PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID,
  PHI_EDITOR_TRANSLATION_OVERLAY_ID,
  PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID,
  PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID,
  PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID,
  PHI_EDITOR_TRANSLATIONS_WIDGET_ID,
} from "./editor-translations-shell";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { getPhiEditorTranslationsPageLabels } from "./editor-translations-label-set";
import { getPhiEditorTranslationsWidgetLabels } from "./editor-translations-widget-label-set";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_LOCALIZATION_FORM_IDS } from "../forms";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import {
  PHI_LOCALIZATION_CONTROLLER_INSTANCE_KEY,
  PHI_LOCALIZATION_CONTROLLER_TYPE,
  createPhiLocalizationControllerAddress,
} from "../controller/address";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";

const SYNTHETIC_EDITOR_TRANSLATIONS_REGION_IDS = { regionContent: -561 } as const;
export async function buildPhiDefaultEditorTranslationsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiEditorTranslationsPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
  const widgetLabels = await getPhiEditorTranslationsWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_EDITOR_TRANSLATIONS_REGION_IDS.regionContent,
  });

  const nodes = createPhiCmsPresetNodes(page);
  const overlayAddress = createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_OVERLAY_ID);
  const formAddress = createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID);
  const tableAddress = createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATIONS_WIDGET_ID);
  const saveAddress = createPhiSignalSubcontrolAddress("cms", PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID, "save");
  const sourceLocaleAddress = createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    /*
     * The Localization Controller is mounted by this Page and told here whom it speaks to: it used to
     * name these Widgets itself, which tied it to this one arrangement of them.
     */
    controllerSettings: [{
      type: PHI_LOCALIZATION_CONTROLLER_TYPE,
      instanceKey: PHI_LOCALIZATION_CONTROLLER_INSTANCE_KEY,
      mountScope: "page",
      config: {
        signalRoutes: {
          emits: [
            { routeKey: "editor-translations-controller-dialog-open", capabilityId: "dialogOpen", scope: "page", channel: "dialog", action: "activate", valueType: "none", receiver: overlayAddress },
            { routeKey: "editor-translations-controller-dialog-close", capabilityId: "dialogClose", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: overlayAddress },
            { routeKey: "editor-translations-controller-form-open", capabilityId: "recordOpen", scope: "page", channel: "action", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction, receiver: formAddress },
            { routeKey: "editor-translations-controller-form-submit", capabilityId: "formSubmit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: formAddress },
            { routeKey: "editor-translations-controller-form-reset", capabilityId: "formReset", scope: "page", channel: "reset", action: "activate", valueType: "none", receiver: formAddress },
            { routeKey: "editor-translations-controller-save-submitting", capabilityId: "saveSubmitting", scope: "page", channel: "submitting", action: "change", valueType: "boolean", receiver: saveAddress },
            { routeKey: "editor-translations-controller-table-reload", capabilityId: "reload", scope: "page", channel: "reload", action: "activate", valueType: "none", receiver: tableAddress },
            { routeKey: "editor-translations-controller-source-locale", capabilityId: "sourceLocale", scope: "area", channel: "text", action: "change", valueType: "string", receiver: sourceLocaleAddress },
          ],
        },
      },
    }],
    overlays: [nodes.overlay({
      id: PHI_EDITOR_TRANSLATION_OVERLAY_ID,
      overlayType: "modal",
      bodyLayoutNodeId: PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID,
      footerPresentation: "actions",
      footerLayoutNodeId: PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID,
      sortOrder: 0,
      label: "editor translation edit modal",
      config: {
        title: widgetLabels.actions.edit,
        width: { compact: "calc(100vw - 32px)", medium: 640, wide: 720 },
        mountPolicy: "remount",
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
    })],
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      nodes.layout({
        id: PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "editor translation modal content",
        /*
         * The Body's root Layout is its one padding owner (OVERLAYS.md, "Padding ownership"): the
         * Modal adds none, so the Form stands one `base` in from every edge, as in every other dialog.
         */
        config: {
          anchor: { horizontal: "left", vertical: "top" },
          gap: PHI_SPACE.sm,
          margin: 0,
          padding: PHI_SPACE.base,
        },
      }),
      nodes.layout({
        id: PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "editor translation modal footer",
        config: {},
      }),
    ],
    contentWidgets: [
      nodes.widget({
        id: PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "input",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
        sortOrder: 0,
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
      }),
      nodes.widget({
        id: PHI_EDITOR_TRANSLATIONS_WIDGET_ID,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 10,
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
            pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
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
      nodes.widget({
        id: PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID,
        parentLayoutNodeId: PHI_EDITOR_TRANSLATION_OVERLAY_LAYOUT_ID,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 10,
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
              { routeKey: "editor-translations-form-submit-success", capabilityId: "submitSuccess", scope: "page", channel: "submit", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult, receiver: createPhiLocalizationControllerAddress() },
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
      nodes.widget({
        id: PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID,
        parentLayoutNodeId: PHI_EDITOR_TRANSLATION_OVERLAY_FOOTER_LAYOUT_ID,
        typeKey: "command-toolbar",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "editor translation commands",
        config: {
          key: "editor-translation-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: widgetLabels.actions.cancel },
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", label: widgetLabels.actions.save, variant: "primary" },
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
