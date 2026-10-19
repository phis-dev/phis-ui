import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PhiGroupMembershipFlags } from "../../../../constants/site-groups";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import {
  createPhiGroupsControllerAddress,
  PHI_GROUPS_CONTROLLER_INSTANCE_KEY,
  PHI_GROUPS_CONTROLLER_TYPE,
} from "../controller/address";
import { PHI_GROUPS_PAGE_LAYOUT_IDS, PHI_GROUPS_PAGE_OVERLAY_IDS, PHI_GROUPS_PAGE_WIDGET_IDS } from "../addresses";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { getPhiGroupFormLabels } from "../labels";
import { PHI_GROUPS_FORM_IDS } from "../forms";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";

const SYNTHETIC_ADMIN_GROUPS_REGION_IDS = {
  regionContent: -451,
} as const;

/**
 * Site groups and their members.
 *
 * Two tables, because the two rows carry different authority: a group is Site administration, a
 * membership is what a group's own Manager administers. Selecting a group is what fills the second
 * one -- the Controller translates the selection into a filter.
 *
 * Each table adds through the `+` in its toolbar, like every other Table: it opens a dialog holding the
 * Form, whose footer cancels or submits it directly. The Controller only hears the success, reloads the
 * lists and closes the dialog.
 */
export async function buildPhiDefaultAdminGroupsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiGroupFormLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
  const controllerAddress = createPhiGroupsControllerAddress();
  const membersTableAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembersTable);
  const createFormAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetCreateForm);
  const groupsTableAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetGroupsTable);
  const membershipFormAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembershipForm);
  const createOverlayAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_OVERLAY_IDS.overlayCreate);
  const membershipOverlayAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_OVERLAY_IDS.overlayMembership);
  const stateOptions = { active: labels.states.active, retired: labels.states.retired };
  const levelOptions = {
    [String(PhiGroupMembershipFlags.Member)]: labels.levels.member,
    [String(PhiGroupMembershipFlags.Author)]: labels.levels.author,
    [String(PhiGroupMembershipFlags.Editor)]: labels.levels.editor,
    [String(PhiGroupMembershipFlags.Manager)]: labels.levels.manager,
  };

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_ADMIN_GROUPS_REGION_IDS.regionContent,
  });

  const nodes = createPhiCmsPresetNodes(page);
  /*
   * A dialog per table: its Form in the body, Cancel and the Form's own submit in the footer. Both buttons
   * speak to their receiver directly -- the dialog closes, the Form submits -- so nothing has to relay
   * them. The Form's success goes to the Controller, which reloads and closes the dialog.
   */
  const dialog = (
    workflow: "create" | "membership",
    ids: {
      overlay: (typeof PHI_GROUPS_PAGE_OVERLAY_IDS)[keyof typeof PHI_GROUPS_PAGE_OVERLAY_IDS];
      body: (typeof PHI_GROUPS_PAGE_LAYOUT_IDS)[keyof typeof PHI_GROUPS_PAGE_LAYOUT_IDS];
      footer: (typeof PHI_GROUPS_PAGE_LAYOUT_IDS)[keyof typeof PHI_GROUPS_PAGE_LAYOUT_IDS];
      form: (typeof PHI_GROUPS_PAGE_WIDGET_IDS)[keyof typeof PHI_GROUPS_PAGE_WIDGET_IDS];
      commands: (typeof PHI_GROUPS_PAGE_WIDGET_IDS)[keyof typeof PHI_GROUPS_PAGE_WIDGET_IDS];
    },
    text: { title: string; submit: string },
    formId: (typeof PHI_GROUPS_FORM_IDS)[keyof typeof PHI_GROUPS_FORM_IDS],
    openActionKey: string,
    overlayAddress: ReturnType<typeof createPhiSignalAddress>,
    formAddress: ReturnType<typeof createPhiSignalAddress>,
    sortOrder: number,
  ) => {
    const built = nodes.dialog({
      id: ids.overlay,
      bodyLayoutNodeId: ids.body,
      sortOrder,
      label: `admin-groups-${workflow}-modal`,
      config: {
        title: text.title,
        // Opened afresh each time, so a dialog cancelled half filled starts empty again.
        mountPolicy: "remount",
        closeMode: "immediate",
        openActionKey,
        signalRoutes: {
          listens: [{
            routeKey: `admin-groups-${workflow}-open`,
            capabilityId: "open",
            scope: "page",
            channel: "action",
            action: "activate",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
            receiver: overlayAddress,
          }, {
            routeKey: `admin-groups-${workflow}-close`,
            capabilityId: "close",
            scope: "page",
            channel: "dialog",
            action: "close",
            valueType: "none",
            receiver: overlayAddress,
          }],
        },
      },
      commands: {
        footerLayoutNodeId: ids.footer,
        widgetId: ids.commands,
        label: text.submit,
        config: {
          key: `admin-groups-${workflow}-commands`,
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "close", value: null }], label: labels.actions.cancel, icon: "cancel" },
            { key: "save", emits: [{ capabilityId: "submit", value: null }], label: text.submit, variant: "primary", icon: "save" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: `admin-groups-${workflow}-cancel`,
              capabilityId: "close",
              scope: "page",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: overlayAddress,
            }, {
              routeKey: `admin-groups-${workflow}-commands-submit`,
              capabilityId: "submit",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: formAddress,
            }],
          },
        },
      },
    });
    return {
      ...built,
      widgets: [
        nodes.widget({
          id: ids.form,
          parentLayoutNodeId: ids.body,
          typeKey: "form",
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          label: text.title,
          config: {
            formId,
            formConfig: {},
            execution: { mode: "handler" },
            signalRoutes: {
              emits: [{
                // A write belongs in the lists right away, and the dialog it came from is done.
                routeKey: `admin-groups-${workflow}-success`,
                capabilityId: "submitSuccess",
                scope: "page",
                channel: "submit",
                action: "activate",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
                receiver: controllerAddress,
              }, ...(workflow === "membership" ? [{
                // Opened on a selected group, the Form starts in it.
                routeKey: "admin-groups-membership-values-request",
                capabilityId: "valuesRequest",
                scope: "page" as const,
                channel: "values",
                action: "reload" as const,
                valueType: "none" as const,
                receiver: controllerAddress,
              }] : [])],
              listens: [...(workflow === "membership" ? [{
                routeKey: "admin-groups-membership-values",
                capabilityId: "valuesSet",
                scope: "page" as const,
                channel: "values",
                action: "change" as const,
                valueType: "json" as const,
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
                receiver: formAddress,
              }] : []), {
                routeKey: `admin-groups-${workflow}-submit`,
                capabilityId: "submit",
                scope: "page",
                channel: "submit",
                action: "activate",
                valueType: "none",
                receiver: formAddress,
              }],
            },
          },
        }),
        ...built.widgets,
      ],
    };
  };
  const createDialog = dialog(
    "create",
    {
      overlay: PHI_GROUPS_PAGE_OVERLAY_IDS.overlayCreate,
      body: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutCreate,
      footer: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutCreateFooter,
      form: PHI_GROUPS_PAGE_WIDGET_IDS.widgetCreateForm,
      commands: PHI_GROUPS_PAGE_WIDGET_IDS.widgetCreateCommands,
    },
    { title: labels.create.title, submit: labels.actions.create },
    PHI_GROUPS_FORM_IDS.create,
    "create",
    createOverlayAddress,
    createFormAddress,
    0,
  );
  const membershipDialog = dialog(
    "membership",
    {
      overlay: PHI_GROUPS_PAGE_OVERLAY_IDS.overlayMembership,
      body: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutMembership,
      footer: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutMembershipFooter,
      form: PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembershipForm,
      commands: PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembershipCommands,
    },
    { title: labels.membership.title, submit: labels.membership.submit },
    PHI_GROUPS_FORM_IDS.membership,
    "addMember",
    membershipOverlayAddress,
    membershipFormAddress,
    1,
  );
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta: {
      title: { msgId: 0, source: "Groups", value: labels.page.title },
      description: {
        msgId: 0,
        source: "Site groups, their members, and the Space each group shares.",
        value: labels.page.description,
      },
    },
    /*
     * Who the Controller speaks to on this Page.
     *
     * It used to carry the Widget ids of both Groups Pages and send to all of them, relying on a
     * signal to an unlistened address going nowhere. Each Page names its own receivers now, so the
     * Controller no longer knows that the other Page exists.
     */
    controllerSettings: [{
      type: PHI_GROUPS_CONTROLLER_TYPE,
      instanceKey: PHI_GROUPS_CONTROLLER_INSTANCE_KEY,
      mountScope: "page",
      config: {
        signalRoutes: {
          emits: [
            {
              routeKey: "admin-groups-controller-filters",
              capabilityId: "filtersChange",
              scope: "page",
              channel: "filters",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
              receiver: membersTableAddress,
            },
            {
              routeKey: "admin-groups-controller-reload-groups",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: groupsTableAddress,
            },
            {
              routeKey: "admin-groups-controller-reload-members",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: membersTableAddress,
            },
            {
              routeKey: "admin-groups-controller-members-condition",
              capabilityId: "conditionStateChange",
              scope: "page",
              channel: "condition",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
              receiver: membersTableAddress,
            },
            {
              routeKey: "admin-groups-controller-membership-values",
              capabilityId: "membershipValues",
              scope: "page",
              channel: "values",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
              receiver: membershipFormAddress,
            },
            ...([
              ["create", createOverlayAddress],
              ["membership", membershipOverlayAddress],
            ] as const).map(([workflow, receiver]) => ({
              routeKey: `admin-groups-controller-${workflow}-dialog-close`,
              capabilityId: "dialogClose",
              scope: "page" as const,
              channel: "dialog",
              action: "close" as const,
              valueType: "none" as const,
              receiver,
            })),
          ],
        },
      },
    }],
    overlays: [createDialog.overlay, membershipDialog.overlay],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode, ...createDialog.layouts, ...membershipDialog.layouts],
    contentWidgets: [
      nodes.widget({
        id: PHI_GROUPS_PAGE_WIDGET_IDS.widgetGroupsTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.groups.title,
        config: {
          source: {
            providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "groups",
          },
          presentation: {
            title: labels.groups.title,
            layout: { mode: "auto", overflowX: "auto" },
            controlSize: "small",
            columns: [
              { key: "name", fieldKey: "name", title: labels.columns.name, sizing: { mode: "fill", minWidth: 200 } },
              { key: "key", fieldKey: "key", title: labels.columns.key, renderer: "code", sizing: { mode: "content" } },
              { key: "memberCount", fieldKey: "memberCount", title: labels.columns.members, sizing: { mode: "content" } },
              { key: "spaceUsedBytes", fieldKey: "spaceUsedBytes", title: labels.columns.spaceUsed, sizing: { mode: "content" } },
              { key: "spaceQuotaBytes", fieldKey: "spaceQuotaBytes", title: labels.columns.spaceQuota, sizing: { mode: "content" } },
              // Administration always manages every group, so the switch is always here.
              {
                key: "showMemberCompany",
                fieldKey: "showMemberCompany",
                title: labels.columns.showCompany,
                description: labels.columns.showCompanyHint,
                renderer: "switch",
                editor: { control: "switch" },
                sizing: { mode: "content" },
              },
              {
                key: "threads",
                fieldKey: "threads",
                title: labels.columns.threads,
                description: labels.columns.threadsHint,
                renderer: "switch",
                editor: { control: "switch" },
                sizing: { mode: "content" },
              },
              {
                key: "crossGroupThreads",
                fieldKey: "crossGroupThreads",
                title: labels.columns.crossGroupThreads,
                description: labels.columns.crossGroupThreadsHint,
                renderer: "switch",
                editor: { control: "switch" },
                sizing: { mode: "content" },
              },
              { key: "providerId", fieldKey: "providerId", title: labels.columns.source, renderer: "badge", sizing: { mode: "content" } },
              // A retired group is listed here and nowhere else, so this is where its state is read.
              {
                key: "state",
                fieldKey: "state",
                title: labels.columns.state,
                renderer: "badge",
                valueMap: stateOptions,
                sizing: { mode: "content" },
              },
            ],
            footer: {
              template: labels.groups.footer,
              values: [{ key: "groups", value: { source: "core", fieldKey: "totalRows" } }],
              align: "start",
            },
          },
          features: {
            // One group at a time: the membership table below shows exactly what is selected here.
            // `retired` goes with the selection: the membership table's `+` is off for a retired group.
            rowSelection: { mode: "single", preserveSelectedRowIdentities: true, emitFields: ["retired"] },
            pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
            sorting: { mode: "none" },
            search: { enabled: false },
            tools: { mode: "self-contained", reset: false, reload: true },
            editing: { mode: "cell" },
            actions: {
              rowLayout: "compact",
              toolbar: [{
                key: "create",
                label: labels.actions.create,
                icon: "plus",
                display: "icon",
                mode: "primary",
                execution: "signal",
              }],
              row: [
                {
                  key: "retire",
                  label: labels.actions.retire,
                  icon: "antd:stop",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  disabledWhen: { match: "any", conditions: [
                    { source: "row", valuePath: "local", operator: "falsy", reason: labels.actions.retire },
                    { source: "row", valuePath: "retired", operator: "truthy", reason: labels.actions.retire },
                  ] },
                  confirm: {
                    title: labels.actions.retireConfirmTitle,
                    description: labels.actions.retireConfirmText,
                    okText: labels.actions.retireConfirmOk,
                    cancelText: labels.actions.removeConfirmCancel,
                  },
                },
                {
                  key: "reactivate",
                  label: labels.actions.reactivate,
                  icon: "antd:undo",
                  display: "icon",
                  execution: "provider",
                  disabledWhen: { match: "any", conditions: [
                    { source: "row", valuePath: "local", operator: "falsy", reason: labels.actions.reactivate },
                    { source: "row", valuePath: "retired", operator: "falsy", reason: labels.actions.reactivate },
                  ] },
                  confirm: {
                    title: labels.actions.reactivateConfirmTitle,
                    description: labels.actions.reactivateConfirmText,
                    okText: labels.actions.reactivateConfirmOk,
                    cancelText: labels.actions.removeConfirmCancel,
                  },
                },
              ],
            },
          },
          signalRoutes: {
            emits: [{
              // The `+`: the create dialog opens on it (`openActionKey`).
              routeKey: "admin-groups-create-action",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createOverlayAddress,
            }, {
              routeKey: "admin-groups-selection",
              capabilityId: "selectionChange",
              scope: "page",
              channel: "selection",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableSelection,
              receiver: controllerAddress,
            }, {
              // Asking for the condition state is what mounts the Controller for this Page.
              routeKey: "admin-groups-condition",
              capabilityId: "conditionStateRequest",
              scope: "page",
              channel: "condition",
              action: "reload",
              valueType: "none",
              receiver: controllerAddress,
            }],
            listens: [{
              // A newly created group has to appear without a manual refresh.
              routeKey: "admin-groups-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: groupsTableAddress,
            }],
          },
        },
      }),
      nodes.widget({
        id: PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembersTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        // Its own slot: one slot holds one direct node, so the two tables stack rather than collide.
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 1,
        sortOrder: 1,
        label: labels.members.title,
        config: {
          source: {
            providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "groupMembers",
          },
          presentation: {
            title: labels.members.title,
            description: labels.members.description,
            layout: { mode: "auto", overflowX: "auto" },
            controlSize: "small",
            columns: [
              { key: "displayName", fieldKey: "displayName", title: labels.columns.name, sizing: { mode: "fill", minWidth: 200 } },
              { key: "email", fieldKey: "email", title: labels.columns.email, sizing: { mode: "content" } },
              {
                key: "membershipFlags",
                fieldKey: "membershipFlags",
                title: labels.columns.level,
                renderer: "badge",
                valueMap: levelOptions,
                // Editable in place: the level is the one thing about a membership that belongs to
                // the group rather than to the account. A row a Directory contributes stays read-only,
                // which the provider states through the field's `mutableWhen`.
                editor: { control: "select" },
                sizing: { mode: "content" },
              },
              { key: "sourceProviderId", fieldKey: "sourceProviderId", title: labels.columns.source, renderer: "badge", sizing: { mode: "content" } },
              { key: "createdAt", fieldKey: "createdAt", title: labels.columns.since, renderer: "datetime", sizing: { mode: "content" } },
            ],
            emptyState: { title: labels.members.empty, description: "" },
            footer: {
              template: labels.members.footer,
              values: [{ key: "members", value: { source: "core", fieldKey: "totalRows" } }],
              align: "start",
            },
          },
          features: {
            pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
            sorting: { mode: "none" },
            search: { enabled: false },
            tools: { mode: "self-contained", reset: false, reload: true },
            // The level is edited in the cell it is read in; nothing else about a member is editable.
            editing: { mode: "cell" },
            actions: {
              rowLayout: "compact",
              // The Form names the group itself, so a member can be added before any group is selected;
              // with one selected, it starts there (the Controller answers the Form's `valuesRequest`).
              toolbar: [{
                key: "addMember",
                label: labels.membership.title,
                icon: "plus",
                display: "icon",
                mode: "primary",
                execution: "signal",
                disabledWhen: { match: "any", conditions: [{
                  source: "controller",
                  controllerAddress,
                  valuePath: "selectedGroupRetired",
                  operator: "truthy",
                  reason: labels.membership.retired,
                }] },
              }],
              row: [{
                key: "delete",
                label: labels.actions.remove,
                icon: "antd:delete",
                display: "icon",
                mode: "danger",
                execution: "provider",
                // A provider-owned membership is read here and changed at its source.
                disabledWhen: { match: "any", conditions: [
                  { source: "row", valuePath: "local", operator: "falsy", reason: labels.actions.remove },
                ] },
                confirm: {
                  title: labels.actions.removeConfirmTitle,
                  description: labels.actions.removeConfirmText,
                  okText: labels.actions.removeConfirmOk,
                  cancelText: labels.actions.removeConfirmCancel,
                },
              }],
            },
          },
          signalRoutes: {
            emits: [{
              routeKey: "admin-groups-membership-action",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: membershipOverlayAddress,
            }, {
              routeKey: "admin-groups-members-condition-request",
              capabilityId: "conditionStateRequest",
              scope: "page",
              channel: "condition",
              action: "reload",
              valueType: "none",
              receiver: controllerAddress,
            }],
            listens: [{
              routeKey: "admin-groups-members-condition-state",
              capabilityId: "conditionStateChange",
              scope: "page",
              channel: "condition",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
              receiver: membersTableAddress,
            }, {
              routeKey: "admin-groups-member-filter",
              capabilityId: "filtersChange",
              scope: "page",
              channel: "filters",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
              receiver: membersTableAddress,
            }, {
              // A membership written elsewhere on the page belongs in this list right away.
              routeKey: "admin-groups-member-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: membersTableAddress,
            }],
          },
        },
      }),
      ...createDialog.widgets,
      ...membershipDialog.widgets,
    ],
  };
}
