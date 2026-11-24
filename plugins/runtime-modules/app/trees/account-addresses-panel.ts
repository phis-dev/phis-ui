import { PHI_APP_ADDRESSES_DATA_PROVIDER_KEY, PHI_APP_ADDRESSES_RESOURCE_KEY, PHI_APP_RUNTIME_MODULE_ID } from "../ids";
import { PHI_APP_FORM_IDS } from "../forms";
import type {
  PhiSettingsPageShellOverlay,
  PhiSettingsPageShellPanel,
} from "../../../../components/regions/presets/phi-settings-page-shell-tree";
import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress } from "../../../../types/signals";
import { PHI_DIALOG_WIDTH_SINGLE_COLUMN } from "../../../../helpers/cms-dialog";
import type { getPhiAppAddressesLabels } from "./addresses-label-set";

type Labels = Awaited<ReturnType<typeof getPhiAppAddressesLabels>>;

/**
 * The account's addresses on the Profile page: one panel holding the Table, and the two dialogs it opens.
 *
 * Arranged as the Admin's provider installations are (the Settings shell's overlays): `+` in the Table's
 * toolbar opens the add dialog, the row's pencil the change dialog, whose Form reads the row it was opened
 * on; either Form's success reads the Table again. Removing and the two defaults are the Table's own
 * Provider acts. An address is a row of a list somebody keeps, not a part of the page, so a panel per
 * Form would describe things nobody is looking at.
 */
export function buildPhiAccountAddressesPanel(labels: Labels, presetKey: string): {
  panel: PhiSettingsPageShellPanel;
  overlays: PhiSettingsPageShellOverlay[];
} {
  // The shell derives the instance ids from the node keys; the same derivation gives the addresses here.
  const ids = createPhiPresetCmsInstanceIdMap(
    { domain: "page", ownerModuleId: PHI_APP_RUNTIME_MODULE_ID, presetKey },
    ["widgetAddresses", "overlayAddressCreate", "overlayAddressEdit", "overlayAddressEditForm"],
  );
  const tableAddress = createPhiSignalAddress("cms", ids.widgetAddresses);
  const editFormAddress = createPhiSignalAddress("cms", ids.overlayAddressEditForm);
  const source = { providerKey: PHI_APP_ADDRESSES_DATA_PROVIDER_KEY, resourceKey: PHI_APP_ADDRESSES_RESOURCE_KEY };
  const actionTo = (routeKey: string, receiver: string) => ({
    routeKey,
    capabilityId: "actionActivate",
    scope: "page" as const,
    channel: "action",
    action: "activate" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
    receiver,
  });
  // The Table's reload takes no value, and a listener matches on the value type too.
  const reloadTable = (routeKey: string) => ({
    routeKey,
    capabilityId: "submitSuccess",
    scope: "page" as const,
    channel: "reload",
    action: "activate" as const,
    valueType: "none" as const,
    receiver: tableAddress,
  });

  return {
    panel: {
      nodeKey: "panelAddresses",
      title: labels.panel.title,
      description: labels.panel.description,
      sections: [{
        nodeKey: "widgetAddresses",
        typeKey: "table",
        label: labels.tableLabel,
        config: {
          source,
          presentation: {
            controlSize: "small",
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "name", fieldKey: "name", title: labels.columns.name, sizing: { mode: "content" } },
              { key: "lines", fieldKey: "lines", title: labels.columns.address, sizing: { mode: "fill" } },
              {
                key: "purposes",
                fieldKey: "purposes",
                title: labels.columns.purposes,
                renderer: "tags",
                sizing: { mode: "content" },
                valueMap: labels.purposes,
                tagColorMap: { billing: "default", shipping: "default", defaultBilling: "processing", defaultShipping: "processing" },
              },
            ],
            emptyState: { title: labels.empty.title, description: labels.empty.text },
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reset: false, reload: false },
            actions: {
              rowLayout: "compact",
              toolbar: [{
                key: "create",
                label: labels.actions.add,
                icon: "plus",
                display: "icon",
                mode: "primary",
                execution: "signal",
              }],
              row: [
                { key: "edit", label: labels.actions.edit, icon: "edit", display: "icon", execution: "signal" },
                {
                  key: "makeDefaultBilling",
                  label: labels.actions.defaultBilling,
                  icon: "antd:file-text",
                  display: "icon",
                  execution: "provider",
                },
                {
                  key: "makeDefaultShipping",
                  label: labels.actions.defaultShipping,
                  icon: "antd:shopping",
                  display: "icon",
                  execution: "provider",
                },
                {
                  key: "delete",
                  label: labels.actions.remove,
                  icon: "antd:delete",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  confirm: {
                    title: labels.remove.title,
                    description: labels.remove.text,
                    okText: labels.remove.ok,
                    cancelText: labels.cancel,
                  },
                },
              ],
            },
          },
          signalRoutes: {
            // One announcement, three listeners; each decides by the action key whether it was meant.
            emits: [
              actionTo("app-addresses-action-edit-form", editFormAddress),
              actionTo("app-addresses-action-create-dialog", createPhiSignalAddress("cms", ids.overlayAddressCreate)),
              actionTo("app-addresses-action-edit-dialog", createPhiSignalAddress("cms", ids.overlayAddressEdit)),
            ],
            listens: [{
              routeKey: "app-addresses-reload",
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
    },
    overlays: [
      {
        nodeKey: "overlayAddressCreate",
        title: labels.addTitle,
        openActionKey: "create",
        formId: PHI_APP_FORM_IDS.addressCreate,
        size: { width: PHI_DIALOG_WIDTH_SINGLE_COLUMN },
        label: labels.addTitle,
        submitLabel: labels.save,
        cancelLabel: labels.cancel,
        configOverrides: { signalRoutes: { emits: [reloadTable("app-address-create-success")] } },
      },
      {
        nodeKey: "overlayAddressEdit",
        title: labels.editTitle,
        openActionKey: "edit",
        formId: PHI_APP_FORM_IDS.addressEdit,
        size: { width: PHI_DIALOG_WIDTH_SINGLE_COLUMN },
        label: labels.editTitle,
        submitLabel: labels.save,
        cancelLabel: labels.cancel,
        configOverrides: {
          // The Form reads the row the same action opened the dialog with; both filter on this key.
          source,
          openActionKey: "edit",
          signalRoutes: {
            emits: [reloadTable("app-address-edit-success")],
            listens: [{
              routeKey: "app-address-edit-open",
              capabilityId: "recordOpen",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: editFormAddress,
            }],
          },
        },
      },
    ],
  };
}
