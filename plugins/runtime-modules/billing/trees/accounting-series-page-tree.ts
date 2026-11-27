import { createPhiPresetCmsInstanceIdMap, type PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { PHI_DIALOG_COMMANDS_CONFIG } from "../../../../helpers/cms-dialog";
import { PHI_TEXT_SOURCE_PRESET } from "../../../../helpers/text-source";
import type { PhiCmsContentWidgetNode, PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime, PhiFormDescriptor } from "../../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { createPhiSignalAddress, createPhiSignalSubcontrolAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
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

const PRESET = {
  domain: "page",
  ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
  presetKey: PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries,
} as const;

const WORKFLOWS = ["create", "edit", "replace"] as const;
type Workflow = (typeof WORKFLOWS)[number];

const LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(PRESET, WORKFLOWS.flatMap((workflow) => [`layout${workflow}Body`, `layout${workflow}Footer`]));
const OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(PRESET, WORKFLOWS.map((workflow) => `overlay${workflow}`));
const WIDGET_IDS = createPhiPresetCmsInstanceIdMap(PRESET, [
  "widgetTable",
  ...WORKFLOWS.flatMap((workflow) => [`widget${workflow}Form`, `widget${workflow}Commands`]),
]);

const FORM_ID_BY_WORKFLOW = {
  create: PHI_BILLING_FORM_IDS.seriesCreate,
  edit: PHI_BILLING_FORM_IDS.seriesEdit,
  replace: PHI_BILLING_FORM_IDS.seriesReplace,
} as const satisfies Record<Workflow, string>;

/** The Table action that opens each dialog: Add from the toolbar, Edit and Replace from a row. */
const ACTION_BY_WORKFLOW = { create: "create", edit: "edit", replace: "replace" } as const satisfies Record<Workflow, string>;

function descriptorOf(workflow: Workflow): PhiFormDescriptor {
  const form = PHI_BILLING_RUNTIME_MODULE_FORMS.find((entry) => entry.formId === FORM_ID_BY_WORKFLOW[workflow]);
  if (!form) throw new Error(`The number series Form "${FORM_ID_BY_WORKFLOW[workflow]}" is not registered.`);
  return form.descriptor;
}

/** The Table's announcement of one of its actions, to one receiver that decides by the action's key. */
function tableActionRoute(routeKey: string, receiver: PhiCmsInstanceId) {
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
 * The Accounting page `Number series` of the Billing Module, for Admin and Accountant: the Site's series
 * as one Table -- key, label, template, reset, the next number, kinds, allowed Add-ons, state -- and three
 * dialogs, each a Form of descriptor fields as wide as that Form needs.
 *
 * - Add (toolbar): a new series, with the number its template would give first, as Core answers it.
 * - Edit (row): label, kinds and allowed Add-ons; key, template and reset are shown and stay -- a series
 *   numbers by them for good.
 * - Replace (row): a new series under the same key with a template and reset of its own; Core closes the
 *   one it replaces in the same step.
 *
 * Close is the Provider's row action and asks first. A saved dialog closes itself and the Table reads
 * itself again; what may change of a series is Core's to decide, and Core refuses the rest.
 */
export async function buildPhiBillingAccountingSeriesPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiBillingSeriesPageLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  const nodes = createPhiCmsPresetNodes(page);
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: SYNTHETIC_REGION_ID });
  const pageMeta = {
    title: { msgId: 0, source: "Number series", value: labels.pageTitle },
    description: {
      msgId: 0,
      source: "The series invoices, credit notes and reminders are numbered from, without gaps.",
      value: labels.pageDescription,
    },
  };
  if (!canPhiViewerAccess(runtime.viewer, PHI_BILLING_STAFF_ACCESS)) {
    return {
      page: nodes.page({ pageType: PhiCmsPageType.Standard }),
      pageMeta,
      regions: [scaffold.region],
      layoutNodes: [scaffold.layoutNode],
      overlays: [],
      contentWidgets: [nodes.widget({
        id: WIDGET_IDS.widgetTable,
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

  const tableAddress = createPhiSignalAddress("cms", WIDGET_IDS.widgetTable);
  const source = { providerKey: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.series, resourceKey: PHI_BILLING_SERIES_RESOURCE_KEY };
  const titles: Record<Workflow, string> = {
    create: labels.dialogs.create,
    edit: labels.dialogs.edit,
    replace: labels.dialogs.replace,
  };

  const dialogs = WORKFLOWS.map((workflow, index) => {
    const overlayId = OVERLAY_IDS[`overlay${workflow}`]!;
    const formId = WIDGET_IDS[`widget${workflow}Form`]!;
    const commandsId = WIDGET_IDS[`widget${workflow}Commands`]!;
    const bodyId = LAYOUT_IDS[`layout${workflow}Body`]!;
    const overlayAddress = createPhiSignalAddress("cms", overlayId);
    const formAddress = createPhiSignalAddress("cms", formId);
    const submitAddress = createPhiSignalSubcontrolAddress("cms", commandsId, "submit");
    const opensRecord = workflow !== "create";
    const built = nodes.dialog({
      id: overlayId,
      bodyLayoutNodeId: bodyId,
      sortOrder: index,
      label: `billing series ${workflow} modal`,
      // The dialog takes the width its Form needs.
      body: { form: { descriptor: descriptorOf(workflow) } },
      config: {
        title: titles[workflow],
        // Opened afresh each time, so a dialog cancelled half filled starts from the series again.
        mountPolicy: "remount",
        openActionKey: ACTION_BY_WORKFLOW[workflow],
        signalRoutes: {
          listens: [{
            routeKey: `billing-series-${workflow}-open`,
            capabilityId: "open",
            scope: "page",
            channel: "action",
            action: "activate",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
            receiver: overlayAddress,
          }, {
            routeKey: `billing-series-${workflow}-close`,
            capabilityId: "close",
            scope: "page",
            channel: "dialog",
            action: "close",
            valueType: "none",
            receiver: overlayAddress,
          }, {
            routeKey: `billing-series-${workflow}-busy`,
            capabilityId: "busy",
            scope: "page",
            channel: "busy",
            action: "change",
            valueType: "boolean",
            receiver: overlayAddress,
          }],
        },
      },
      commands: {
        footerLayoutNodeId: LAYOUT_IDS[`layout${workflow}Footer`]!,
        widgetId: commandsId,
        label: titles[workflow],
        config: {
          key: `billing-series-${workflow}-commands`,
          textSource: PHI_TEXT_SOURCE_PRESET,
          ...PHI_DIALOG_COMMANDS_CONFIG,
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "close", value: null }], label: labels.dialogs.cancel, icon: "close" },
            { key: "submit", emits: [{ capabilityId: "submit", value: null }], label: labels.dialogs.save, variant: "primary" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: `billing-series-${workflow}-cancel`,
              capabilityId: "close",
              scope: "page",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: overlayAddress,
            }, {
              routeKey: `billing-series-${workflow}-commands-submit`,
              capabilityId: "submit",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: formAddress,
            }],
            listens: [{
              routeKey: `billing-series-${workflow}-commands-loading`,
              capabilityId: "loading",
              scope: "page",
              channel: "loading",
              action: "change",
              valueType: "boolean",
              receiver: submitAddress,
            }],
          },
        },
      },
    });
    const form: PhiCmsContentWidgetNode = nodes.widget({
      id: formId,
      parentLayoutNodeId: bodyId,
      typeKey: "form",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      label: titles[workflow],
      flags: PhiCmsFlags.NoTranslate,
      config: {
        formId: FORM_ID_BY_WORKFLOW[workflow],
        formConfig: {},
        feedback: { mode: "message" },
        execution: { mode: "handler" },
        // Edit and Replace open on the series the row names, read again through the same Provider.
        source: opensRecord ? source : null,
        ...(opensRecord ? { openActionKey: ACTION_BY_WORKFLOW[workflow] } : {}),
        signalRoutes: {
          emits: [{
            // A dialog that saved is finished, and the series it wrote belongs in the Table at once.
            routeKey: `billing-series-${workflow}-success-close`,
            capabilityId: "submitSuccess",
            scope: "page",
            channel: "dialog",
            action: "close",
            valueType: "none",
            receiver: overlayAddress,
          }, {
            routeKey: `billing-series-${workflow}-success-reload`,
            capabilityId: "submitSuccess",
            scope: "page",
            channel: "reload",
            action: "activate",
            valueType: "none",
            receiver: tableAddress,
          }, {
            routeKey: `billing-series-${workflow}-submitting-busy`,
            capabilityId: "submitting",
            scope: "page",
            channel: "busy",
            action: "change",
            valueType: "boolean",
            receiver: overlayAddress,
          }, {
            routeKey: `billing-series-${workflow}-submit-loading`,
            capabilityId: "submitting",
            scope: "page",
            channel: "loading",
            action: "change",
            valueType: "boolean",
            receiver: submitAddress,
          }],
          listens: [{
            routeKey: `billing-series-${workflow}-submit`,
            capabilityId: "submit",
            scope: "page",
            channel: "submit",
            action: "activate",
            valueType: "none",
            receiver: formAddress,
          }, ...(opensRecord ? [{
            routeKey: `billing-series-${workflow}-record-open`,
            capabilityId: "recordOpen",
            scope: "page" as const,
            channel: "action",
            action: "activate" as const,
            valueType: "json" as const,
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
            receiver: formAddress,
          }] : [])],
        },
      },
    });
    return { ...built, widgets: [form, ...built.widgets], overlayId, formId };
  });

  const kindNames = labels.kinds;
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta,
    overlays: dialogs.map((dialog) => dialog.overlay),
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode, ...dialogs.flatMap((dialog) => dialog.layouts)],
    contentWidgets: [
      nodes.widget({
        id: WIDGET_IDS.widgetTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        // The Module's Label Set, translated already.
        flags: PhiCmsFlags.NoTranslate,
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
              { key: "kinds", fieldKey: "kinds", title: labels.columns.kinds, renderer: "tags", valueMap: kindNames, sizing: { mode: "fill", minWidth: 128 } },
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
            emits: dialogs.flatMap((dialog, index) => [
              tableActionRoute(`billing-series-table-open-${WORKFLOWS[index]}`, dialog.overlayId),
              ...(WORKFLOWS[index] === "create" ? [] : [tableActionRoute(`billing-series-table-record-${WORKFLOWS[index]}`, dialog.formId)]),
            ]),
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
      }),
      ...dialogs.flatMap((dialog) => dialog.widgets),
    ],
  };
}
