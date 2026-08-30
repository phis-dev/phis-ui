import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/groups/ids";
import { PhiGroupMembershipFlags } from "../../../constants/site-groups";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { createPhiGroupsControllerAddress } from "../../../plugins/runtime-modules/groups/controller/address";
import {
  PHI_GROUPS_PAGE_LAYOUT_IDS,
  PHI_GROUPS_PAGE_WIDGET_IDS,
} from "../../../plugins/runtime-modules/groups/addresses";
import { getPhiGroupFormLabels } from "../../../plugins/runtime-modules/groups/labels";
import { PHI_GROUPS_FORM_IDS } from "../../../plugins/runtime-modules/groups/forms";

const SYNTHETIC_ADMIN_GROUPS_REGION_IDS = {
  regionContent: -451,
} as const;

/**
 * Site groups and their members.
 *
 * Two tables, because the two rows carry different authority: a group is Site administration, a
 * membership is what a group's own Manager administers. Selecting a group is what fills the second
 * one -- the Controller translates the selection into a filter, which is the only reason it exists.
 */
export async function buildPhiDefaultAdminGroupsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiGroupFormLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const controllerAddress = createPhiGroupsControllerAddress();
  const membersTableAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembersTable);
  const createFormAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetCreateForm);
  const groupsTableAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetGroupsTable);
  const membershipFormAddress = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembershipForm);
  const stateOptions = { active: labels.states.active, retired: labels.states.retired };
  const levelOptions = {
    [String(PhiGroupMembershipFlags.Member)]: labels.levels.member,
    [String(PhiGroupMembershipFlags.Contributor)]: labels.levels.contributor,
    [String(PhiGroupMembershipFlags.Manager)]: labels.levels.manager,
  };

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: { msgId: 0, source: "Groups", value: labels.page.title },
      description: {
        msgId: 0,
        source: "Site groups, their members, and the Space each group shares.",
        value: labels.page.description,
      },
    },
    overlays: [],
    regions: [{
      id: SYNTHETIC_ADMIN_GROUPS_REGION_IDS.regionContent,
      pageId: page.id,
      areaPresetId: null,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 30,
      config: { maxSize: { width: 1440 }, margin: "0 auto", border: false },
    }],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        id: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.page.title,
        config: {
          anchor: { horizontal: "left", vertical: "top" },
          gap: PHI_SPACE.base,
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          padding: PHI_SPACE.base,
          border: false,
        },
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        id: PHI_GROUPS_PAGE_WIDGET_IDS.widgetGroupsTable,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.groups.title,
        config: {
          title: labels.groups.title,
          description: labels.groups.description,
          source: {
            providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "groups",
          },
          presentation: {
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
          },
          features: {
            // One group at a time: the membership table below shows exactly what is selected here.
            rowSelection: { mode: "single", preserveSelectedRowIdentities: true },
            pagination: { enabled: false },
            sorting: { mode: "none" },
            search: { enabled: false },
            editing: { mode: "cell" },
            actions: {
              rowLayout: "compact",
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
      buildPhiCmsWidgetNode({
        id: PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembersTable,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "table",
        // Its own slot: one slot holds one direct node, so the two tables stack rather than collide.
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 1,
        sortOrder: 1,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.members.title,
        config: {
          title: labels.members.title,
          description: labels.members.description,
          source: {
            providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "groupMembers",
          },
          presentation: {
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
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            search: { enabled: false },
            // The level is edited in the cell it is read in; nothing else about a member is editable.
            editing: { mode: "cell" },
            actions: {
              rowLayout: "compact",
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
            listens: [{
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
      buildPhiCmsWidgetNode({
        id: PHI_GROUPS_PAGE_WIDGET_IDS.widgetCreateForm,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 2,
        sortOrder: 2,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.create.title,
        config: {
          formId: PHI_GROUPS_FORM_IDS.create,
          formConfig: {},
          execution: { mode: "handler" },
          signalRoutes: {
            emits: [{
              // A new group belongs in the list right away, so the Controller reloads it.
              routeKey: "admin-groups-create-success",
              capabilityId: "submitSuccess",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: controllerAddress,
            }],
            listens: [{
              routeKey: "admin-groups-create-submit",
              capabilityId: "submit",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: createFormAddress,
            }],
          },
        },
      }),
      buildPhiCmsWidgetNode({
        id: PHI_GROUPS_PAGE_WIDGET_IDS.widgetCreateCommands,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "command-toolbar",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 3,
        sortOrder: 3,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.actions.create,
        config: {
          key: "admin-groups-create-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", label: labels.actions.create, buttonType: "primary" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: "admin-groups-create-command",
              capabilityId: "command",
              scope: "page",
              channel: "command",
              action: "activate",
              valueType: "string",
              receiver: controllerAddress,
            }],
          },
        },
      }),
      buildPhiCmsWidgetNode({
        id: PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembershipForm,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 4,
        sortOrder: 4,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.membership.title,
        config: {
          formId: PHI_GROUPS_FORM_IDS.membership,
          formConfig: {},
          execution: { mode: "handler" },
          signalRoutes: {
            emits: [{
              routeKey: "admin-groups-membership-success",
              capabilityId: "submitSuccess",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: controllerAddress,
            }],
            listens: [{
              routeKey: "admin-groups-membership-submit",
              capabilityId: "submit",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: membershipFormAddress,
            }],
          },
        },
      }),
      buildPhiCmsWidgetNode({
        id: PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembershipCommands,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "command-toolbar",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 5,
        sortOrder: 5,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.membership.submit,
        config: {
          key: "admin-groups-membership-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "save", emits: [{ capabilityId: "command", value: "saveMembership" }], actionKey: "save", label: labels.membership.submit, buttonType: "primary" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: "admin-groups-membership-command",
              capabilityId: "command",
              scope: "page",
              channel: "command",
              action: "activate",
              valueType: "string",
              receiver: controllerAddress,
            }],
          },
        },
      }),
    ],
  };
}
