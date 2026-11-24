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
 * The account's addresses on the Profile page: one panel holding the address tiles, and the two dialogs
 * they open.
 *
 * A Collection View drawn by Core's address renderer (`PHI_SITE_ADDRESS_ITEM_RENDERER_KEY`, COLLECTIONS.md
 * "The address renderer"), arranged as the Admin's provider installations are (the Settings shell's
 * overlays): `+` in its toolbar announces `create` and opens the add dialog, a tile's pencil announces
 * `edit` with the address id and opens the change dialog, whose Form reads that address through the same
 * Provider (`recordOpen` on `collection-action`, FORMS.md "A record opened from a Collection View"); either
 * Form's success reads the tiles again. Removing (after its confirmation) and the two defaults are the
 * Provider's actions, each answered by the list as it now stands. An address is an item of a list somebody
 * keeps, not a part of the page, so a panel per Form would describe things nobody is looking at.
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
  const viewAddress = createPhiSignalAddress("cms", ids.widgetAddresses);
  const editFormAddress = createPhiSignalAddress("cms", ids.overlayAddressEditForm);
  const source = { providerKey: PHI_APP_ADDRESSES_DATA_PROVIDER_KEY, resourceKey: PHI_APP_ADDRESSES_RESOURCE_KEY };
  const actionTo = (routeKey: string, receiver: string) => ({
    routeKey,
    capabilityId: "actionActivate",
    scope: "page" as const,
    channel: "action",
    action: "activate" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction,
    receiver,
  });
  // The View's reload takes no value, and a listener matches on the value type too.
  const reloadView = (routeKey: string) => ({
    routeKey,
    capabilityId: "submitSuccess",
    scope: "page" as const,
    channel: "reload",
    action: "activate" as const,
    valueType: "none" as const,
    receiver: viewAddress,
  });

  return {
    panel: {
      nodeKey: "panelAddresses",
      title: labels.panel.title,
      description: labels.panel.description,
      sections: [{
        nodeKey: "widgetAddresses",
        typeKey: "collection-view",
        label: labels.tableLabel,
        config: {
          source,
          presentation: {
            mode: "grid",
            controlSize: "small",
            emptyDescription: `${labels.empty.title} ${labels.empty.text}`,
            // The tiles' words, from the Module's Label Set (the renderer's English under them).
            labels: {
              purposes: labels.purposes,
              actions: {
                edit: labels.actions.edit,
                remove: labels.actions.remove,
                defaultBilling: labels.actions.defaultBilling,
                defaultShipping: labels.actions.defaultShipping,
              },
              remove: { title: labels.remove.title, text: labels.remove.text, ok: labels.remove.ok, cancel: labels.cancel },
            },
          },
          features: {
            tools: { mode: "self-contained", reset: false, reload: false },
            actions: {
              toolbar: [{ key: "create", label: labels.actions.add, icon: "plus", display: "icon", mode: "primary" }],
            },
            pagination: { enabled: false },
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
              receiver: viewAddress,
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
        openValueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction,
        formId: PHI_APP_FORM_IDS.addressCreate,
        size: { width: PHI_DIALOG_WIDTH_SINGLE_COLUMN },
        label: labels.addTitle,
        submitLabel: labels.save,
        cancelLabel: labels.cancel,
        configOverrides: { signalRoutes: { emits: [reloadView("app-address-create-success")] } },
      },
      {
        nodeKey: "overlayAddressEdit",
        title: labels.editTitle,
        openActionKey: "edit",
        openValueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction,
        formId: PHI_APP_FORM_IDS.addressEdit,
        size: { width: PHI_DIALOG_WIDTH_SINGLE_COLUMN },
        label: labels.editTitle,
        submitLabel: labels.save,
        cancelLabel: labels.cancel,
        configOverrides: {
          // The Form reads the address the same action opened the dialog with; both filter on this key.
          source,
          openActionKey: "edit",
          signalRoutes: {
            emits: [reloadView("app-address-edit-success")],
            listens: [{
              routeKey: "app-address-edit-open",
              capabilityId: "recordOpen",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction,
              receiver: editFormAddress,
            }],
          },
        },
      },
    ],
  };
}
