import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { resolvePhiDialogFormGeometry } from "../../../../helpers/cms-dialog";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime, PhiFormDescriptor } from "../../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import {
  buildPhiSettingsPageShellTree,
  type PhiSettingsPageShellOverlay,
} from "../../../../components/regions/presets/phi-settings-page-shell-tree";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";
import { canPhiViewerAccess } from "../../../../types/access";
import {
  PHI_BILLING_FORM_IDS,
  PHI_BILLING_PAGE_PRESET_KEYS,
  PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_BILLING_RUNTIME_MODULE_ID,
  PHI_BILLING_SERIES_RESOURCE_KEY,
} from "../ids";
import { PHI_BILLING_RUNTIME_MODULE_FORMS } from "../forms";
import { PHI_BILLING_STAFF_ACCESS } from "../access";
import { getPhiBillingSeriesPageLabels } from "../labels";

const SYNTHETIC_REGION_ID = -587;

const PRESET_KEY = PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries;

/*
 * The shell derives Overlay, Layout and Widget instance ids from the node keys; the same derivation here
 * yields the addresses the Table and the dialogs speak to. A dialog's Form is `<nodeKey>Form`.
 */
const IDS = createPhiPresetCmsInstanceIdMap({ domain: "page", ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID, presetKey: PRESET_KEY }, [
  "widgetSeriesTable",
  "overlaySeriesCreate",
  "overlaySeriesEdit",
  "overlaySeriesEditForm",
  "overlaySeriesReplace",
  "overlaySeriesReplaceForm",
]);

function descriptorOf(formId: string): PhiFormDescriptor {
  const form = PHI_BILLING_RUNTIME_MODULE_FORMS.find((entry) => entry.formId === formId);
  if (!form) throw new Error(`The number series Form "${formId}" is not registered.`);
  return form.descriptor;
}

function tableActionRoute(routeKey: string, receiver: string) {
  return {
    routeKey,
    capabilityId: "actionActivate",
    scope: "page" as const,
    channel: "action",
    action: "activate" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
    receiver: createPhiSignalAddress("cms", receiver),
  };
}

/**
 * The Accounting Settings page `Number series` of the Billing Module, for Admin and Accountant, on the
 * shared Settings page shell (SETTINGS.md section 4): the Site's series as one Table -- key, label,
 * template, reset, the next number, kinds, allowed Add-ons, state -- and three dialogs, each a Form of
 * descriptor fields as wide as that Form needs.
 *
 * - Add (toolbar): a new series, with the number its template would give first, as Core answers it.
 * - Edit (row): label, kinds and allowed Add-ons; key, template and reset are shown and stay -- a series
 *   numbers by them for good.
 * - Replace (row): a new series under the same key with a template and reset of its own; Core closes the
 *   one it replaces in the same step.
 *
 * Close is the Provider's row action and asks first. A saved dialog closes itself (the shell's) and the
 * Table reads itself again; what may change of a series is Core's to decide, and Core refuses the rest.
 */
export async function buildPhiBillingAccountingSeriesPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiBillingSeriesPageLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  const pageMeta = {
    title: { msgId: 0, source: "Number series", value: labels.pageTitle },
    description: {
      msgId: 0,
      source: "The series invoices, credit notes and reminders are numbered from, without gaps.",
      value: labels.pageDescription,
    },
  };
  if (!canPhiViewerAccess(runtime.viewer, PHI_BILLING_STAFF_ACCESS)) {
    const nodes = createPhiCmsPresetNodes(page);
    const scaffold = buildPhiBasePageContentScaffold({ page, regionId: SYNTHETIC_REGION_ID });
    return {
      page: nodes.page({ pageType: PhiCmsPageType.Standard }),
      pageMeta,
      regions: [scaffold.region],
      layoutNodes: [scaffold.layoutNode],
      overlays: [],
      contentWidgets: [nodes.widget({
        id: IDS.widgetSeriesTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "simple-text",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.pageTitle,
        flags: PhiCmsFlags.NoTranslate,
        config: { text: labels.notStaff, tone: "secondary" },
      })],
    };
  }

  const tableAddress = createPhiSignalAddress("cms", IDS.widgetSeriesTable);
  const source = { providerKey: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.series, resourceKey: PHI_BILLING_SERIES_RESOURCE_KEY };
  // The Table's reload listener takes no value, and a listener matches on the value type too.
  const reloadTable = (routeKey: string) => ({
    routeKey,
    capabilityId: "submitSuccess",
    scope: "page" as const,
    channel: "reload",
    action: "activate" as const,
    valueType: "none" as const,
    receiver: tableAddress,
  });
  const dialog = (
    nodeKey: string,
    title: string,
    openActionKey: string,
    formId: (typeof PHI_BILLING_FORM_IDS)[keyof typeof PHI_BILLING_FORM_IDS],
    formAddress: string | null,
  ): PhiSettingsPageShellOverlay => ({
    nodeKey,
    title,
    openActionKey,
    formId,
    // The dialog takes the width its Form needs.
    size: resolvePhiDialogFormGeometry(descriptorOf(formId)).size,
    label: title,
    submitLabel: labels.dialogs.save,
    cancelLabel: labels.dialogs.cancel,
    configOverrides: formAddress === null
      ? { signalRoutes: { emits: [reloadTable(`${nodeKey}-success`)] } }
      : {
        // Edit and Replace open on the series the row names, read again through the same Provider.
        source,
        openActionKey,
        signalRoutes: {
          emits: [reloadTable(`${nodeKey}-success`)],
          listens: [{
            routeKey: `${nodeKey}-record-open`,
            capabilityId: "recordOpen",
            scope: "page",
            channel: "action",
            action: "activate",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
            receiver: createPhiSignalAddress("cms", formAddress),
          }],
        },
      },
  });

  const tree = buildPhiSettingsPageShellTree({
    page,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    presetKey: PRESET_KEY,
    regionId: SYNTHETIC_REGION_ID,
    label: labels.pageTitle,
    panels: [{
      nodeKey: "panelSeries",
      title: labels.tableLabel,
      description: labels.pageDescription,
      sections: [{
        nodeKey: "widgetSeriesTable",
        typeKey: "table",
        label: labels.tableLabel,
        config: {
          source,
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "key", fieldKey: "key", title: labels.columns.key, renderer: "code", sizing: { mode: "content" }, sticky: "left" },
              { key: "label", fieldKey: "label", title: labels.columns.label, sizing: { mode: "fill", minWidth: 160 } },
              { key: "template", fieldKey: "template", title: labels.columns.template, renderer: "code", sizing: { mode: "content" } },
              { key: "reset", fieldKey: "reset", title: labels.columns.reset, valueMap: labels.resets, sizing: { mode: "content" } },
              { key: "next", fieldKey: "next", title: labels.columns.next, renderer: "code", sizing: { mode: "content" } },
              { key: "kinds", fieldKey: "kinds", title: labels.columns.kinds, renderer: "tags", valueMap: labels.kinds, sizing: { mode: "fill", minWidth: 128 } },
              { key: "sources", fieldKey: "sources", title: labels.columns.sources, renderer: "tags", sizing: { mode: "fill", minWidth: 128 } },
              {
                key: "state",
                fieldKey: "state",
                title: labels.columns.state,
                renderer: "badge",
                valueMap: labels.states,
                tagColorMap: { open: "default", used: "success", closed: "warning" },
                sizing: { mode: "content" },
              },
            ],
            emptyState: { title: labels.emptyTitle, description: labels.emptyText },
            footer: { template: labels.footer, values: [{ key: "series", value: { source: "core", fieldKey: "totalRows" } }] },
            controlSize: "small",
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reload: true },
            actions: {
              toolbar: [
                { key: "create", label: labels.actions.add, icon: "plus", display: "icon", mode: "primary", execution: "signal" },
              ],
              row: [
                {
                  key: "edit",
                  label: labels.actions.edit,
                  icon: "edit",
                  display: "icon",
                  execution: "signal",
                  disabledWhen: { source: "row", valuePath: "closed", operator: "truthy" },
                },
                {
                  key: "replace",
                  label: labels.actions.replace,
                  icon: "redo",
                  display: "icon",
                  execution: "signal",
                  disabledWhen: { source: "row", valuePath: "closed", operator: "truthy" },
                },
                {
                  key: "close",
                  label: labels.actions.close,
                  icon: "stop",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  confirm: {
                    title: labels.close.title,
                    description: labels.close.text,
                    okText: labels.close.ok,
                    cancelText: labels.confirmCancel,
                  },
                },
              ],
            },
          },
          signalRoutes: {
            // One announcement, every dialog and Form listening; each decides by the action's key.
            emits: [
              tableActionRoute("billing-series-table-open-create", IDS.overlaySeriesCreate),
              tableActionRoute("billing-series-table-open-edit", IDS.overlaySeriesEdit),
              tableActionRoute("billing-series-table-record-edit", IDS.overlaySeriesEditForm),
              tableActionRoute("billing-series-table-open-replace", IDS.overlaySeriesReplace),
              tableActionRoute("billing-series-table-record-replace", IDS.overlaySeriesReplaceForm),
            ],
            listens: [{
              routeKey: "billing-series-table-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: tableAddress,
            }],
          },
        },
      }],
    }],
    overlays: [
      dialog("overlaySeriesCreate", labels.dialogs.create, "create", PHI_BILLING_FORM_IDS.seriesCreate, null),
      dialog("overlaySeriesEdit", labels.dialogs.edit, "edit", PHI_BILLING_FORM_IDS.seriesEdit, IDS.overlaySeriesEditForm),
      dialog("overlaySeriesReplace", labels.dialogs.replace, "replace", PHI_BILLING_FORM_IDS.seriesReplace, IDS.overlaySeriesReplaceForm),
    ],
  });

  return { ...tree, pageMeta };
}
