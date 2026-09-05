"use client";

export {
  createPhiStaticControlOptionsProviderClient,
  createPhiControlOptionsProviderClient,
} from "./components/controls/phi-options-provider";
export type {
  PhiResolvedControlOptions,
  PhiControlOptionsProviderContext,
  PhiControlOptionsProviderRegistration,
  PhiStaticControlOptionsProviderRegistration,
} from "./components/controls/phi-options-provider";
export {
  createPhiTableProviderClient,
  PhiTableProviderClient,
} from "./components/widgets/client/shared/phi-table-provider";
export type {
  PhiTableProviderRegistration,
} from "./components/widgets/client/shared/phi-table-provider";
export {
  createPhiTreeProviderClient,
  PhiTreeProviderClient,
  usePhiTreeProvider,
} from "./components/widgets/client/shared/phi-tree-provider";
export type {
  PhiTreeProviderRegistration,
} from "./components/widgets/client/shared/phi-tree-provider";
export {
  usePhiTableBinding,
} from "./components/tables/client/phi-table-binding";
export type { PhiTableBindingInput } from "./components/tables/client/phi-table-binding";
export { usePhiTreeBinding } from "./components/trees/client/phi-tree-binding";
export { PhiTableBindingControl } from "./components/tables/client/phi-table-binding-control";
export type { PhiTableBindingControlProps } from "./components/tables/client/phi-table-binding-control";
export {
  movePhiTableBindingRows,
  movePhiTableBindingTreeRows,
  patchPhiTableBindingRows,
  restorePhiTableBindingRowOrder,
} from "./helpers/table-binding";
export { createPhiStaticTableProviderRegistration } from "./components/widgets/client/shared/phi-static-table-provider";
export type { PhiStaticTableResource } from "./components/widgets/client/shared/phi-static-table-provider";
export {
  createPhiCollectionProviderClient,
  PhiCollectionProviderClient,
  usePhiCollectionProvider,
  usePhiCollectionProviderAction,
} from "./components/widgets/client/shared/phi-collection-provider";
export type {
  PhiCollectionProviderRegistration,
} from "./components/widgets/client/shared/phi-collection-provider";
/*
 * The View a resource gets when its items are cards, which is most of them.
 *
 * Exported beside the provider factory because that is where it is used: a resource names its View when
 * it registers, and an Add-on with rows to show should be able to reach for this one rather than draw a
 * collection of its own.
 */
export {
  PhiCardCollectionViewBinding,
} from "./components/widgets/client/shared/phi-card-collection-view-binding";
export {
  createPhiRuntimeModuleDataProviderClientManifest,
  extendPhiRuntimeModuleDataProviderClientManifest,
  PhiRuntimeModuleDataProviderClientManifestProvider,
} from "./components/runtime/runtime-module-data-provider-client-manifest";
export type {
  PhiRuntimeModuleDataProviderClientManifest,
} from "./components/runtime/runtime-module-data-provider-client-manifest";
export type {
  PhiRuntimeModuleDataProviderClientProps,
  PhiRuntimeModuleDataProviderClientDefinition,
  PhiRuntimeModuleDataProviderDescriptor,
} from "./types/cms-plugins";
