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
  PHI_APP_GROUPS_PAGE_LAYOUT_IDS,
  PHI_APP_GROUPS_PAGE_WIDGET_IDS,
} from "../../../plugins/runtime-modules/groups/addresses";
import { getPhiGroupFormLabels } from "../../../plugins/runtime-modules/groups/labels";
import { canPhiViewerManageSomeGroup } from "../../../plugins/runtime-modules/groups/page-visibility";
import { canPhiViewerAccess, PHI_VIEWER_ACCESS_DEVELOPER_TOOLS } from "../../../types/access";
import { PHI_GROUPS_FORM_IDS } from "../../../plugins/runtime-modules/groups/forms";

const SYNTHETIC_APP_GROUPS_REGION_IDS = {
  regionContent: -452,
} as const;

/**
 * The groups someone is in, and what their level lets them do.
 *
 * A self-report rather than an administration surface: the level is shown because it is the answer to
 * "why can I put files here and not there" -- a Contributor writes into the group's Space, a Member
 * sees it. Selecting a group shows who else is in it, which is what makes assigning work to a person
 * possible later. Managing a group happens in Site administration.
 */
export async function buildPhiDefaultAppGroupsPageTree({
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
  const myGroupsTableAddress = createPhiSignalAddress("cms", PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMyGroupsTable);
  const membersTableAddress = createPhiSignalAddress("cms", PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMembersTable);
  const membershipFormAddress = createPhiSignalAddress("cms", PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMembershipForm);
  const managesSomeGroup = canPhiViewerManageSomeGroup({
    siteWide: canPhiViewerAccess(runtime.viewer, PHI_VIEWER_ACCESS_DEVELOPER_TOOLS),
    groupClaims: runtime.viewer.groupClaims,
  });
  const levelOptions = {
    [String(PhiGroupMembershipFlags.Member)]: labels.levels.member,
    [String(PhiGroupMembershipFlags.Author)]: labels.levels.author,
    [String(PhiGroupMembershipFlags.Editor)]: labels.levels.editor,
    [String(PhiGroupMembershipFlags.Manager)]: labels.levels.manager,
  };

  return {
    page: { ...page, pageType: PhiCmsPageType.Standard, status: PhiCmsStatus.Published },
    pageMeta: {
      title: { msgId: 0, source: "Groups", value: labels.mine.title },
      description: { msgId: 0, source: "The groups you belong to.", value: labels.mine.description },
    },
    overlays: [],
    regions: [{
      id: SYNTHETIC_APP_GROUPS_REGION_IDS.regionContent,
      pageId: page.id,
      areaPresetId: null,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: PHI_APP_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 30,
      config: { maxSize: { width: 1200 }, margin: "0 auto", border: false },
    }],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        id: PHI_APP_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.mine.title,
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
        id: PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMyGroupsTable,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_APP_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.mine.title,
        config: {
          title: labels.mine.title,
          description: labels.mine.description,
          source: {
            providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "myGroups",
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            controlSize: "small",
            columns: [
              { key: "name", fieldKey: "name", title: labels.columns.name, sizing: { mode: "fill", minWidth: 200 } },
              {
                key: "membershipFlags",
                fieldKey: "membershipFlags",
                title: labels.columns.level,
                renderer: "badge",
                valueMap: levelOptions,
                sizing: { mode: "content" },
              },
              { key: "spaceUsedBytes", fieldKey: "spaceUsedBytes", title: labels.columns.spaceUsed, sizing: { mode: "content" } },
              { key: "spaceQuotaBytes", fieldKey: "spaceQuotaBytes", title: labels.columns.spaceQuota, sizing: { mode: "content" } },
              // Present only for someone who manages a group: a switch nobody here may touch is worse
              // than no switch, so the column is left out rather than shown disabled.
              ...(managesSomeGroup ? [{
                key: "showMemberCompany",
                fieldKey: "showMemberCompany",
                title: labels.columns.showCompany,
                description: labels.columns.showCompanyHint,
                renderer: "switch" as const,
                editor: { control: "switch" as const },
                sizing: { mode: "content" as const },
              }] : []),
            ],
            emptyState: { title: labels.mine.empty, description: labels.mine.emptyHint },
          },
          features: {
            rowSelection: { mode: "single", preserveSelectedRowIdentities: true },
            pagination: { enabled: false },
            sorting: { mode: "none" },
            search: { enabled: false },
            ...(managesSomeGroup ? { editing: { mode: "cell" as const } } : {}),
            /*
             * A Manager runs the team and may end it, from the page they run it on. Putting one back is
             * not offered here and could not be: a retired group grants nothing, so it leaves this list
             * the moment it is retired -- and the level that would have allowed the return leaves with
             * it. Reactivation lives in administration, where retired groups are still listed.
             */
            ...(managesSomeGroup ? {
              actions: {
                rowLayout: "compact" as const,
                row: [{
                  key: "retire",
                  label: labels.actions.retire,
                  icon: "antd:stop",
                  display: "icon" as const,
                  mode: "danger" as const,
                  execution: "provider" as const,
                  disabledWhen: { match: "any" as const, conditions: [
                    { source: "row" as const, valuePath: "manages", operator: "falsy" as const,
                      reason: labels.actions.retire },
                    { source: "row" as const, valuePath: "local", operator: "falsy" as const,
                      reason: labels.actions.retire },
                  ] },
                  confirm: {
                    title: labels.actions.retireConfirmTitle,
                    description: labels.actions.retireConfirmText,
                    okText: labels.actions.retireConfirmOk,
                    cancelText: labels.actions.removeConfirmCancel,
                  },
                }],
              },
            } : {}),
          },
          signalRoutes: {
            emits: [{
              routeKey: "app-groups-selection",
              capabilityId: "selectionChange",
              scope: "page",
              channel: "selection",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableSelection,
              receiver: controllerAddress,
            }, {
              routeKey: "app-groups-condition",
              capabilityId: "conditionStateRequest",
              scope: "page",
              channel: "condition",
              action: "reload",
              valueType: "none",
              receiver: controllerAddress,
            }],
            listens: [{
              routeKey: "app-groups-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: myGroupsTableAddress,
            }],
          },
        },
      }),
      buildPhiCmsWidgetNode({
        id: PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMembersTable,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_APP_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "table",
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
            // No address and no source column: a colleague is recognized by name, and where a
            // membership comes from is an administration question.
            columns: [
              { key: "displayName", fieldKey: "displayName", title: labels.columns.name, sizing: { mode: "fill", minWidth: 200 } },
              { key: "companyName", fieldKey: "companyName", title: labels.columns.company, sizing: { mode: "content" } },
              {
                key: "membershipFlags",
                fieldKey: "membershipFlags",
                title: labels.columns.level,
                renderer: "badge",
                valueMap: levelOptions,
                // Editable only where the control plane says this actor administers this group, which
                // it states per row -- a member sees the same table without an editor.
                editor: { control: "select" },
                sizing: { mode: "content" },
              },
            ],
            emptyState: { title: labels.members.empty, description: "" },
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            search: { enabled: false },
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
                disabledWhen: { match: "any", conditions: [
                  { source: "row", valuePath: "manageable", operator: "falsy", reason: labels.actions.remove },
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
              routeKey: "app-groups-member-filter",
              capabilityId: "filtersChange",
              scope: "page",
              channel: "filters",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
              receiver: membersTableAddress,
            }],
          },
        },
      }),
      buildPhiCmsWidgetNode({
        id: PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMembershipForm,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_APP_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 2,
        sortOrder: 2,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.membership.title,
        config: {
          formId: PHI_GROUPS_FORM_IDS.myMembership,
          formConfig: {},
          execution: { mode: "handler" },
          signalRoutes: {
            emits: [{
              routeKey: "app-groups-membership-success",
              capabilityId: "submitSuccess",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: controllerAddress,
            }],
            listens: [{
              routeKey: "app-groups-membership-submit",
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
        id: PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMembershipCommands,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_APP_GROUPS_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "command-toolbar",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 3,
        sortOrder: 3,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.membership.submit,
        config: {
          key: "app-groups-membership-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "save", emits: [{ capabilityId: "command", value: "saveMembership" }], actionKey: "save", label: labels.membership.submit, buttonType: "primary" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: "app-groups-membership-command",
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
