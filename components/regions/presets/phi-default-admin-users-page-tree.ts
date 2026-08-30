import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { getPhiAdminUsersPageLabels } from "./admin-users-label-set";
import { getPhiAdminUsersTableWidgetLabels } from "../../widgets/label-sets/admin-users";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/user-management/ids";
import { createPhiSignalAddress, createPhiSignalSubcontrolAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { createPhiUserManagementControllerAddress } from "../../../plugins/runtime-modules/user-management/controller/address";
import { PHI_USER_MANAGEMENT_FORM_IDS } from "../../../plugins/runtime-modules/user-management/forms";
import {
  PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS,
  PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS,
  PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS,
} from "../../../plugins/runtime-modules/user-management/addresses";

const SYNTHETIC_ADMIN_USERS_REGION_IDS = {
  regionContent: -431,
} as const;

export async function buildPhiDefaultAdminUsersPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labelOptions = {
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  };
  const [labels, widgetLabels] = await Promise.all([
    getPhiAdminUsersPageLabels(labelOptions),
    getPhiAdminUsersTableWidgetLabels(labelOptions),
  ]);
  const controllerAddress = createPhiUserManagementControllerAddress();
  const tableAddress = createPhiSignalAddress("cms", PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetTable);
  const createFormAddress = createPhiSignalAddress("cms", PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetCreateForm);
  const editFormAddress = createPhiSignalAddress("cms", PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetEditForm);
  const historyTableAddress = createPhiSignalAddress("cms", PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetHistoryTable);
  const readOnlyCondition = {
    source: "controller" as const,
    controllerAddress,
    valuePath: "permissions.readOnly",
    operator: "truthy" as const,
    reason: "Developers can inspect users but cannot change them.",
  };
  const selfEnabledCondition = {
    source: "row" as const,
    valuePath: "self",
    operator: "truthy" as const,
    reason: widgetLabels.enabledOptions.selfDisabled,
  };
  const controllerLoadingCondition = {
    source: "controller" as const,
    controllerAddress,
    valuePath: "ready",
    operator: "falsy" as const,
    reason: "User Management is still loading.",
  };
  const overlay = (
    id: typeof PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS[keyof typeof PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS],
    rootLayoutNodeId: typeof PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS[keyof typeof PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS],
    title: string,
    width: Record<string, string | number>,
    key: string,
    formMode?: "create" | "edit",
  ) => ({
    id,
    overlayType: "modal" as const,
    headerLayoutNodeId: null,
    bodyLayoutNodeId: rootLayoutNodeId,
    ...(formMode === "create"
      ? {
          footerPresentation: "actions" as const,
          footerLayoutNodeId: PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutCreateFooter,
        }
      : formMode === "edit"
        ? {
            footerPresentation: "actions" as const,
            footerLayoutNodeId: PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutEditFooter,
          }
        : {
            footerPresentation: "none" as const,
            footerLayoutNodeId: null,
          }),
    status: PhiCmsStatus.Published,
    flags: 0,
    visibilityMask: page.visibilityMask,
    sortOrder: 0,
    label: key,
    config: {
      title,
      width,
      mountPolicy: "on-open",
      closeMode: formMode ? "request" : "immediate",
      signalRoutes: {
        emits: [
          {
            routeKey: `${key}-state`,
            capabilityId: "openChange",
            scope: "page",
            channel: "state",
            action: "change",
            valueType: "boolean",
            receiver: controllerAddress,
          },
          ...(formMode ? [
            {
              routeKey: `${key}-close-request`,
              capabilityId: "closeRequest",
              scope: "page" as const,
              channel: "dialog",
              action: "close" as const,
              valueType: "json" as const,
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
              receiver: controllerAddress,
            },
          ] : []),
        ],
        listens: [
          {
            routeKey: `${key}-open`,
            capabilityId: "open",
            scope: "page",
            channel: "dialog",
            action: "activate",
            valueType: "none",
            receiver: createPhiSignalAddress("cms", id),
          },
          {
            routeKey: `${key}-close`,
            capabilityId: "close",
            scope: "page",
            channel: "dialog",
            action: "close",
            valueType: "none",
            receiver: createPhiSignalAddress("cms", id),
          },
        ],
      },
    },
  });
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: { msgId: 0, source: "Users", value: labels.pageTitle },
      description: { msgId: 0, source: "Manage local site users, roles, access, and login history.", value: labels.pageDescription },
    },
    overlays: [
      overlay(
        PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayCreate,
        PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutCreate,
        widgetLabels.editor.addTitle,
        { compact: "calc(100vw - 32px)", medium: 600, wide: 640 },
        "admin-users-create-modal",
        "create",
      ),
      overlay(
        PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayEdit,
        PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutEdit,
        widgetLabels.editor.editTitle,
        { compact: "calc(100vw - 32px)", medium: 600, wide: 640 },
        "admin-users-edit-modal",
        "edit",
      ),
      overlay(
        PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayHistory,
        PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutHistory,
        widgetLabels.history.title,
        { compact: "calc(100vw - 32px)", medium: "90vw", wide: 980 },
        "admin-users-history-modal",
      ),
    ],
    regions: [
      {
        id: SYNTHETIC_ADMIN_USERS_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          maxSize: { width: 1440 },
          margin: "0 auto",
          border: false,
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        id: PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutContent,
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
          background: PHI_COLOR.bgLayout,
          border: false,
        },
      }),
      ...([
        [PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutCreate, "admin users create modal content"],
        [PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutEdit, "admin users edit modal content"],
        [PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutHistory, "admin users history modal content"],
      ] as const).map(([id, label]) => buildPhiCmsLayoutNode({
        id,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label,
        config: {
          anchor: { horizontal: "left", vertical: "top" },
          gap: PHI_SPACE.base,
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          padding: PHI_SPACE.base,
          background: PHI_COLOR.bgLayout,
          border: false,
        },
      })),
      ...([
        [PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutCreateFooter, "admin users create modal footer"],
        [PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutEditFooter, "admin users edit modal footer"],
      ] as const).map(([id, label]) => buildPhiCmsLayoutNode({
        id,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label,
        config: {},
      })),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        id: PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetTable,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutContent,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.tableLabel,
        config: {
          source: {
            providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "users",
          },
          presentation: {
            controlSize: "small",
            bordered: true,
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "enabled", fieldKey: "enabled", title: widgetLabels.columns.enabled, renderer: "switch", editor: { control: "switch" }, sizing: { mode: "content" }, sticky: "left" },
              { key: "name", fieldKey: "name", title: widgetLabels.columns.name, sortable: true, sizing: { mode: "fill" }, sticky: "left" },
              { key: "email", fieldKey: "email", title: widgetLabels.columns.email, renderer: "email", sortable: true, sizing: { mode: "content" } },
              {
                key: "accountType",
                fieldKey: "accountType",
                title: widgetLabels.columns.account,
                renderer: "badge",
                sizing: { mode: "content" },
                valueMap: {
                  customer: widgetLabels.accountTypes.shop,
                  roles: widgetLabels.accountTypes.roles,
                  auth: widgetLabels.accountTypes.auth,
                },
                tagColorMap: { customer: "processing", roles: "error", auth: "warning" },
              },
              {
                key: "roleTags",
                fieldKey: "roleTags",
                title: widgetLabels.columns.roles,
                renderer: "tags",
                sizing: { mode: "content" },
                tagColorMap: {
                  admin: "error",
                  developer: "error",
                  editor: "processing",
                  author: "processing",
                  publisher: "warning",
                  builder: "success",
                  supporter: "purple",
                  accountant: "default",
                },
              },
              { key: "userFlagTags", fieldKey: "userFlagTags", title: widgetLabels.columns.userFlags, renderer: "tags", sizing: { mode: "content" } },
              { key: "siteFlagTags", fieldKey: "siteFlagTags", title: widgetLabels.columns.siteFlags, renderer: "tags", sizing: { mode: "content" } },
              { key: "lastLoginAt", fieldKey: "lastLoginAt", title: widgetLabels.columns.lastLogin, renderer: "datetime", sizing: { mode: "content" }, sortable: true },
              { key: "createdAt", fieldKey: "createdAt", title: widgetLabels.columns.created, renderer: "datetime", sizing: { mode: "content" }, sortable: true },
            ],
            emptyState: widgetLabels.empty,
            footer: {
              template: widgetLabels.footer,
              values: [
                { key: "filteredUsers", value: { source: "core", fieldKey: "totalRows" } },
                { key: "siteUsers", value: { source: "provider", fieldKey: "siteTotal" } },
              ],
              align: "start",
            },
          },
          features: {
            search: { enabled: true, placeholder: widgetLabels.searchPlaceholder, debounceMs: 250 },
            filters: [
              {
                key: "accountType",
                type: "select",
                label: widgetLabels.columns.account,
                defaultValue: "roles",
                options: [
                  { value: "customer", label: widgetLabels.accountTypes.shop },
                  { value: "roles", label: widgetLabels.accountTypes.roles },
                  { value: "auth", label: widgetLabels.accountTypes.auth },
                ],
              },
              {
                key: "enabled",
                type: "select",
                label: widgetLabels.columns.enabled,
                options: [
                  { value: "enabled", label: widgetLabels.enabledOptions.enabled },
                  { value: "disabled", label: widgetLabels.enabledOptions.disabled },
                ],
              },
            ],
            pagination: { enabled: true, pageSize: 20, pageSizeOptions: [10, 20, 50, 100], showSizeChanger: true },
            sorting: { mode: "single", defaultSorts: [{ key: "createdAt", direction: "descending" }] },
            editing: { mode: "cell", disabledWhen: { match: "any", conditions: [readOnlyCondition, selfEnabledCondition] } },
            tools: { mode: "self-contained", reset: false, reload: true },
            actions: {
              toolbar: [{
                key: "create",
                label: widgetLabels.addLabel,
                icon: "plus",
                display: "icon",
                mode: "primary",
                execution: "signal",
                disabledWhen: readOnlyCondition,
              }],
              row: [
                {
                  key: "history",
                  label: widgetLabels.actions.history,
                  icon: "history",
                  display: "icon",
                  execution: "signal",
                  disabledWhen: controllerLoadingCondition,
                },
                {
                  key: "edit",
                  label: widgetLabels.actions.edit,
                  icon: "edit",
                  display: "icon",
                  execution: "signal",
                  disabledWhen: { match: "any", conditions: [
                    readOnlyCondition,
                    { source: "row", valuePath: "medusaCustomerId", operator: "truthy", reason: widgetLabels.actions.editDisabled },
                  ] },
                },
                {
                  key: "delete",
                  label: widgetLabels.actions.delete,
                  icon: "antd:delete",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  confirm: {
                    title: widgetLabels.confirm.deleteTitle,
                    description: widgetLabels.confirm.deleteShared,
                    alert: {
                      level: "error",
                      title: widgetLabels.confirm.deleteIrreversible,
                    },
                    okText: widgetLabels.confirm.ok,
                    cancelText: widgetLabels.confirm.cancel,
                  },
                },
              ],
            },
          },
          signalRoutes: {
            emits: [
              {
                routeKey: "admin-users-table-action",
                capabilityId: "actionActivate",
                scope: "page",
                channel: "action",
                action: "activate",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
                receiver: controllerAddress,
              },
              {
                routeKey: "admin-users-table-condition-request",
                capabilityId: "conditionStateRequest",
                scope: "page",
                channel: "condition",
                action: "reload",
                valueType: "none",
                receiver: controllerAddress,
              },
            ],
            listens: [
              {
                routeKey: "admin-users-table-reload",
                capabilityId: "reload",
                scope: "page",
                channel: "reload",
                action: "activate",
                valueType: "none",
                receiver: tableAddress,
              },
              {
                routeKey: "admin-users-table-condition-state",
                capabilityId: "conditionStateChange",
                scope: "page",
                channel: "condition",
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
                receiver: tableAddress,
              },
            ],
          },
        },
      }),
      ...([
        [PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetCreateForm, PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutCreate, PHI_USER_MANAGEMENT_FORM_IDS.create, createFormAddress, "create"],
        [PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetEditForm, PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutEdit, PHI_USER_MANAGEMENT_FORM_IDS.edit, editFormAddress, "edit"],
      ] as const).map(([id, parentLayoutNodeId, formId, formAddress, mode]) => buildPhiCmsWidgetNode({
        id,
        siteId: page.siteId,
        parentLayoutNodeId,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: `admin users ${mode} form`,
        config: {
          formId,
          formConfig: mode === "create" ? { initialValues: { roles: [] } } : {},
          execution: { mode: "handler" },
          source: mode === "edit" ? {
            providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "users",
          } : null,
          openActionKey: "edit",
          signalRoutes: {
            emits: [
              {
                routeKey: `admin-users-${mode}-success`,
                capabilityId: "submitSuccess",
                scope: "page",
                channel: "submit",
                action: "activate",
                valueType: "none",
                receiver: controllerAddress,
              },
              {
                routeKey: `admin-users-${mode}-submitting`,
                capabilityId: "submitting",
                scope: "page",
                channel: "submitting",
                action: "change",
                valueType: "boolean",
                receiver: controllerAddress,
              },
              {
                routeKey: `admin-users-${mode}-command`,
                capabilityId: "command",
                scope: "page",
                channel: "command",
                action: "activate",
                valueType: "string",
                receiver: controllerAddress,
              },
              {
                routeKey: `admin-users-${mode}-condition-request`,
                capabilityId: "conditionStateRequest",
                scope: "page",
                channel: "condition",
                action: "reload",
                valueType: "none",
                receiver: controllerAddress,
              },
            ],
            listens: [
              {
                routeKey: `admin-users-${mode}-submit`,
                capabilityId: "submit",
                scope: "page",
                channel: "submit",
                action: "activate",
                valueType: "none",
                receiver: formAddress,
              },
              {
                routeKey: `admin-users-${mode}-reset`,
                capabilityId: "reset",
                scope: "page",
                channel: "reset",
                action: "activate",
                valueType: "none",
                receiver: formAddress,
              },
              ...(mode === "edit" ? [{
                routeKey: "admin-users-edit-record",
                capabilityId: "recordOpen",
                scope: "page" as const,
                channel: "action",
                action: "activate" as const,
                valueType: "json" as const,
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
                receiver: formAddress,
              }] : []),
              {
                routeKey: `admin-users-${mode}-condition-state`,
                capabilityId: "conditionStateChange",
                scope: "page",
                channel: "condition",
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
                receiver: formAddress,
              },
            ],
          },
        },
      })),
      ...([
        [PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetCreateCommands, PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutCreateFooter, "create", widgetLabels.editor.createButton],
        [PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetEditCommands, PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutEditFooter, "edit", widgetLabels.editor.saveButton],
      ] as const).map(([id, parentLayoutNodeId, mode, saveLabel]) => buildPhiCmsWidgetNode({
        id,
        siteId: page.siteId,
        parentLayoutNodeId,
        typeKey: "command-toolbar",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: `admin users ${mode} commands`,
        config: {
          key: `admin-users-${mode}-commands`,
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: widgetLabels.confirm.cancel },
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", label: saveLabel, buttonType: "primary" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: `admin-users-${mode}-command`,
              capabilityId: "command",
              scope: "page",
              channel: "command",
              action: "activate",
              valueType: "string",
              receiver: controllerAddress,
            }],
            listens: [{
              routeKey: `admin-users-${mode}-save-loading`,
              capabilityId: "loading",
              scope: "page",
              channel: "submitting",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalSubcontrolAddress("cms", id, "save"),
            }],
          },
        },
      })),
      buildPhiCmsWidgetNode({
        id: PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetHistoryTable,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS.layoutHistory,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "admin users login history table",
        config: {
          source: {
            providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "userSessions",
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "createdAt", fieldKey: "createdAt", title: widgetLabels.columns.login, renderer: "datetime", sizing: { mode: "content" } },
              { key: "status", fieldKey: "status", title: widgetLabels.columns.status, renderer: "badge", sizing: { mode: "content" } },
              { key: "lastSeenAt", fieldKey: "lastSeenAt", title: widgetLabels.columns.lastSeen, renderer: "datetime", sizing: { mode: "content" } },
              { key: "expiresAt", fieldKey: "expiresAt", title: widgetLabels.columns.expires, renderer: "datetime", sizing: { mode: "content" } },
              { key: "ipAddress", fieldKey: "ipAddress", title: widgetLabels.columns.ip, renderer: "code", sizing: { mode: "content" } },
              { key: "userAgent", fieldKey: "userAgent", title: widgetLabels.columns.userAgent, sizing: { mode: "fill" } },
            ],
            emptyState: { title: widgetLabels.history.empty, description: "" },
          },
          features: {
            pagination: { enabled: false, pageSize: 25, showSizeChanger: false },
            sorting: { mode: "none" },
          },
          signalRoutes: {
            listens: [{
              routeKey: "admin-users-history-filter",
              capabilityId: "filtersChange",
              scope: "page",
              channel: "filters",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
              receiver: historyTableAddress,
            }],
          },
        },
      }),
    ],
  };
}
