import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_BUILDER_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/builder` as const satisfies PhiRuntimeModuleId;


export const PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS = {
  forms: createPhiSharedRuntimeDataProviderKey("options", "forms"),
  builderPages: createPhiSharedRuntimeDataProviderKey("options", "builder-pages"),
  areaRootRoute: createPhiSharedRuntimeDataProviderKey("options", "builder-area-root-route"),
  builderNavigationSets: createPhiSharedRuntimeDataProviderKey("options", "builder-navigation-sets"),
  runtimeModules: createPhiSharedRuntimeDataProviderKey("options", "runtime-modules"),
  runtimeModulesTable: createPhiSharedRuntimeDataProviderKey("tables", "runtime-modules"),
  /*
   * The four Signal wiring selects cascade: the capabilities offered depend on the endpoint chosen
   * before them, and the receiver capabilities additionally have to match the sender output. The chosen
   * values reach these providers through the wiring session in the Builder workspace store, which the
   * Builder controller keeps in step with the form.
   */
  signalSenders: createPhiSharedRuntimeDataProviderKey("options", "builder-signal-senders"),
  signalSenderCapabilities: createPhiSharedRuntimeDataProviderKey("options", "builder-signal-sender-capabilities"),
  signalReceivers: createPhiSharedRuntimeDataProviderKey("options", "builder-signal-receivers"),
  signalReceiverCapabilities: createPhiSharedRuntimeDataProviderKey("options", "builder-signal-receiver-capabilities"),
  signalRoutesTable: createPhiSharedRuntimeDataProviderKey("tables", "builder-signal-routes"),
  navigationTable: createPhiSharedRuntimeDataProviderKey("tables", "builder-navigation"),
  pageSourceTree: createPhiSharedRuntimeDataProviderKey("trees", "builder-page-source"),
} as const;
